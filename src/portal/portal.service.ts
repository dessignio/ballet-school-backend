import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from 'src/parent/parent.entity';
import { Student } from 'src/student/student.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async getProfile(userId: string, userType: 'parent' | 'student') {
    if (userType === 'parent') {
      const parent = await this.parentRepository.findOne({
        where: { id: userId },
        relations: ['students'], // Make sure this relation exists on Parent entity
      });
      if (!parent) {
        throw new NotFoundException('Parent profile not found.');
      }
      return {
        user: {
          id: parent.id,
          username: parent.username,
          email: parent.email,
          firstName: parent.firstName,
          lastName: parent.lastName,
          userType: 'parent',
        },
        students: parent.students || [],
      };
    } else {
      // userType is 'student'
      const student = await this.studentRepository.findOneBy({ id: userId });
      if (!student) {
        throw new NotFoundException('Student profile not found.');
      }
      return {
        user: {
          id: student.id,
          username: student.username,
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          userType: 'student',
        },
        students: [student],
      };
    }
  }
}
