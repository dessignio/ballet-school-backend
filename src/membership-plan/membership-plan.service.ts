import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlanDefinitionEntity } from './membership-plan.entity';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';

@Injectable()
export class MembershipPlanService {
  constructor(
    @InjectRepository(MembershipPlanDefinitionEntity)
    private planRepository: Repository<MembershipPlanDefinitionEntity>,
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
    const newPlan = this.planRepository.create(createPlanDto);
    return this.planRepository.save(newPlan);
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
    return this.planRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const result = await this.planRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Membership plan with ID "${id}" not found to delete.`,
      );
    }
  }
}
