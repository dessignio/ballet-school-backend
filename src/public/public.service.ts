/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Studio } from '../studio/studio.entity';
import { AdminUser } from '../admin-user/admin-user.entity';
import { Role } from '../role/role.entity';
import { StripeService } from '../stripe/stripe.service';
import { RegisterStudioDto } from './dto/register-studio.dto';
import * as bcrypt from 'bcrypt';
import { CreateStripeSubscriptionDto } from 'src/stripe/dto';
import { PermissionKeyValues } from 'src/role/types/permission-key.type';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly stripeService: StripeService,
  ) {}

  async registerStudio(registerStudioDto: RegisterStudioDto) {
    const {
      directorName,
      email,
      password,
      studioName,
      planId,
      billingCycle,
      paymentMethodId,
    } = registerStudioDto;

    const existingUser = await this.adminUserRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const stripeCustomer = await this.stripeService.createCustomer(
      directorName,
      email,
    );

    const subscriptionDto: CreateStripeSubscriptionDto = {
      studentId: stripeCustomer.id,
      priceId: planId,
      paymentMethodId: paymentMethodId,
      billingCycle: billingCycle,
    };

    const studioId = '...';

    const subscription = await this.stripeService.createSubscription(
      subscriptionDto,
      studioId,
    );

    const studio = new Studio();
    studio.name = studioName;
    studio.stripeCustomerId = stripeCustomer.id;
    const newStudio = await this.studioRepository.save(studio);

    const role = new Role();
    role.name = 'Administrator';
    role.permissions = [...PermissionKeyValues];
    role.studio = newStudio;
    const newRole = await this.roleRepository.save(role);

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = new AdminUser();
    adminUser.name = directorName;
    adminUser.email = email;
    adminUser.password = hashedPassword;
    adminUser.role = newRole;
    adminUser.studio = newStudio;
    await this.adminUserRepository.save(adminUser);

    return { message: 'Studio registered successfully' };
  }
}
