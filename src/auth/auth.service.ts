// src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  AdminUserService,
  SafeAdminUser,
} from 'src/admin-user/admin-user.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Studio } from 'src/studio/studio.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private adminUserService: AdminUserService,
    private jwtService: JwtService,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<SafeAdminUser | null> {
    const user = await this.adminUserService.findByEmail(email);
    if (user && (await user.validatePassword(pass))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // =================================================================
  // ESTE ES EL MÉTODO CON LA LÓGICA ACTUALIZADA
  // =================================================================
  async login(user: SafeAdminUser) {
    // 1. Busca el estudio usando el studioId del usuario
    const studio = await this.studioRepository.findOneBy({ id: user.studioId });
    // 2. Obtiene el stripeAccountId del estudio (o null si no existe)
    const stripeAccountId = studio ? studio.stripeAccountId : null;

    console.log('DEBUG: Ejecutando bloque de log');

    this.logger.log(
      `AuthService: Studio found for user ${user.email}: ${studio ? studio.id : 'none'}, Stripe Account ID: ${stripeAccountId}`,
    );

    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      studioId: user.studioId,
      stripeAccountId: stripeAccountId, // Añadido al payload del token JWT
    };

    // 3. Construye el objeto de usuario final para enviar al frontend
    const userForResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      studioId: user.studioId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stripeAccountId: stripeAccountId, // Añadido a la respuesta
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: userForResponse,
    };
  }
}
