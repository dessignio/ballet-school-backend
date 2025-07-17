/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/require-await */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StripeSubscriptionStatus } from 'src/student/student.entity';
import { SettingsService } from 'src/settings/settings.service';
import Stripe from 'stripe';
import {
  CreateStripeSubscriptionDto,
  FinancialMetricsDto,
  RecordManualPaymentDto,
  CreateAuditionPaymentDto,
} from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment, PaymentMethod } from 'src/payment/payment.entity';
import { Invoice } from 'src/invoice/invoice.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { AdminUser } from 'src/admin-user/admin-user.entity';
import { Studio } from 'src/studio/studio.entity';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  public readonly logger = new Logger(StripeService.name);

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MembershipPlanDefinitionEntity)
    private membershipPlanRepository: Repository<MembershipPlanDefinitionEntity>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    private readonly notificationGateway: NotificationGateway,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      // @ts-ignore
      apiVersion: '2024-06-20',
    });
  }

  async createConnectAccount(studio: Studio): Promise<Studio> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: studio.owner.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          studio_id: studio.id,
          studio_name: studio.name,
        },
      });

      studio.stripeAccountId = account.id;
      return this.studioRepository.save(studio);
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe Connect account for studio ${studio.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Stripe Connect account: ${(error as Error).message}`,
      );
    }
  }

  async createAccountLink(stripeAccountId: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: this.configService.get<string>(
          'STRIPE_CONNECT_REFRESH_URL',
        ),
        return_url: this.configService.get<string>('STRIPE_CONNECT_RETURN_URL'),
        type: 'account_onboarding',
      });
      return accountLink.url;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe Connect account link for account ${stripeAccountId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Stripe Connect account link: ${(error as Error).message}`,
      );
    }
  }

  async getStudioWithAdminUser(studioId: string): Promise<Studio | null> {
    return this.studioRepository.findOne({
      where: { id: studioId },
      relations: ['owner'],
    });
  }

  async createAuditionPaymentIntent(
    paymentDto: CreateAuditionPaymentDto,
    studioId: string,
  ): Promise<{ clientSecret: string }> {
    const stripeSettings =
      await this.settingsService.getStripeSettings(studioId);
    const auditionPriceId = stripeSettings.auditionPriceId;
    const auditionProductId = stripeSettings.auditionProductId;

    if (!auditionPriceId || !auditionProductId) {
      throw new InternalServerErrorException(
        'Audition Product/Price IDs are not configured for this studio.',
      );
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      const price = await this.stripe.prices.retrieve(auditionPriceId);
      if (!price || !price.unit_amount) {
        throw new InternalServerErrorException(
          'Audition fee price not found or has no amount.',
        );
      }

      const customer = await this.stripe.customers.create(
        {
          name: paymentDto.name,
          email: paymentDto.email,
          description: 'Audition Prospect',
        },
        { stripeAccount: studio.stripeAccountId },
      );

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: price.unit_amount,
          currency: price.currency,
          customer: customer.id,
          description: 'Audition Fee Payment',
          metadata: {
            productId: auditionProductId,
          },
          automatic_payment_methods: {
            enabled: true,
          },
          transfer_data: {
            destination: studio.stripeAccountId,
          },
        },
        { stripeAccount: studio.stripeAccountId },
      );

      if (!paymentIntent.client_secret) {
        throw new InternalServerErrorException(
          'Failed to retrieve client secret from Payment Intent.',
        );
      }

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create audition payment intent: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Could not process payment setup.',
      );
    }
  }

  async findOrCreateCustomer(
    studentId: string,
    studioId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.Customer> {
    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    if (student.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(
          student.stripeCustomerId,
          { stripeAccount: studio.stripeAccountId },
        );
        if (customer && !customer.deleted) {
          if (paymentMethodId) {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
              customer: customer.id,
            });
            await this.stripe.customers.update(
              customer.id,
              {
                invoice_settings: { default_payment_method: paymentMethodId },
              },
              { stripeAccount: studio.stripeAccountId },
            );
          }
          return customer as Stripe.Customer;
        }
      } catch (error) {
        this.logger.warn(
          `Could not retrieve Stripe customer ${student.stripeCustomerId}, creating a new one. Error: ${(error as Error).message}`,
        );
      }
    }

    const customerParams: Stripe.CustomerCreateParams = {
      email: student.email,
      name: `${student.firstName} ${student.lastName}`,
      phone: student.phone || undefined,
      metadata: { student_app_id: student.id, studio_id: student.studioId },
    };

    if (paymentMethodId) {
      customerParams.payment_method = paymentMethodId;
      customerParams.invoice_settings = {
        default_payment_method: paymentMethodId,
      };
    }

    try {
      const newCustomer = await this.stripe.customers.create(customerParams, {
        stripeAccount: studio.stripeAccountId,
      });
      student.stripeCustomerId = newCustomer.id;
      await this.studentRepository.save(student);
      return newCustomer;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe customer for student ${studentId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to create Stripe customer.',
      );
    }
  }

  async recordManualPayment(dto: RecordManualPaymentDto): Promise<Payment> {
    const student = await this.studentRepository.findOneBy({
      id: dto.studentId,
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const plan = await this.membershipPlanRepository.findOneBy({
      id: dto.membershipPlanId,
    });
    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    const payment = this.paymentRepository.create({
      studentId: dto.studentId,
      membershipPlanId: dto.membershipPlanId,
      amountPaid: dto.amountPaid,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      transactionId: dto.transactionId,
      notes: dto.notes,
      studentName: `${student.firstName} ${student.lastName}`,
      membershipPlanName: plan.name,
      studioId: student.studioId,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (student.studioId) {
      this.notificationGateway.sendNotificationToStudio(student.studioId, {
        title: 'Payment Received',
        message: `Received ${savedPayment.amountPaid.toFixed(2)} from ${savedPayment.studentName} via ${savedPayment.paymentMethod}.`,
        type: 'success',
        link: `/billing`,
      });
    }

    return savedPayment;
  }

  async getFinancialMetrics(studioId: string): Promise<FinancialMetricsDto> {
    return {
      mrr: 0,
      activeSubscribers: 0,
      arpu: 0,
      churnRate: 0,
      ltv: 0,
      planMix: [],
      paymentFailureRate: 0,
    };
  }

  async createStripeProduct(
    name: string,
    description?: string,
  ): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.create({
        name: name,
        description: description || undefined,
        type: 'service',
      });
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe product for ${name}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Stripe product: ${(error as Error).message}`,
      );
    }
  }

  async createStripePrice(
    productId: string,
    unitAmount: number,
    currency: string,
    interval: Stripe.PriceCreateParams.Recurring.Interval,
  ): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(unitAmount * 100),
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe price for product ${productId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Failed to create Stripe price: ${(error as Error).message}`,
      );
    }
  }

  async createSubscription(
    dto: CreateStripeSubscriptionDto,
    studioId: string,
  ): Promise<StripeSubscriptionDetails> {
    const { studentId, priceId, paymentMethodId } = dto;

    const customer = await this.findOrCreateCustomer(
      studentId,
      studioId,
      paymentMethodId,
    );

    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });

    if (!student) {
      throw new InternalServerErrorException(
        `Could not find student ${studentId} after customer creation.`,
      );
    }

    try {
      const studio = await this.studioRepository.findOneBy({ id: studioId });
      if (!studio || !studio.stripeAccountId) {
        throw new BadRequestException(
          'Studio not found or Stripe Connect account not configured for this studio.',
        );
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
        payment_behavior: 'default_incomplete',
        transfer_data: {
          destination: studio.stripeAccountId,
        },
      };

      if (!student.stripeSubscriptionId) {
        const stripeSettings =
          await this.settingsService.getStripeSettings(studioId);
        const enrollmentPriceId = stripeSettings.enrollmentPriceId;
        if (enrollmentPriceId) {
          this.logger.log(
            `Adding matricula fee for new subscriber: student ${student.id}`,
          );
          subscriptionParams.add_invoice_items = [
            {
              price: enrollmentPriceId,
            },
          ];
        } else {
          this.logger.warn(
            'Enrollment Price ID is not configured for this studio. Skipping matricula fee.',
          );
        }
      }

      const subscription = await this.stripe.subscriptions.create(
        subscriptionParams,
        {
          stripeAccount: studio.stripeAccountId,
        },
      );

      student.stripeSubscriptionId = subscription.id;
      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionStatus;

      const plan = await this.membershipPlanRepository.findOne({
        where: { stripePriceId: priceId },
      });

      if (plan) {
        student.membershipPlanId = plan.id;
        student.membershipType = plan.name;
        student.membershipPlanName = plan.name;

        if (
          typeof (subscription as any).current_period_start === 'number' &&
          !isNaN((subscription as any).current_period_start)
        ) {
          student.membershipStartDate = new Date(
            (subscription as any).current_period_start * 1000,
          )
            .toISOString()
            .split('T')[0];
        } else {
          student.membershipStartDate = null;
        }

        if (
          typeof (subscription as any).current_period_end === 'number' &&
          !isNaN((subscription as any).current_period_end)
        ) {
          student.membershipRenewalDate = new Date(
            (subscription as any).current_period_end * 1000,
          )
            .toISOString()
            .split('T')[0];
        } else {
          student.membershipRenewalDate = null;
        }
      } else {
        this.logger.warn(
          `No local membership plan found for Stripe Price ID: ${priceId}. Student internal membership details not fully updated.`,
        );
      }

      await this.studentRepository.save(student);

      this.notificationGateway.broadcastDataUpdate(
        'students',
        {
          updatedId: student.id,
        },
        student.studioId,
      );
      this.notificationGateway.broadcastDataUpdate(
        'subscriptions',
        {
          studentId: student.id,
        },
        student.studioId,
      );

      return this.mapStripeSubscriptionToDetails(subscription);
    } catch (error) {
      this.logger.error(
        `Stripe Subscription Creation Error for student ${studentId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown Stripe subscription creation error.';
      throw new BadRequestException(
        `Failed to create Stripe subscription: ${errorMessage}`,
      );
    }
  }

  private mapStripeSubscriptionToDetails(
    subscription: Stripe.Subscription,
  ): StripeSubscriptionDetails {
    const periodEnd = (subscription as any).current_period_end;
    const periodEndNumber =
      typeof periodEnd === 'number' && !isNaN(periodEnd) ? periodEnd : 0;

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    return {
      id: subscription.id,
      status: subscription.status as StripeSubscriptionDetails['status'],
      current_period_end: periodEndNumber,
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripeCustomerId: customerId,
      items: subscription.items,
      current_period_start: (subscription as any).current_period_start,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    studioId: string,
  ): Promise<StripeSubscriptionDetails> {
    try {
      const student = await this.studentRepository.findOne({
        where: { stripeSubscriptionId: subscriptionId, studioId },
      });
      if (!student) {
        throw new NotFoundException(
          `Student with subscription ${subscriptionId} not found in this studio.`,
        );
      }
      const oldPlanName = student.membershipPlanName || 'an unknown plan';

      const studio = await this.studioRepository.findOneBy({ id: studioId });
      if (!studio || !studio.stripeAccountId) {
        throw new BadRequestException(
          'Studio not found or Stripe Connect account not configured for this studio.',
        );
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        { stripeAccount: studio.stripeAccountId },
      );
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: false,
          proration_behavior: 'create_prorations',
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
        },
        { stripeAccount: studio.stripeAccountId },
      );

      await this.handleSubscriptionUpdated(
        updatedSubscription,
        studio.stripeAccountId,
      );

      const newPlan = await this.membershipPlanRepository.findOne({
        where: { stripePriceId: newPriceId },
      });

      if (student && newPlan) {
        this.notificationGateway.sendNotificationToStudio(student.studioId, {
          title: 'Membership Changed',
          message: `${student.firstName} ${student.lastName}'s plan changed from ${oldPlanName} to ${newPlan.name}.`,
          type: 'info',
          link: `/billing`,
        });
      }

      if (student) {
        this.notificationGateway.broadcastDataUpdate(
          'students',
          {
            updatedId: student.id,
          },
          studioId,
        );
        this.notificationGateway.broadcastDataUpdate(
          'subscriptions',
          {
            studentId: student.id,
          },
          studioId,
        );
      }

      return this.mapStripeSubscriptionToDetails(updatedSubscription);
    } catch (error) {
      this.logger.error(
        `Failed to update Stripe subscription ${subscriptionId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Could not update subscription: ${(error as Error).message}`,
      );
    }
  }

  async handleSubscriptionUpdated(
    updatedSubscription: Stripe.Subscription,
    stripeAccountId: string,
  ) {
    const student = await this.studentRepository.findOne({
      where: { stripeSubscriptionId: updatedSubscription.id },
    });

    if (!student) {
      this.logger.warn(
        `Received subscription update for ${updatedSubscription.id}, but no matching student found.`,
      );
      return;
    }

    const newPriceId = updatedSubscription.items.data[0]?.price.id;
    if (!newPriceId) {
      this.logger.error(
        `Subscription ${updatedSubscription.id} has no price ID. Cannot update student plan.`,
      );
      return;
    }

    const newPlan = await this.membershipPlanRepository.findOne({
      where: { stripePriceId: newPriceId },
    });

    if (newPlan) {
      student.membershipPlanId = newPlan.id;
      student.membershipPlanName = newPlan.name;
      student.membershipType = newPlan.name;
    } else {
      this.logger.warn(
        `No local plan found for Stripe price ${newPriceId}. Plan details for student ${student.id} might be out of sync.`,
      );
    }

    student.stripeSubscriptionStatus =
      updatedSubscription.status as StripeSubscriptionStatus;

    const periodEnd = (updatedSubscription as any).current_period_end;
    if (typeof periodEnd === 'number' && !isNaN(periodEnd)) {
      student.membershipRenewalDate = new Date(periodEnd * 1000)
        .toISOString()
        .split('T')[0];
    } else {
      student.membershipRenewalDate = null;
    }

    await this.studentRepository.save(student);
    this.logger.log(
      `Successfully updated student ${student.id} from subscription ${updatedSubscription.id}.`,
    );
  }

  async updatePaymentMethod(
    studentId: string,
    paymentMethodId: string,
    studioId: string,
  ): Promise<{ success: boolean }> {
    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });
    if (!student || !student.stripeCustomerId) {
      throw new NotFoundException(
        `Stripe customer not found for student ID ${studentId}.`,
      );
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: student.stripeCustomerId,
      });
      await this.stripe.customers.update(
        student.stripeCustomerId,
        {
          invoice_settings: { default_payment_method: paymentMethodId },
        },
        { stripeAccount: studio.stripeAccountId },
      );

      this.notificationGateway.sendNotificationToStudio(student.studioId, {
        title: 'Payment Method Updated',
        message: `${student.firstName} ${student.lastName} has updated their payment method.`,
        type: 'info',
        link: `/billing`,
      });

      this.notificationGateway.broadcastDataUpdate(
        'students',
        {
          updatedId: student.id,
        },
        student.studioId,
      );
      this.notificationGateway.broadcastDataUpdate(
        'subscriptions',
        {
          studentId: student.id,
        },
        student.studioId,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to update payment method for Stripe customer ${student.stripeCustomerId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        `Could not update payment method: ${(error as Error).message}`,
      );
    }
  }

  async cancelSubscription(
    studentId: string,
    subscriptionId: string,
    studioId: string,
  ): Promise<StripeSubscriptionDetails> {
    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }
    if (student.stripeSubscriptionId !== subscriptionId) {
      throw new BadRequestException(
        'Subscription ID does not match student record.',
      );
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      const canceledSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        },
        { stripeAccount: studio.stripeAccountId },
      );

      student.stripeSubscriptionStatus =
        canceledSubscription.status as StripeSubscriptionStatus;
      await this.studentRepository.save(student);

      const periodEnd = (canceledSubscription as any).current_period_end;
      const expiryDateString =
        typeof periodEnd === 'number' && !isNaN(periodEnd)
          ? new Date(periodEnd * 1000).toLocaleDateString()
          : 'the end of the current period';

      this.notificationGateway.sendNotificationToStudio(student.studioId, {
        title: 'Subscription Canceled',
        message: `... It will expire on ${expiryDateString}.`,
        type: 'warning',
        link: `/billing`,
      });

      this.notificationGateway.broadcastDataUpdate(
        'students',
        {
          updatedId: student.id,
        },
        student.studioId,
      );
      this.notificationGateway.broadcastDataUpdate(
        'subscriptions',
        {
          studentId: student.id,
        },
        student.studioId,
      );

      return this.mapStripeSubscriptionToDetails(canceledSubscription);
    } catch (error) {
      this.logger.error(
        `Stripe Subscription Cancellation Error for sub ${subscriptionId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException(
        `Failed to cancel Stripe subscription: ${(error as Error).message}`,
      );
    }
  }

  async getStudentSubscription(
    studentId: string,
    studioId: string,
  ): Promise<StripeSubscriptionDetails | null> {
    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }
    if (!student.stripeSubscriptionId) {
      return null;
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        student.stripeSubscriptionId,
        { stripeAccount: studio.stripeAccountId },
      );

      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionStatus;

      if (subscription.status === 'active') {
        if (
          typeof (subscription as any).current_period_start === 'number' &&
          !isNaN((subscription as any).current_period_start)
        ) {
          student.membershipStartDate = new Date(
            (subscription as any).current_period_start * 1000,
          )
            .toISOString()
            .split('T')[0];
        } else {
          student.membershipStartDate = null;
        }
        if (
          typeof (subscription as any).current_period_end === 'number' &&
          !isNaN((subscription as any).current_period_end)
        ) {
          student.membershipRenewalDate = new Date(
            (subscription as any).current_period_end * 1000,
          )
            .toISOString()
            .split('T')[0];
        } else {
          student.membershipRenewalDate = null;
        }
      }

      await this.studentRepository.save(student);
      return this.mapStripeSubscriptionToDetails(subscription);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        student.stripeSubscriptionId = undefined;
        student.stripeSubscriptionStatus = undefined;
        await this.studentRepository.save(student);
        return null;
      }
      this.logger.error(
        `Failed to retrieve Stripe subscription ${student.stripeSubscriptionId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Could not fetch subscription details.',
      );
    }
  }

  async getPaymentsForStudent(
    studentId: string,
    studioId: string,
  ): Promise<Payment[]> {
    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId,
    });
    if (!student || !student.stripeCustomerId) {
      return this.paymentRepository.find({
        where: { studentId },
        order: { paymentDate: 'DESC' },
      });
    }

    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      this.logger.log(
        `Fetching Stripe payments for customer ID: ${student.stripeCustomerId}`,
      );
      const paymentIntents = await this.stripe.paymentIntents.list(
        {
          customer: student.stripeCustomerId,
          limit: 100,
        },
        { stripeAccount: studio.stripeAccountId },
      );

      const stripePayments: Payment[] = paymentIntents.data.map((pi) => {
        return {
          id: pi.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          membershipPlanId: null,
          membershipPlanName: pi.description || 'Stripe Payment',
          amountPaid: pi.amount_received / 100,
          paymentDate: new Date(pi.created * 1000).toISOString().split('T')[0],
          paymentMethod:
            (pi.payment_method_types?.[0]?.replace(
              '_',
              ' ',
            ) as PaymentMethod) || 'Credit Card',
          transactionId: pi.id,
          invoiceId:
            typeof (pi as any).invoice === 'string'
              ? (pi as any).invoice
              : null,
        } as unknown as Payment;
      });

      return stripePayments;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Stripe payments for customer ${student.stripeCustomerId}: ${(error as Error).stack}`,
      );
      return this.paymentRepository.find({
        where: { studentId },
        order: { paymentDate: 'DESC' },
      });
    }
  }

  async getInvoicesForStudent(
    studentId: string,
    user: Partial<AdminUser>,
  ): Promise<Invoice[]> {
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }

    const student = await this.studentRepository.findOneBy({
      id: studentId,
      studioId: studioId,
    });
    if (!student) {
      throw new NotFoundException('Student not found in this studio.');
    }

    const localInvoices = await this.invoiceRepository.find({
      where: { studentId, studioId: studioId },
      order: { issueDate: 'DESC' },
    });

    if (student.stripeCustomerId) {
      const studio = await this.studioRepository.findOneBy({
        id: studioId,
      });
      if (!studio || !studio.stripeAccountId) {
        this.logger.warn(
          `Studio ${studioId} not found or Stripe Connect account not configured. Cannot fetch Stripe invoices.`,
        );
        return localInvoices;
      }

      try {
        this.logger.log(
          `Fetching Stripe invoices for customer ID: ${student.stripeCustomerId} on connected account ${studio.stripeAccountId}`,
        );
        const stripeInvoicesData = await this.stripe.invoices.list(
          {
            customer: student.stripeCustomerId,
            limit: 100,
          },
          { stripeAccount: studio.stripeAccountId },
        );

        this.logger.log(
          `Found ${stripeInvoicesData.data.length} invoices on Stripe.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch Stripe invoices for customer ${student.stripeCustomerId}: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    return localInvoices;
  }

  async getInvoice(
    invoiceId: string,
    studioId: string,
  ): Promise<Stripe.Invoice> {
    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Studio not found or Stripe Connect account not configured for this studio.',
      );
    }

    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        stripeAccount: studio.stripeAccountId,
      });
      return invoice;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Stripe invoice ${invoiceId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        throw new NotFoundException(`Invoice with ID ${invoiceId} not found.`);
      }
      throw new InternalServerErrorException(
        'Could not fetch invoice details.',
      );
    }
  }

  async getInvoicePdfUrl(
    invoiceId: string,
    studioId: string,
  ): Promise<string | null> {
    try {
      const invoice = await this.getInvoice(invoiceId, studioId);
      return invoice.invoice_pdf ?? null;
    } catch (error) {
      this.logger.error(
        `Could not retrieve PDF URL for invoice ${invoiceId}: ${error.message}`,
      );
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;

    const customerId = invoiceData.customer;
    if (!customerId) {
      this.logger.warn('Invoice payment succeeded event without customer ID.');
      return;
    }

    const student = await this.studentRepository.findOneBy({
      stripeCustomerId: customerId,
    });

    if (!student) {
      this.logger.warn(
        `Received invoice payment for unknown customer ID: ${customerId}`,
      );
      return;
    }

    const paymentIntentId = invoiceData.payment_intent;
    if (!paymentIntentId) {
      this.logger.warn(`Invoice ${invoiceData.id} has no payment_intent.`);
      return;
    }

    const newPayment = this.paymentRepository.create({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      amountPaid: invoiceData.amount_paid / 100,
      paymentDate: new Date(invoiceData.status_transitions.paid_at * 1000)
        .toISOString()
        .split('T')[0],
      paymentMethod: 'Credit Card',
      transactionId: paymentIntentId,
      invoiceId: invoiceData.id,
      studioId: student.studioId,
      membershipPlanName:
        invoiceData.lines.data[0]?.description || 'Monthly Subscription',
    });

    await this.paymentRepository.save(newPayment);
    this.logger.log(
      `Saved successful payment for student ${student.id} from invoice ${invoiceData.id}`,
    );

    this.notificationGateway.sendNotificationToStudio(student.studioId, {
      title: 'Payment Succeeded',
      message: `A payment of $${newPayment.amountPaid.toFixed(2)} was successfully processed for ${student.firstName} ${student.lastName}.`,
      type: 'success',
      link: `/billing/students/${student.id}`,
    });
  }

  public constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is not set in environment variables.',
      );
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Implement logic for failed payments
    this.logger.warn(`Invoice payment failed: ${invoice.id}`);
  }

  async handleAccountUpdated(account: Stripe.Account) {
    // Implement logic for account updates
    this.logger.log(`Stripe Connect account updated: ${account.id}`);
  }
}
