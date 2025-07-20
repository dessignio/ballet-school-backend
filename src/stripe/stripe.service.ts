/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  PlanMixItemDto,
} from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment, PaymentMethod } from 'src/payment/payment.entity';
import { Invoice } from 'src/invoice/invoice.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { AdminUser } from 'src/admin-user/admin-user.entity';
import { Studio } from 'src/studio/studio.entity';
import { InvoiceItem, InvoiceStatus } from 'src/invoice/invoice.types';

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

  async createCustomer(name: string, email: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        name: name,
        email: email,
      });
      return customer;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe customer for ${email}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Could not create Stripe customer.',
      );
    }
  }

  async createStudioSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Subscription> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to create studio subscription for customer ${customerId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Could not create Stripe subscription.',
      );
    }
  }

  async createConnectAccount(studio: Studio): Promise<Studio> {
    if (studio.stripeAccountId) {
      this.logger.log(
        `Studio ${studio.id} already has a Stripe Connect account: ${studio.stripeAccountId}. Attempting to retrieve existing account.`,
      );
      try {
        await this.stripe.accounts.retrieve(studio.stripeAccountId);
        this.logger.log(
          `Existing Stripe account ${studio.stripeAccountId} is valid.`,
        );
        return studio; // Return the studio with its existing Stripe account ID
      } catch (error) {
        this.logger.warn(
          `Existing Stripe account ${studio.stripeAccountId} for studio ${studio.id} is invalid or not found: ${(error as Error).message}. Attempting to create a new one.`,
        );
        // Proceed to create a new account if the existing one is invalid
      }
    }

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
      const savedStudio = await this.studioRepository.save(studio);
      this.logger.log(
        `Stripe Connect account created and saved for studio ${studio.id}. Account ID: ${savedStudio.stripeAccountId}`,
      );
      return savedStudio;
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
    this.logger.log(
      `Attempting to create account link for Stripe Account ID: ${stripeAccountId}`,
    );
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

  // =================================================================
  // AQUÍ ESTÁ LA CORRECCIÓN:
  // Reemplazamos 'getStudioStripeStatus' con la versión correcta 'getStudioStripeStatus'
  // que maneja los errores y devuelve el formato que el frontend espera.
  // =================================================================
  async getStudioStripeStatus(studioId: string) {
    const studio = await this.studioRepository.findOneBy({ id: studioId });

    if (!studio) {
      throw new NotFoundException('Studio not found.');
    }

    if (!studio.stripeAccountId) {
      // If studio exists but no Stripe Account ID, return a specific status
      return {
        status: 'unverified',
        details_submitted: false,
        payouts_enabled: false,
      };
    }

    try {
      const account = await this.stripe.accounts.retrieve(
        studio.stripeAccountId,
      );

      let status: 'unverified' | 'incomplete' | 'active' = 'incomplete';
      if (account.charges_enabled && account.payouts_enabled) {
        status = 'active';
      } else if (!account.details_submitted) {
        status = 'unverified';
      }

      let dashboardUrl: string | undefined = undefined;
      if (status === 'active') {
        try {
          const loginLink = await this.stripe.accounts.createLoginLink(
            studio.stripeAccountId,
          );
          dashboardUrl = loginLink.url;
        } catch (linkError) {
          this.logger.error(
            `Failed to create login link for active Stripe account ${studio.stripeAccountId}: ${(linkError as Error).message}`,
          );
        }
      }

      return {
        status: status,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        url: dashboardUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve Stripe account status for studio ${studioId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Could not retrieve Stripe account status.',
      );
    }
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
      const price = await this.stripe.prices.retrieve(auditionPriceId, {
        stripeAccount: studio.stripeAccountId,
      });
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
    const studio = await this.studioRepository.findOneBy({ id: studioId });
    if (!studio || !studio.stripeAccountId) {
      this.logger.warn(
        `Studio ${studioId} not found or Stripe Connect account not configured. Cannot fetch financial metrics.`,
      );
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

    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
    );
    let mrr = 0;
    let activeSubscribers = 0;
    const planMixCounter: { [key: string]: number } = {};

    const studentsInStudio = await this.studentRepository.find({
      where: { studioId: studioId },
      select: ['stripeCustomerId'],
    });

    const stripeCustomerIds = studentsInStudio
      .map((s) => s.stripeCustomerId)
      .filter((id) => id !== null) as string[];

    if (stripeCustomerIds.length === 0) {
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

    const productList = await this.stripe.products.list(
      { active: true, limit: 100 },
      { stripeAccount: studio.stripeAccountId },
    );
    const productMap = new Map<string, string>();
    for (const product of productList.data) {
      productMap.set(product.id, product.name);
    }

    const processSubscriptions = async (status: Stripe.Subscription.Status) => {
      for (const customerId of stripeCustomerIds) {
        for await (const sub of this.stripe.subscriptions.list(
          {
            customer: customerId,
            status: status,
            limit: 100,
          },
          { stripeAccount: studio.stripeAccountId || undefined },
        )) {
          const subscription = sub as any;
          activeSubscribers++;
          const priceObject = subscription.items.data[0]?.price;

          if (status === 'active' && priceObject?.unit_amount !== null) {
            const price = priceObject.unit_amount / 100;
            let monthlyValue = 0;
            if (priceObject.recurring) {
              switch (priceObject.recurring.interval) {
                case 'month':
                  monthlyValue = price;
                  break;
                case 'year':
                  monthlyValue = price / 12;
                  break;
                case 'week':
                  monthlyValue = price * 4.33;
                  break;
              }
            }
            mrr += monthlyValue;
          }

          const productId = priceObject?.product as string;
          const productName =
            productMap.get(productId) ||
            priceObject?.nickname ||
            'Unknown Plan';
          planMixCounter[productName] = (planMixCounter[productName] || 0) + 1;
        }
      }
    };

    await processSubscriptions('active');
    await processSubscriptions('trialing');

    let canceledInLast30Days = 0;
    const studioCustomerIdsSet = new Set(stripeCustomerIds);

    for await (const event of this.stripe.events.list(
      {
        type: 'customer.subscription.deleted',
        created: { gte: thirtyDaysAgo },
        limit: 100,
      },
      { stripeAccount: studio.stripeAccountId },
    )) {
      const eventCustomer = (event.data.object as any)?.customer;
      if (eventCustomer && studioCustomerIdsSet.has(eventCustomer)) {
        canceledInLast30Days++;
      }
    }

    const churnRate =
      activeSubscribers + canceledInLast30Days > 0
        ? (canceledInLast30Days / (activeSubscribers + canceledInLast30Days)) *
          100
        : 0;

    const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;
    const ltv = churnRate > 0 ? arpu / (churnRate / 100) : 0;

    let succeededInvoices = 0;
    let failedInvoices = 0;
    const nowTimestamp = Math.floor(Date.now() / 1000);

    for (const customerId of stripeCustomerIds) {
      for await (const invoice of this.stripe.invoices.list(
        {
          customer: customerId,
          created: { gte: thirtyDaysAgo },
          limit: 100,
        },
        { stripeAccount: studio.stripeAccountId },
      )) {
        const inv = invoice as any;
        if (
          inv.billing_reason !== 'subscription_cycle' &&
          inv.billing_reason !== 'subscription_create'
        ) {
          continue;
        }
        if (inv.status === 'paid') {
          succeededInvoices++;
        } else if (
          inv.status === 'open' &&
          inv.due_date &&
          inv.due_date < nowTimestamp
        ) {
          failedInvoices++;
        }
      }
    }
    const totalRenewals = succeededInvoices + failedInvoices;
    const paymentFailureRate =
      totalRenewals > 0 ? (failedInvoices / totalRenewals) * 100 : 0;

    const planMix: PlanMixItemDto[] = Object.entries(planMixCounter).map(
      ([name, count]) => ({ name, value: count }),
    );

    return {
      mrr: parseFloat(mrr.toFixed(2)),
      activeSubscribers,
      arpu: parseFloat(arpu.toFixed(2)),
      churnRate: parseFloat(churnRate.toFixed(1)),
      ltv: parseFloat(ltv.toFixed(2)),
      planMix,
      paymentFailureRate: parseFloat(paymentFailureRate.toFixed(1)),
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
    const latestInvoice = subscription.latest_invoice;
    const paymentIntent =
      latestInvoice && typeof latestInvoice === 'object'
        ? (latestInvoice as any).payment_intent
        : null;

    const clientSecret =
      paymentIntent && typeof paymentIntent === 'object'
        ? paymentIntent.client_secret
        : null;

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
      stripeCustomerId: customerId,
      items: subscription.items,
      current_period_start: (subscription as any).current_period_start,
      cancel_at_period_end: subscription.cancel_at_period_end,
      clientSecret: clientSecret,
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

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `Webhook: Invoice payment succeeded for invoice ID: ${invoice.id}`,
    );
    const invoiceAny: any = invoice; // Cast to any to access properties not directly on Stripe.Invoice type

    if (!invoiceAny.customer) {
      this.logger.warn(
        `Webhook: Invoice ${invoiceAny.id} paid but has no customer ID.`,
      );
      return;
    }

    const connectedAccountId = invoiceAny.account; // Get the connected account ID from the invoice
    if (!connectedAccountId) {
      this.logger.warn(
        `Webhook: Invoice ${invoiceAny.id} has no associated connected account. Skipping processing.`,
      );
      return;
    }

    const isAuditionFee =
      invoiceAny.lines.data[0]?.price?.product === 'prod_ScZhhq6OolKX7V';

    if (isAuditionFee) {
      this.logger.log(
        `Audition fee payment succeeded for invoice: ${invoiceAny.id}`,
      );

      const customer = await this.stripe.customers.retrieve(
        invoiceAny.customer as string,
        { stripeAccount: connectedAccountId }, // Retrieve customer on connected account
      );
      if (customer && !customer.deleted) {
        this.logger.log(
          `Audition prospect created: ${customer.name} (${customer.email})`,
        );
      }
    } else {
      const customerId = invoiceAny.customer as string;
      // Retrieve customer on connected account
      const stripeCustomer = await this.stripe.customers.retrieve(customerId, {
        stripeAccount: connectedAccountId,
      });
      const studioIdFromStripe = (stripeCustomer as any)?.metadata?.studio_id;

      if (!studioIdFromStripe) {
        this.logger.warn(
          `Webhook: Stripe customer ${customerId} has no associated studio_id in metadata. Skipping invoice processing.`,
        );
        return;
      }

      const student = await this.studentRepository.findOne({
        where: { stripeCustomerId: customerId, studioId: studioIdFromStripe },
      });
      if (!student) {
        this.logger.warn(
          `Webhook: Student not found for Stripe Customer ID ${invoiceAny.customer} and studio ${studioIdFromStripe} from subscription invoice ${invoiceAny.id}.`,
        );
        return;
      }

      const stripeSubscriptionId =
        typeof invoiceAny.subscription === 'string'
          ? invoiceAny.subscription
          : null;
      let localPlan: MembershipPlanDefinitionEntity | null = null;
      let paymentMethodType: PaymentMethod = 'Stripe Subscription';

      if (stripeSubscriptionId) {
        const stripePriceId = invoiceAny.lines?.data[0]?.price?.id;
        if (stripePriceId) {
          localPlan = await this.membershipPlanRepository.findOne({
            where: { stripePriceId },
          });
          if (!localPlan) {
            this.logger.warn(
              `Webhook: Local plan not found for Stripe Price ID ${stripePriceId} from invoice ${invoiceAny.id}.`,
            );
          }
        }
      } else {
        paymentMethodType = 'Credit Card';
      }

      const invoiceItems: InvoiceItem[] = invoiceAny.lines.data.map((line) => ({
        id: line.id,
        description: line.description || 'N/A',
        quantity: line.quantity || 1,
        unitPrice: line.price?.unit_amount_decimal
          ? parseFloat(line.price.unit_amount_decimal) / 100
          : line.amount / 100 / (line.quantity || 1),
        amount: line.amount / 100,
      }));

      const newLocalInvoice = this.invoiceRepository.create({
        studentId: student.id,
        studioId: student.studioId,
        membershipPlanId: localPlan?.id, // CORRECCIÓN 1: Quitado '|| null'
        membershipPlanName: localPlan?.name,
        invoiceNumber:
          invoiceAny.number ||
          `STRIPE-${(invoiceAny.id || '').substring(0, 12).toUpperCase()}`,
        issueDate: new Date(invoiceAny.created * 1000)
          .toISOString()
          .split('T')[0],
        dueDate: invoiceAny.due_date
          ? new Date(invoiceAny.due_date * 1000).toISOString().split('T')[0]
          : new Date(invoiceAny.created * 1000).toISOString().split('T')[0],
        items: invoiceItems,
        subtotal: invoiceAny.subtotal / 100,
        taxAmount: ((invoiceAny.tax as number) || 0) / 100,
        totalAmount: invoiceAny.total / 100,
        amountPaid: invoiceAny.amount_paid / 100,
        amountDue: invoiceAny.amount_due / 100,
        status: invoiceAny.paid
          ? 'Paid'
          : (invoiceAny.status as InvoiceStatus) || 'Sent',
        notes: `Stripe Invoice ID: ${invoiceAny.id || 'N/A'}`,
        stripeInvoiceId: invoiceAny.id || undefined,
      });
      const savedLocalInvoice =
        await this.invoiceRepository.save(newLocalInvoice);
      this.logger.log(
        `Webhook: Saved local invoice ${savedLocalInvoice.id} for Stripe invoice ${invoiceAny.id}`,
      );

      if (invoiceAny.paid && (invoice as any).payment_intent) {
        const paymentDateTimestamp =
          invoiceAny.status_transitions.paid_at || invoiceAny.created;
        const paymentDate = new Date(paymentDateTimestamp * 1000)
          .toISOString()
          .split('T')[0];

        // CORRECCIÓN 2: Se usa (invoice as any) para asegurar el acceso.
        const paymentIntent = (invoice as any).payment_intent;
        const transactionId =
          typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;

        const newLocalPayment = this.paymentRepository.create({
          studentId: student.id,
          studioId: student.studioId,
          membershipPlanId: localPlan?.id || undefined,
          membershipPlanName: localPlan?.name,
          amountPaid: invoiceAny.amount_paid / 100,
          paymentDate: paymentDate,
          paymentMethod: paymentMethodType,
          transactionId: transactionId,
          invoiceId: savedLocalInvoice.id,
          notes: `Payment for Stripe Invoice: ${invoiceAny.id}`,
        });
        await this.paymentRepository.save(newLocalPayment);
        this.logger.log(
          `Webhook: Saved local payment for local invoice ${savedLocalInvoice.id}`,
        );

        this.notificationGateway.sendNotificationToStudio(student.studioId, {
          title: 'Stripe Payment Succeeded',
          message: `Received ${(invoiceAny.amount_paid / 100).toFixed(2)} from ${student.firstName} ${student.lastName}.`,
          type: 'success',
          link: `/billing`,
        });
      }

      if (stripeSubscriptionId) {
        try {
          const stripeSub = await this.stripe.subscriptions.retrieve(
            stripeSubscriptionId,
            {
              stripeAccount: connectedAccountId, // Retrieve subscription on connected account
            },
          );
          if (
            typeof (stripeSub as any).current_period_start === 'number' &&
            (stripeSub as any).current_period_start
          ) {
            student.membershipStartDate = new Date(
              (stripeSub as any).current_period_start * 1000,
            )
              .toISOString()
              .split('T')[0];
          } else {
            student.membershipStartDate = null;
          }
          if (
            typeof (stripeSub as any).current_period_end === 'number' &&
            (stripeSub as any).current_period_end
          ) {
            student.membershipRenewalDate = new Date(
              (stripeSub as any).current_period_end * 1000,
            )
              .toISOString()
              .split('T')[0];
          } else {
            student.membershipRenewalDate = null;
          }
          student.stripeSubscriptionStatus =
            stripeSub.status as StripeSubscriptionStatus;
          if (localPlan) {
            student.membershipPlanId = localPlan.id;
            student.membershipType = localPlan.name;
            student.membershipPlanName = localPlan.name;
          }
          await this.studentRepository.save(student);
          this.logger.log(
            `Webhook: Updated student ${student.id} membership dates from subscription ${stripeSubscriptionId}.`,
          );

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
        } catch (subError) {
          this.logger.error(
            `Webhook: Error retrieving Stripe subscription ${stripeSubscriptionId} for student update: ${(subError as Error).message}`,
            (subError as Error).stack,
          );
        }
      }
    }
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

  async handleAccountApplicationAuthorized(
    account: Stripe.Account,
  ): Promise<void> {
    this.logger.log(
      `Webhook: Account application authorized for account ID: ${account.id}`,
    );
    const studioIdFromStripe = (account as any)?.metadata?.studio_id;

    if (!studioIdFromStripe) {
      this.logger.warn(
        `Webhook: Stripe account ${account.id} has no associated studio_id in metadata. Skipping processing.`,
      );
      return;
    }

    const studio = await this.studioRepository.findOneBy({
      id: studioIdFromStripe,
    });

    if (studio) {
      // Update studio status or relevant fields based on authorization
      // For example, you might set a flag indicating the account is authorized
      // studio.stripeAccountAuthorized = true;
      await this.studioRepository.save(studio);
      this.logger.log(
        `Studio ${studio.id} Stripe account application authorized.`,
      );
    } else {
      this.logger.warn(
        `Webhook: Received account.application.authorized for unknown studio_id ${studioIdFromStripe}.`,
      );
    }
  }

  async handleAccountExternalAccountCreated(
    account: Stripe.Account,
  ): Promise<void> {
    this.logger.log(
      `Webhook: External account created for account ID: ${account.id}`,
    );
    const studioIdFromStripe = (account as any)?.metadata?.studio_id;

    if (!studioIdFromStripe) {
      this.logger.warn(
        `Webhook: Stripe account ${account.id} has no associated studio_id in metadata. Skipping processing.`,
      );
      return;
    }

    const studio = await this.studioRepository.findOneBy({
      id: studioIdFromStripe,
    });

    if (studio) {
      // Log or update studio with payout details if necessary
      this.logger.log(`Studio ${studio.id} Stripe external account created.`);
    } else {
      this.logger.warn(
        `Webhook: Received account.external_account.created for unknown studio_id ${studioIdFromStripe}.`,
      );
    }
  }
}
