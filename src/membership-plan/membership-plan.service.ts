/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/membership-plan/membership-plan.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlanDefinitionEntity } from './membership-plan.entity';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { StripeService } from 'src/stripe/stripe.service'; // Import StripeService

@Injectable()
export class MembershipPlanService {
  constructor(
    @InjectRepository(MembershipPlanDefinitionEntity)
    private planRepository: Repository<MembershipPlanDefinitionEntity>,
    private readonly stripeService: StripeService, // Inject StripeService
  ) {}

  async create(
    createPlanDto: CreateMembershipPlanDto,
  ): Promise<MembershipPlanDefinitionEntity> {
    const existingPlan = await this.planRepository.findOne({
      where: { name: createPlanDto.name },
    });
    if (existingPlan) {
      throw new ConflictException(
        `Membership plan with name "${createPlanDto.name}" already exists.`,
      );
    }

    // Create Product and Price in Stripe
    let stripePriceId: string | undefined = undefined;
    try {
      const stripeProduct = await this.stripeService.createStripeProduct(
        createPlanDto.name,
        createPlanDto.description,
      );
      const stripePrice = await this.stripeService.createStripePrice(
        stripeProduct.id,
        createPlanDto.monthlyPrice, // Assuming monthlyPrice is in dollars
        'usd', // Default currency
        'month', // Default interval
      );
      stripePriceId = stripePrice.id;
    } catch (stripeError) {
      // Log the error and proceed without a Stripe ID, or rethrow if Stripe ID is mandatory
      console.error(
        `Failed to create Stripe product/price for plan ${createPlanDto.name}: ${stripeError.message}`,
      );
      // Depending on business logic, you might throw new InternalServerErrorException or allow plan creation without Stripe ID
      // For now, let's allow creation but log that Stripe part failed.
      // To make Stripe ID mandatory:
      // throw new InternalServerErrorException(`Failed to create Stripe entities: ${stripeError.message}`);
    }

    const newPlanEntityData: Partial<MembershipPlanDefinitionEntity> = {
      ...createPlanDto,
      stripePriceId: stripePriceId, // Use the generated (or undefined) Stripe Price ID
    };

    const newPlan = this.planRepository.create(newPlanEntityData);

    try {
      return await this.planRepository.save(newPlan);
    } catch (dbError) {
      console.error(
        `Database error saving plan ${createPlanDto.name}: ${dbError.message}`,
      );
      // If Stripe entities were created but DB save fails, you might want to clean up Stripe entities (more complex).
      // For now, just throw the DB error.
      throw new InternalServerErrorException(
        `Could not save membership plan: ${dbError.message}`,
      );
    }
  }

  async findAll(): Promise<MembershipPlanDefinitionEntity[]> {
    return this.planRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<MembershipPlanDefinitionEntity> {
    const plan = await this.planRepository.findOneBy({ id });
    if (!plan) {
      throw new NotFoundException(`Membership plan with ID "${id}" not found.`);
    }
    return plan;
  }

  async update(
    id: string,
    updatePlanDto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlanDefinitionEntity> {
    const plan = await this.planRepository.preload({
      id: id,
      ...updatePlanDto,
    });
    if (!plan) {
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to update.`,
      );
    }
    if (updatePlanDto.name && updatePlanDto.name !== plan.name) {
      const existingPlan = await this.planRepository.findOne({
        where: { name: updatePlanDto.name },
      });
      if (existingPlan && existingPlan.id !== id) {
        throw new ConflictException(
          `Another membership plan with name "${updatePlanDto.name}" already exists.`,
        );
      }
    }
    // Note: Updating price/name here does NOT update Stripe Product/Price automatically.
    // User would need to manually update stripePriceId if they change pricing structure in Stripe.
    return this.planRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    // Consider implications: what if subscriptions are active on this plan's stripePriceId?
    // Archiving might be safer than deleting.
    // Also, deleting from Stripe might be necessary. This is a simplified remove.
    const result = await this.planRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to delete.`,
      );
    }
  }
}
