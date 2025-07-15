/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/class-offering/class-offering.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClassOffering } from './class-offering.entity';
import { CreateClassOfferingDto } from './dto/create-class-offering.dto';
import { UpdateClassOfferingDto } from './dto/update-class-offering.dto';
import { ScheduledClassSlot } from 'src/scheduled-class-slot/scheduled-class-slot.entity';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class ClassOfferingService {
  constructor(
    @InjectRepository(ClassOffering)
    private classOfferingRepository: Repository<ClassOffering>,
    @InjectRepository(ScheduledClassSlot)
    private scheduledClassSlotRepository: Repository<ScheduledClassSlot>,
  ) {}

  async create(
    createClassOfferingDto: CreateClassOfferingDto,
    user: Partial<AdminUser>,
  ): Promise<ClassOffering> {
    const { scheduledClassSlots: newSlotsData, ...restOfDto } =
      createClassOfferingDto;
    
    const studioId = user.studioId;
    if (!studioId) {
        throw new BadRequestException('User is not associated with a studio.');
    }

    const existingOfferingByName = await this.classOfferingRepository.findOne({
      where: { name: restOfDto.name, studioId },
    });
    if (existingOfferingByName) {
      throw new ConflictException(
        `Class offering with name "${restOfDto.name}" already exists in this studio.`,
      );
    }

    const classOffering = this.classOfferingRepository.create({
      ...restOfDto,
      studioId,
      enrolledCount: 0,
      scheduledClassSlots: [],
    });

    if (newSlotsData && newSlotsData.length > 0) {
      const slotEntities = newSlotsData.map((slotDto) => {
        const slotEntity = this.scheduledClassSlotRepository.create(slotDto);
        return slotEntity;
      });
      classOffering.scheduledClassSlots = slotEntities;
    }

    try {
      return await this.classOfferingRepository.save(classOffering);
    } catch (error) {
      console.error('Error creating class offering:', error);
      if (error.code === '23505' && error.detail?.includes('(name)')) {
        throw new ConflictException(
          `Class offering with name "${restOfDto.name}" already exists (database constraint).`,
        );
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while saving the class offering.',
      );
    }
  }

  async findAll(user: Partial<AdminUser>): Promise<ClassOffering[]> {
    return this.classOfferingRepository.find({
      where: { studioId: user.studioId },
      relations: ['scheduledClassSlots'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<ClassOffering> {
    const classOffering = await this.classOfferingRepository.findOne({
      where: { id, studioId: user.studioId },
      relations: ['scheduledClassSlots'],
    });
    if (!classOffering) {
      throw new NotFoundException(`ClassOffering with ID "${id}" not found`);
    }
    return classOffering;
  }

  async update(
    id: string,
    updateClassOfferingDto: UpdateClassOfferingDto,
    user: Partial<AdminUser>,
  ): Promise<ClassOffering> {
    const { scheduledClassSlots: updatedSlotsData, ...restOfUpdateDto } =
      updateClassOfferingDto;

    const classOffering = await this.classOfferingRepository.findOne({
      where: { id, studioId: user.studioId },
      relations: ['scheduledClassSlots'],
    });

    if (!classOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to update.`,
      );
    }

    if (restOfUpdateDto.name && restOfUpdateDto.name !== classOffering.name) {
      const existingOfferingByName = await this.classOfferingRepository.findOne(
        { where: { name: restOfUpdateDto.name, studioId: user.studioId } },
      );
      if (existingOfferingByName && existingOfferingByName.id !== id) {
        throw new ConflictException(
          `Class offering with name "${restOfUpdateDto.name}" already exists.`,
        );
      }
    }

    this.classOfferingRepository.merge(classOffering, restOfUpdateDto);

    if (updatedSlotsData) {
      const slotsToRemove = classOffering.scheduledClassSlots.filter(
        (existingSlot) =>
          !updatedSlotsData.find(
            (updatedSlot) =>
              updatedSlot.id === existingSlot.id && updatedSlot.id,
          ),
      );
      if (slotsToRemove.length > 0) {
        await this.scheduledClassSlotRepository.remove(slotsToRemove);
      }

      const newOrUpdatedSlotEntities = updatedSlotsData.map((slotDto) => {
        const slotEntity = classOffering.scheduledClassSlots.find(
          (s) => s.id === slotDto.id && slotDto.id,
        );
        if (slotEntity) {
          this.scheduledClassSlotRepository.merge(slotEntity, slotDto);
          return slotEntity;
        } else {
          const newSlot = this.scheduledClassSlotRepository.create(slotDto);
          return newSlot;
        }
      });
      classOffering.scheduledClassSlots = newOrUpdatedSlotEntities;
    }

    try {
      return await this.classOfferingRepository.save(classOffering);
    } catch (error) {
      console.error('Error updating class offering:', error);
      if (
        error.code === '23505' &&
        error.detail?.includes('(name)') &&
        restOfUpdateDto.name
      ) {
        throw new ConflictException(
          `Class offering with name "${restOfUpdateDto.name}" already exists (database constraint).`,
        );
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the class offering.',
      );
    }
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const result = await this.classOfferingRepository.delete({ id, studioId: user.studioId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to delete`,
      );
    }
  }

  async incrementEnrolledCount(id: string, studioId: string): Promise<void> {
    await this.classOfferingRepository.increment({ id, studioId }, 'enrolledCount', 1);
  }

  async decrementEnrolledCount(id: string, studioId: string): Promise<void> {
    await this.classOfferingRepository.decrement(
      { id, studioId, enrolledCount: In([1, null]) },
      'enrolledCount',
      1,
    );
  }
}
