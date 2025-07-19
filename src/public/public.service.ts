import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Studio } from '../studio/studio.entity';
import { AdminUser } from '../admin-user/admin-user.entity';
import { Role } from '../role/role.entity';
import { StripeService } from '../stripe/stripe.service';
import { RegisterStudioDto } from './dto/register-studio.dto';
import * as bcrypt from 'bcrypt';
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
    private readonly entityManager: EntityManager, // Inject EntityManager for transactions
  ) {}

  async registerStudio(registerStudioDto: RegisterStudioDto) {
    const { directorName, email, password, studioName, planId, paymentMethodId } = registerStudioDto;

    // Check for existing user outside of the transaction for a quick failure
    const existingUser = await this.adminUserRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 1. Create Stripe Customer
    const stripeCustomer = await this.stripeService.createCustomer(directorName, email);

    // Start a database transaction
    return this.entityManager.transaction(async transactionalEntityManager => {
      try {
        // 2. Create and save the Studio first to get its ID
        let studio = transactionalEntityManager.create(Studio, {
            name: studioName,
            stripeCustomerId: stripeCustomer.id,
            isActive: true,
        });
        studio = await transactionalEntityManager.save(studio);

        // 3. Create the Stripe Subscription
        const subscription = await this.stripeService.createStudioSubscription(
          stripeCustomer.id,
          planId,
          paymentMethodId,
        );

        // 4. Update the studio with subscription details
        studio.stripeSubscriptionId = subscription.id;
        studio.subscriptionStatus = subscription.status;
        studio = await transactionalEntityManager.save(studio);

        // 5. Create the Administrator Role for this specific studio
        const role = transactionalEntityManager.create(Role, {
            name: 'Administrator',
            permissions: [...PermissionKeyValues], // Assign all permissions
            studio: studio,
        });
        const newRole = await transactionalEntityManager.save(role);

        // 6. Create the Admin User (Studio Director)
        const adminUser = transactionalEntityManager.create(AdminUser, {
            username: email, // Use email as username
            email: email,
            password: password, // Pass the plain password, the entity will hash it
            firstName: directorName.split(' ')[0],
            lastName: directorName.split(' ').slice(1).join(' ') || directorName.split(' ')[0],
            roleId: newRole.id,
            studio: studio,
            status: 'active',
        });
        const newAdminUser = await transactionalEntityManager.save(adminUser);

        // 7. Link the owner to the studio
        studio.ownerId = newAdminUser.id;
        await transactionalEntityManager.save(studio);

        return { message: 'Studio registered successfully' };

      } catch (error) {
        // The transaction will be automatically rolled back
        console.error("Error during studio registration transaction:", error);
        if (error.code === '23505') { // Handle unique constraint violation
            throw new ConflictException('A studio with this name or details already exists.');
        }
        throw new InternalServerErrorException('An unexpected error occurred during registration.');
      }
    });
  }
}