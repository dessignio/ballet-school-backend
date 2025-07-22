/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prospect } from './prospect.entity';
import {
  CreateProspectDto,
  UpdateProspectDto,
  ApproveProspectDto,
} from './dto';
import { StudentService, SafeStudent } from 'src/student/student.service';
import { CreateStudentDto } from 'src/student/dto/create-student.dto';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class ProspectService {
  constructor(
    @InjectRepository(Prospect)
    private prospectRepository: Repository<Prospect>,
    private readonly studentService: StudentService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createProspectDto: CreateProspectDto): Promise<Prospect> {
    const existingProspect = await this.prospectRepository.findOne({
      where: { email: createProspectDto.email },
    });

    if (existingProspect) {
      throw new ConflictException(
        'An individual with this email is already a prospect or student.',
      );
    }

    const newProspect = this.prospectRepository.create(createProspectDto);
    const savedProspect = await this.prospectRepository.save(newProspect);

    this.notificationGateway.sendNotificationToAll({
      title: 'New Prospect Registered',
      message: `${savedProspect.firstName} ${savedProspect.lastName} has paid for an audition.`,
      type: 'success',
      link: '/users/prospects',
    });

    return savedProspect;
  }

  async findAll(): Promise<Prospect[]> {
    return this.prospectRepository.find({
      where: { status: 'PENDING_EVALUATION' },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Prospect> {
    const prospect = await this.prospectRepository.findOneBy({ id });
    if (!prospect) {
      throw new NotFoundException(`Prospect with ID "${id}" not found.`);
    }
    return prospect;
  }

  async update(
    id: string,
    updateProspectDto: UpdateProspectDto,
  ): Promise<Prospect> {
    const prospect = await this.prospectRepository.preload({
      id: id,
      ...updateProspectDto,
    });
    if (!prospect) {
      throw new NotFoundException(
        `Prospect with ID "${id}" not found to update.`,
      );
    }
    return this.prospectRepository.save(prospect);
  }

  async remove(id: string): Promise<void> {
    const result = await this.prospectRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Prospect with ID "${id}" not found to delete.`,
      );
    }
  }

  async approve(
    id: string,
    approveDto: ApproveProspectDto,
  ): Promise<SafeStudent> {
    const prospect = await this.findOne(id);

    const studentDto: CreateStudentDto = {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      dateOfBirth: prospect.dateOfBirth,
      program: approveDto.program,
      dancerLevel: approveDto.dancerLevel,
      // Generate a strong, random password. For demo, we use a placeholder.
      // In a real app, this should be more robust and maybe sent to the user.
      password: 'Password123!',
      gender: 'Prefiero no decirlo', // Default gender
      status: 'Activo',
    };

    const newStudent = await this.studentService.create(studentDto);

    // After successful creation, delete the prospect
    await this.prospectRepository.remove(prospect);

    this.notificationGateway.sendNotificationToAll({
      title: 'Prospect Approved!',
      message: `${prospect.firstName} ${prospect.lastName} is now a student.`,
      type: 'success',
      link: `/users/students/edit/${newStudent.id}`,
    });

    return newStudent;
  }
}
