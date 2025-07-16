/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ParentService } from 'src/parent/parent.service';
import { StudentService } from 'src/student/student.service';

// Paso 1: Actualizado el tipo
export type ValidatedUser = {
  id: string;
  username: string;
  userType: 'parent' | 'student';
  studioId: string;
};

@Injectable()
export class PortalAuthService {
  constructor(
    private parentService: ParentService,
    private studentService: StudentService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    studioId: string,
  ): Promise<ValidatedUser | null> {
    // 1. Check if it's a parent
    const parent = await this.parentService.findByUsername(username, studioId);
    if (parent && (await parent.validatePassword(pass))) {
      // Paso 2: Retornar el studioId
      return {
        id: parent.id,
        username: parent.username,
        userType: 'parent',
        studioId,
      };
    }

    // 2. Check if it's a student
    const student = await this.studentService.findByUsername(
      username,
      studioId,
    );
    if (student && student.username && (await student.validatePassword(pass))) {
      // Paso 2: Retornar el studioId
      return {
        id: student.id,
        username: student.username,
        userType: 'student',
        studioId,
      };
    }

    return null;
  }

  async login(user: ValidatedUser) {
    // Paso 3: Incluir studioId en el payload del token
    const payload = {
      username: user.username,
      sub: user.id,
      userType: user.userType,
      studioId: user.studioId,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
