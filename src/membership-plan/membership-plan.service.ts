/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlanDefinitionEntity } from './membership-plan.entity';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { StripeService } from 'src/stripe/stripe.service';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class MembershipPlanService {
  constructor(
    @InjectRepository(MembershipPlanDefinitionEntity)
    private planRepository: Repository<MembershipPlanDefinitionEntity>,
    private readonly stripeService: StripeService,
  ) {}

  async create(
    createPlanDto: CreateMembershipPlanDto,
    user: Partial<AdminUser>,
  ): Promise<MembershipPlanDefinitionEntity> {
    const studioId = user.studioId;
    if (!studioId) {
        throw new BadRequestException('User is not associated with a studio.');
    }

    const existingPlanByName = await this.planRepository.findOne({
      where: { name: createPlanDto.name, studioId },
    });

    if (existingPlanByName) {
      throw new ConflictException(
        `Membership plan with name "${createPlanDto.name}" already exists in this studio.`,
      );
    }

    let stripePriceIdToSave: string | undefined = createPlanDto.stripePriceId;

    if (!stripePriceIdToSave) {
      try {
        const stripeProduct = await this.stripeService.createStripeProduct(
          createPlanDto.name,
          createPlanDto.description,
        );
        const stripePrice = await this.stripeService.createStripePrice(
          stripeProduct.id,
          createPlanDto.monthlyPrice,
          'usd',
          'month',
        );
        stripePriceIdToSave = stripePrice.id;
      } catch (stripeError) {
        console.error(
          `Failed to create Stripe product/price for plan ${createPlanDto.name}:`,
          stripeError,
        );
        throw new InternalServerErrorException(
          `Stripe error: ${(stripeError as Error).message}`,
        );
      }
    }

    const newPlanEntityData = {
      ...createPlanDto,
      studioId,
      stripePriceId: stripePriceIdToSave,
    };

    const newPlan = this.planRepository.create(newPlanEntityData);

    try {
      return await this.planRepository.save(newPlan);
    } catch (dbError) {
      console.error(
        `Database error saving plan ${createPlanDto.name}:`,
        dbError,
      );
      throw new InternalServerErrorException(
        `Could not save membership plan: ${(dbError as Error).message}`,
      );
    }
  }

  async findAll(user: Partial<AdminUser>): Promise<MembershipPlanDefinitionEntity[]> {
    return this.planRepository.find({ where: { studioId: user.studioId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<MembershipPlanDefinitionEntity> {
    const plan = await this.planRepository.findOneBy({ id, studioId: user.studioId });
    if (!plan) {
      throw new NotFoundException(`Membership plan with ID "${id}" not found.`);
    }
    return plan;
  }

  async update(
    id: string,
    updatePlanDto: UpdateMembershipPlanDto,
    user: Partial<AdminUser>,
  ): Promise<MembershipPlanDefinitionEntity> {
    const plan = await this.planRepository.preload({
      id: id,
      ...updatePlanDto,
    });

    if (!plan || plan.studioId !== user.studioId) {
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to update.`,
      );
    }

    if (updatePlanDto.name) {
      const existingPlanByName = await this.planRepository.findOne({
        where: { name: updatePlanDto.name, studioId: user.studioId },
      });
      if (existingPlanByName && existingPlanByName.id !== id) {
        throw new ConflictException(
          `Another membership plan with name "${updatePlanDto.name}" already exists.`,
        );
      }
    }

    return this.planRepository.save(plan);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const result = await this.planRepository.delete({ id, studioId: user.studioId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to delete.`,
      );
    }
  }
}
