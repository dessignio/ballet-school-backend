/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { StripeService } from 'src/stripe/stripe.service'; // Asegúrate de que la ruta sea correcta

@Injectable()
export class MembershipPlanService {
  // BORRADO: Se eliminaron los métodos duplicados que estaban aquí.
  // La clase ahora empieza directamente con el constructor.

  constructor(
    @InjectRepository(MembershipPlanDefinitionEntity)
    private planRepository: Repository<MembershipPlanDefinitionEntity>,
    private readonly stripeService: StripeService,
  ) {}

  async create(
    createPlanDto: CreateMembershipPlanDto,
  ): Promise<MembershipPlanDefinitionEntity> {
    const existingPlanByName = await this.planRepository.findOne({
      where: { name: createPlanDto.name },
    });

    if (existingPlanByName) {
      // CORREGIDO: Se quitó la barra invertida \ antes del backtick `
      throw new ConflictException(
        `Membership plan with name "${createPlanDto.name}" already exists.`,
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
        // CORREGIDO: Lanzamos un error si Stripe falla. Esto soluciona el problema de
        // "must return a value", ya que la función se detiene aquí en caso de error.
        throw new InternalServerErrorException(
          `Stripe error: ${(stripeError as Error).message}`,
        );
      }
    }

    const newPlanEntityData = {
      ...createPlanDto,
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
      // TODO: Considerar lógica para eliminar la entidad de Stripe si la BD falla.
      throw new InternalServerErrorException(
        `Could not save membership plan: ${(dbError as Error).message}`,
      );
    }
  }

  async findAll(): Promise<MembershipPlanDefinitionEntity[]> {
    return this.planRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<MembershipPlanDefinitionEntity> {
    const plan = await this.planRepository.findOneBy({ id });
    if (!plan) {
      // CORREGIDO: Se quitó la barra invertida \
      throw new NotFoundException(`Membership plan with ID "${id}" not found.`);
    }
    return plan;
  }

  async update(
    id: string,
    updatePlanDto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlanDefinitionEntity> {
    // Usamos 'preload' para encontrar el plan y aplicar los cambios del DTO en un solo paso.
    // Si el plan no existe, preload retorna undefined.
    const plan = await this.planRepository.preload({
      id: id,
      ...updatePlanDto,
    });

    if (!plan) {
      // CORREGIDO: Se quitó la barra invertida \
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to update.`,
      );
    }

    if (updatePlanDto.name) {
      const existingPlanByName = await this.planRepository.findOne({
        where: { name: updatePlanDto.name },
      });
      if (existingPlanByName && existingPlanByName.id !== id) {
        // CORREGIDO: Se quitó la barra invertida \
        throw new ConflictException(
          `Another membership plan with name "${updatePlanDto.name}" already exists.`,
        );
      }
    }

    return this.planRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const result = await this.planRepository.delete(id);
    if (result.affected === 0) {
      // CORREGIDO: Se quitó la barra invertida \
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to delete.`,
      );
    }
    // No se retorna nada porque la función es de tipo Promise<void>
  }
}
