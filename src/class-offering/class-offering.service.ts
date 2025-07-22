/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/class-offering/class-offering.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClassOffering } from './class-offering.entity';
import { CreateClassOfferingDto } from './dto/create-class-offering.dto';
import { UpdateClassOfferingDto } from './dto/update-class-offering.dto';
import { ScheduledClassSlot } from 'src/scheduled-class-slot/scheduled-class-slot.entity';

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
  ): Promise<ClassOffering> {
    const { scheduledClassSlots: newSlotsData, ...restOfDto } =
      createClassOfferingDto;

    const existingOfferingByName = await this.classOfferingRepository.findOne({
      where: { name: restOfDto.name },
    });
    if (existingOfferingByName) {
      throw new ConflictException(
        `Class offering with name "${restOfDto.name}" already exists.`,
      );
    }

    const classOffering = this.classOfferingRepository.create({
      ...restOfDto,
      enrolledCount: 0, // Initialize enrolledCount
      // capacity is taken directly from restOfDto
      scheduledClassSlots: [], // Initialize as empty, will be populated below
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

  async findAll(): Promise<ClassOffering[]> {
    return this.classOfferingRepository.find({
      relations: ['scheduledClassSlots'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ClassOffering> {
    const classOffering = await this.classOfferingRepository.findOne({
      where: { id },
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
  ): Promise<ClassOffering> {
    // Destructure scheduledClassSlots and the rest of the DTO
    // Note: The type of `restOfUpdateDto` will be Omit<UpdateClassOfferingDto, 'scheduledClassSlots'>
    // which is Omit<Partial<CreateClassOfferingDto>, 'scheduledClassSlots'>
    const { scheduledClassSlots: updatedSlotsData, ...restOfUpdateDto } =
      updateClassOfferingDto;

    const classOffering = await this.classOfferingRepository.findOne({
      where: { id },
      relations: ['scheduledClassSlots'],
    });

    if (!classOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to update.`,
      );
    }

    // Now 'restOfUpdateDto' should correctly have 'name' as an optional property.
    if (restOfUpdateDto.name && restOfUpdateDto.name !== classOffering.name) {
      const existingOfferingByName = await this.classOfferingRepository.findOne(
        { where: { name: restOfUpdateDto.name } },
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
          ), // Ensure updatedSlot.id exists for comparison
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

  async remove(id: string): Promise<void> {
    const result = await this.classOfferingRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to delete`,
      );
    }
  }

  async incrementEnrolledCount(id: string): Promise<void> {
    await this.classOfferingRepository.increment({ id }, 'enrolledCount', 1);
  }

  async decrementEnrolledCount(id: string): Promise<void> {
    await this.classOfferingRepository.decrement(
      { id, enrolledCount: In([1, null]) },
      'enrolledCount',
      1,
    );
  }
}
