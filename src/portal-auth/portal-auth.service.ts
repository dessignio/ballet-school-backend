/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ParentService } from 'src/parent/parent.service';
import { StudentService } from 'src/student/student.service';

export type ValidatedUser = {
  id: string;
  username: string;
  userType: 'parent' | 'student';
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
  ): Promise<ValidatedUser | null> {
    // 1. Check if it's a parent
    const parent = await this.parentService.findByUsername(username);
    if (parent && (await parent.validatePassword(pass))) {
      return { id: parent.id, username: parent.username, userType: 'parent' };
    }

    // 2. Check if it's a student
    const student = await this.studentService.findByUsername(username);
    if (student && student.username && (await student.validatePassword(pass))) {
      return {
        id: student.id,
        username: student.username, // Ahora TypeScript sabe que es un string
        userType: 'student',
      };
    }

    return null;
  }

  async login(user: ValidatedUser) {
    const payload = {
      username: user.username,
      sub: user.id,
      userType: user.userType,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
