// src/prospect/prospect.service.ts
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
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Importar AdminUser

@Injectable()
export class ProspectService {
  constructor(
    @InjectRepository(Prospect)
    private prospectRepository: Repository<Prospect>,
    private readonly studentService: StudentService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(
    createProspectDto: CreateProspectDto,
    studioId: string,
  ): Promise<Prospect> {
    const existingProspect = await this.prospectRepository.findOne({
      where: { email: createProspectDto.email, studioId },
    });

    if (existingProspect) {
      throw new ConflictException(
        'An individual with this email is already a prospect or student.',
      );
    }

    const newProspect = this.prospectRepository.create({
      ...createProspectDto,
      studioId,
    });
    const savedProspect = await this.prospectRepository.save(newProspect);

    this.notificationGateway.sendNotificationToStudio(studioId, {
      title: 'New Prospect Registered',
      message: `${savedProspect.firstName} ${savedProspect.lastName} has paid for an audition.`,
      type: 'success',
      link: '/users/prospects',
    });

    return savedProspect;
  }

  async findAll(studioId: string): Promise<Prospect[]> {
    return this.prospectRepository.find({
      where: { status: 'PENDING_EVALUATION', studioId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, studioId: string): Promise<Prospect> {
    const prospect = await this.prospectRepository.findOneBy({ id, studioId });
    if (!prospect) {
      throw new NotFoundException(`Prospect with ID "${id}" not found.`);
    }
    return prospect;
  }

  async update(
    id: string,
    updateProspectDto: UpdateProspectDto,
    studioId: string,
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
    if (prospect.studioId !== studioId) {
      throw new NotFoundException(
        `Prospect with ID "${id}" not found in this studio.`,
      );
    }
    return this.prospectRepository.save(prospect);
  }

  async remove(id: string, studioId: string): Promise<void> {
    const result = await this.prospectRepository.delete({ id, studioId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Prospect with ID "${id}" not found to delete.`,
      );
    }
  }

  // CORRECCIÓN 1: El método ahora acepta el objeto 'user'
  async approve(
    id: string,
    approveDto: ApproveProspectDto,
    studioId: string,
    user: Partial<AdminUser>, // <--- Argumento añadido
  ): Promise<SafeStudent> {
    const prospect = await this.findOne(id, studioId);

    const studentDto: CreateStudentDto = {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      dateOfBirth: prospect.dateOfBirth,
      program: approveDto.program,
      dancerLevel: approveDto.dancerLevel,
      password: 'Password123!',
      gender: 'Prefiero no decirlo',
      status: 'Activo',
      studioId: studioId,
    };

    // CORRECCIÓN 2: Pasamos el objeto 'user' a studentService.create
    const newStudent = await this.studentService.create(studentDto, user);

    await this.prospectRepository.remove(prospect);

    this.notificationGateway.sendNotificationToStudio(studioId, {
      title: 'Prospect Approved!',
      message: `${prospect.firstName} ${prospect.lastName} is now a student.`,
      type: 'success',
      link: `/users/students/edit/${newStudent.id}`,
    });

    return newStudent;
  }
}
