/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */

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
import Stripe from 'stripe';
import {
  CreateStripeSubscriptionDto,
  FinancialMetricsDto,
  PlanMixItemDto,
  RecordManualPaymentDto,
  CreateAuditionPaymentDto,
} from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment, PaymentMethod } from 'src/payment/payment.entity';
import { Invoice } from 'src/invoice/invoice.entity';
import { InvoiceItem, InvoiceStatus } from 'src/invoice/invoice.types';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MembershipPlanDefinitionEntity)
    private membershipPlanRepository: Repository<MembershipPlanDefinitionEntity>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private readonly notificationGateway: NotificationGateway,
    private readonly configService: ConfigService,
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

  async createAuditionPaymentIntent(
    paymentDto: CreateAuditionPaymentDto,
  ): Promise<{ clientSecret: string }> {
    const auditionPriceId = this.configService.get<string>('STRIPE_AUDITION_PRICE_ID');
    const auditionProductId = this.configService.get<string>('STRIPE_AUDITION_PRODUCT_ID');

    if (!auditionPriceId || !auditionProductId) {
        throw new InternalServerErrorException('Audition Product/Price IDs are not configured.');
    }

    try {
      const price = await this.stripe.prices.retrieve(auditionPriceId);
      if (!price || !price.unit_amount) {
        throw new InternalServerErrorException(
          'Audition fee price not found or has no amount.',
        );
      }

      const customer = await this.stripe.customers.create({
        name: paymentDto.name,
        email: paymentDto.email,
        description: 'Audition Prospect',
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
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
      });

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
    paymentMethodId?: string,
  ): Promise<Stripe.Customer> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }

    if (student.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(
          student.stripeCustomerId,
        );
        if (customer && !customer.deleted) {
          if (paymentMethodId) {
            await this.stripe.paymentMethods.attach(paymentMethodId, {
              customer: customer.id,
            });
            await this.stripe.customers.update(customer.id, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
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
      metadata: { student_app_id: student.id },
    };

    if (paymentMethodId) {
      customerParams.payment_method = paymentMethodId;
      customerParams.invoice_settings = {
        default_payment_method: paymentMethodId,
      };
    }

    try {
      const newCustomer = await this.stripe.customers.create(customerParams);
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
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.notificationGateway.sendNotificationToAll({
      title: 'Payment Received',
      message: `Received $${savedPayment.amountPaid.toFixed(2)} from ${savedPayment.studentName} via ${savedPayment.paymentMethod}.`,
      type: 'success',
      link: `/billing`,
    });

    return savedPayment;
  }

  async getFinancialMetrics(): Promise<FinancialMetricsDto> {
    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
    );
    let mrr = 0;
    let activeSubscribers = 0;
    const planMixCounter: { [key: string]: number } = {};

    const productList = await this.stripe.products.list({
      active: true,
      limit: 100,
    });
    const productMap = new Map<string, string>();
    for (const product of productList.data) {
      productMap.set(product.id, product.name);
    }

    const processSubscriptions = async (status: Stripe.Subscription.Status) => {
      for await (const sub of this.stripe.subscriptions.list({
        status: status,
        limit: 100,
      })) {
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
          productMap.get(productId) || priceObject?.nickname || 'Unknown Plan';
        planMixCounter[productName] = (planMixCounter[productName] || 0) + 1;
      }
    };

    await processSubscriptions('active');
    await processSubscriptions('trialing');

    let canceledInLast30Days = 0;
    for await (const event of this.stripe.events.list({
      type: 'customer.subscription.deleted',
      created: { gte: thirtyDaysAgo },
      limit: 100,
    })) {
      canceledInLast30Days++;
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

    for await (const invoice of this.stripe.invoices.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    })) {
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
  ): Promise<StripeSubscriptionDetails> {
    const { studentId, priceId, paymentMethodId } = dto;

    const customer = await this.findOrCreateCustomer(
      studentId,
      paymentMethodId,
    );

    const student = await this.studentRepository.findOneBy({ id: studentId });

    if (!student) {
      throw new InternalServerErrorException(
        `Could not find student ${studentId} after customer creation.`,
      );
    }

    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
        payment_behavior: 'default_incomplete',
      };

      if (!student.stripeSubscriptionId) {
        const enrollmentPriceId = this.configService.get<string>('STRIPE_ENROLLMENT_PRICE_ID');
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
            this.logger.warn('STRIPE_ENROLLMENT_PRICE_ID is not configured. Skipping matricula fee.');
        }
      }

      const subscription =
        await this.stripe.subscriptions.create(subscriptionParams);

      student.stripeSubscriptionId = subscription.id;
      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];

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
          this.logger.warn(
            `Stripe subscription ${subscription.id} created, but current_period_start is invalid: ${(subscription as any).current_period_start}. Setting student membershipStartDate to null.`,
          );
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
          this.logger.warn(
            `Stripe subscription ${subscription.id} created, but current_period_end is invalid: ${(subscription as any).current_period_end}. Setting student membershipRenewalDate to null.`,
          );
          student.membershipRenewalDate = null;
        }
      } else {
        this.logger.warn(
          `No local membership plan found for Stripe Price ID: ${priceId}. Student internal membership details not fully updated.`,
        );
        student.membershipStartDate = null;
        student.membershipRenewalDate = null;
      }

      await this.studentRepository.save(student);

      this.notificationGateway.broadcastDataUpdate('students', {
        updatedId: student.id,
      });
      this.notificationGateway.broadcastDataUpdate('subscriptions', {
        studentId: student.id,
      });

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

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<StripeSubscriptionDetails> {
    try {
      const student = await this.studentRepository.findOne({
        where: { stripeSubscriptionId: subscriptionId },
      });
      const oldPlanName = student?.membershipPlanName || 'an unknown plan';

      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
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
      );

      await this.handleSubscriptionUpdated(updatedSubscription);

      const newPlan = await this.membershipPlanRepository.findOne({
        where: { stripePriceId: newPriceId },
      });

      if (student && newPlan) {
        this.notificationGateway.sendNotificationToAll({
          title: 'Membership Changed',
          message: `${student.firstName} ${student.lastName}'s plan changed from ${oldPlanName} to ${newPlan.name}.`,
          type: 'info',
          link: `/billing`,
        });
      }

      if (student) {
        this.notificationGateway.broadcastDataUpdate('students', {
          updatedId: student.id,
        });
        this.notificationGateway.broadcastDataUpdate('subscriptions', {
          studentId: student.id,
        });
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

  async updatePaymentMethod(
    studentId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean }> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      throw new NotFoundException(
        `Stripe customer not found for student ID ${studentId}.`,
      );
    }
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: student.stripeCustomerId,
      });
      await this.stripe.customers.update(student.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      this.notificationGateway.sendNotificationToAll({
        title: 'Payment Method Updated',
        message: `${student.firstName} ${student.lastName} has updated their payment method.`,
        type: 'info',
        link: `/billing`,
      });

      this.notificationGateway.broadcastDataUpdate('students', {
        updatedId: student.id,
      });
      this.notificationGateway.broadcastDataUpdate('subscriptions', {
        studentId: student.id,
      });

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
  ): Promise<StripeSubscriptionDetails> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }
    if (student.stripeSubscriptionId !== subscriptionId) {
      throw new BadRequestException(
        'Subscription ID does not match student record.',
      );
    }

    try {
      const canceledSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      student.stripeSubscriptionStatus =
        canceledSubscription.status as StripeSubscriptionDetails['status'];
      await this.studentRepository.save(student);

      this.notificationGateway.sendNotificationToAll({
        title: 'Subscription Canceled',
        message: `... It will expire on ${new Date((canceledSubscription as any).current_period_end * 1000).toLocaleDateString()}.`,
        type: 'warning',
        link: `/billing`,
      });

      this.notificationGateway.broadcastDataUpdate('students', {
        updatedId: student.id,
      });
      this.notificationGateway.broadcastDataUpdate('subscriptions', {
        studentId: student.id,
      });

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
  ): Promise<StripeSubscriptionDetails | null> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }
    if (!student.stripeSubscriptionId) {
      return null;
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        student.stripeSubscriptionId,
      );

      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];

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
          this.logger.warn(
            `Retrieved Stripe subscription ${subscription.id}, but current_period_start is invalid: ${(subscription as any).current_period_start}. Student membershipStartDate might be stale.`,
          );
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
          this.logger.warn(
            `Retrieved Stripe subscription ${subscription.id}, but current_period_end is invalid: ${(subscription as any).current_period_end}. Student membershipRenewalDate might be stale.`,
          );
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

  async getPaymentsForStudent(studentId: string): Promise<Payment[]> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      return this.paymentRepository.find({
        where: { studentId },
        order: { paymentDate: 'DESC' },
      });
    }

    try {
      this.logger.log(
        `Fetching Stripe payments for customer ID: ${student.stripeCustomerId}`,
      );
      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: student.stripeCustomerId,
        limit: 100,
      });

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
        `Failed to fetch Stripe payments for customer ${student.stripeCustomerId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return this.paymentRepository.find({
        where: { studentId },
        order: { paymentDate: 'DESC' },
      });
    }
  }

  async getInvoicesForStudent(studentId: string): Promise<Invoice[]> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      return this.invoiceRepository.find({
        where: { studentId },
        order: { issueDate: 'DESC' },
      });
    }

    try {
      this.logger.log(
        `Fetching Stripe invoices for customer ID: ${student.stripeCustomerId}`,
      );
      const stripeInvoicesData = await this.stripe.invoices.list({
        customer: student.stripeCustomerId,
        limit: 100,
      });

      const stripeInvoices: Invoice[] = stripeInvoicesData.data.map((inv) => {
        return {
          id: inv.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          invoiceNumber: inv.number || inv.id,
          issueDate: new Date(inv.created * 1000).toISOString().split('T')[0],
          dueDate: inv.due_date
            ? new Date(inv.due_date * 1000).toISOString().split('T')[0]
            : 'N/A',
          items: inv.lines.data.map((line) => ({
            id: line.id,
            description: line.description || 'N/A',
            quantity: line.quantity || 1,
            unitPrice: (line as any).price?.unit_amount_decimal
              ? parseFloat((line as any).price.unit_amount_decimal) / 100
              : line.amount / 100 / (line.quantity || 1),
            amount: line.amount / 100,
          })) as InvoiceItem[],
          subtotal: inv.subtotal / 100,
          taxAmount: ((inv as any).tax || 0) / 100,
          totalAmount: inv.total / 100,
          amountPaid: inv.amount_paid / 100,
          amountDue: inv.amount_due / 100,
          status: (inv.status as InvoiceStatus) || 'Draft',
          stripeInvoiceId: inv.id,
        } as unknown as Invoice;
      });

      return stripeInvoices;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Stripe invoices for customer ${student.stripeCustomerId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return this.invoiceRepository.find({
        where: { studentId },
        order: { issueDate: 'DESC' },
      });
    }
  }

  async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      if (invoice && invoice.invoice_pdf) {
        return invoice.invoice_pdf;
      }
      this.logger.warn(
        `Invoice PDF URL not found for Stripe Invoice ID: ${invoiceId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error retrieving Stripe Invoice ${invoiceId} for PDF URL: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw new InternalServerErrorException(
        `Failed to retrieve invoice PDF URL: ${(error as Error).message}`,
      );
    }
  }

  constructEvent(payload: string | any, sig: string | string[]): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Webhook secret not configured.');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, sig, secret);
    } catch (err) {
      throw new BadRequestException(`Webhook error: ${(err as Error).message}`);
    }
  }

  async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const student = await this.studentRepository.findOne({
      where: { stripeCustomerId: subscription.customer as string },
    });
    if (student) {
      student.stripeSubscriptionId = subscription.id;
      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];

      if (subscription.status === 'active') {
        if (
          typeof (subscription as any).current_period_start === 'number' &&
          (subscription as any).current_period_start
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
          (subscription as any).current_period_end
        ) {
          student.membershipRenewalDate = new Date(
            (subscription as any).current_period_end * 1000,
          )
            .toISOString()
            .split('T')[0];
        } else {
          student.membershipRenewalDate = null;
        }

        const stripePriceId = (subscription as any).items.data[0]?.price?.id;
        if (stripePriceId) {
          const plan = await this.membershipPlanRepository.findOne({
            where: { stripePriceId },
          });
          if (plan) {
            student.membershipPlanId = plan.id;
            student.membershipType = plan.name;
            student.membershipPlanName = plan.name;
          } else {
            this.logger.warn(
              `Webhook: No local plan found for Stripe Price ID ${stripePriceId} during subscription update for student ${student.id}`,
            );
          }
        }
      } else if (
        subscription.status === 'past_due' ||
        subscription.status === 'unpaid'
      ) {
        this.notificationGateway.sendNotificationToAll({
          title: 'Payment Overdue',
          message: `Student ${student.firstName} ${student.lastName}'s subscription payment is overdue.`,
          type: 'error',
          link: `/billing`,
        });
      }
      await this.studentRepository.save(student);
      this.logger.log(
        `Webhook: Updated subscription for student ${student.id} to ${subscription.status}`,
      );
      // Notify frontend of the change
      this.notificationGateway.broadcastDataUpdate('students', {
        updatedId: student.id,
      });
      this.notificationGateway.broadcastDataUpdate('subscriptions', {
        studentId: student.id,
      });
    } else {
      this.logger.warn(
        `Webhook: Received subscription update for unknown customer ${subscription.customer}`,
      );
    }
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `Webhook: Invoice payment succeeded for invoice ID: ${invoice.id}`,
    );
    if (!invoice.customer) {
      this.logger.warn(
        `Webhook: Invoice ${invoice.id} paid but has no customer ID.`,
      );
      return;
    }

    const isAuditionFee =
      (invoice.lines.data[0] as any)?.price?.product === 'prod_ScZhhq6OolKX7V';

    if (isAuditionFee) {
      this.logger.log(
        `Audition fee payment succeeded for invoice: ${invoice.id}`,
      );
      // Here you can add logic to create a "Prospect" record or similar
      // using the customer details from the invoice.
      const customer = await this.stripe.customers.retrieve(
        invoice.customer as string,
      );
      if (customer && !customer.deleted) {
        this.logger.log(
          `Audition prospect created: ${customer.name} (${customer.email})`,
        );
        // Example: Create a prospect entity in your DB
        // await this.prospectRepository.save({
        //   name: customer.name,
        //   email: customer.email,
        //   stripeCustomerId: customer.id,
        //   auditionPaymentStatus: 'paid',
        // });
      }
    } else {
      const student = await this.studentRepository.findOne({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (!student) {
        this.logger.warn(
          `Webhook: Student not found for Stripe Customer ID ${invoice.customer} from subscription invoice ${invoice.id}.`,
        );
        return;
      }

      const stripeSubscriptionId =
        typeof (invoice as any).subscription === 'string'
          ? (invoice as any).subscription
          : null;
      let localPlan: MembershipPlanDefinitionEntity | null = null;
      let paymentMethodType: PaymentMethod = 'Stripe Subscription';

      if (stripeSubscriptionId) {
        const stripePriceId = (invoice.lines?.data[0] as any)?.price?.id;
        if (stripePriceId) {
          localPlan = await this.membershipPlanRepository.findOne({
            where: { stripePriceId },
          });
          if (!localPlan) {
            this.logger.warn(
              `Webhook: Local plan not found for Stripe Price ID ${stripePriceId} from invoice ${invoice.id}.`,
            );
          }
        }
      } else {
        paymentMethodType = 'Credit Card';
      }

      const invoiceItems: InvoiceItem[] = invoice.lines.data.map((line) => ({
        id: line.id,
        description: line.description || 'N/A',
        quantity: line.quantity || 1,
        unitPrice: (line as any).price?.unit_amount_decimal
          ? parseFloat((line as any).price.unit_amount_decimal) / 100
          : line.amount / 100 / (line.quantity || 1),
        amount: line.amount / 100,
      }));

      const newLocalInvoice = this.invoiceRepository.create({
        studentId: student.id,
        membershipPlanId: localPlan?.id || null,
        membershipPlanName: localPlan?.name,
        invoiceNumber:
          invoice.number ||
          `STRIPE-${(invoice.id || '').substring(0, 12).toUpperCase()}`,
        issueDate: new Date(invoice.created * 1000).toISOString().split('T')[0],
        dueDate: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString().split('T')[0]
          : new Date(invoice.created * 1000).toISOString().split('T')[0],
        items: invoiceItems,
        subtotal: invoice.subtotal / 100,
        taxAmount: (((invoice as any).tax as number) || 0) / 100,
        totalAmount: invoice.total / 100,
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        status: (invoice as any).paid
          ? 'Paid'
          : ((invoice as any).status as InvoiceStatus) || 'Sent',
        notes: `Stripe Invoice ID: ${invoice.id || 'N/A'}`,
        stripeInvoiceId: invoice.id || undefined,
      });
      const savedLocalInvoice =
        await this.invoiceRepository.save(newLocalInvoice);
      this.logger.log(
        `Webhook: Saved local invoice ${savedLocalInvoice.id} for Stripe invoice ${invoice.id}`,
      );

      if ((invoice as any).paid && (invoice as any).payment_intent) {
        const paymentDateTimestamp =
          (invoice as any).status_transitions.paid_at || invoice.created;
        const paymentDate = new Date(paymentDateTimestamp * 1000)
          .toISOString()
          .split('T')[0];

        const paymentIntent = (invoice as any).payment_intent;
        const transactionId =
          typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;

        const newLocalPayment = this.paymentRepository.create({
          studentId: student.id,
          membershipPlanId: localPlan?.id || null,
          membershipPlanName: localPlan?.name,
          amountPaid: invoice.amount_paid / 100,
          paymentDate: paymentDate,
          paymentMethod: paymentMethodType,
          transactionId: transactionId,
          invoiceId: savedLocalInvoice.id,
          notes: `Payment for Stripe Invoice: ${invoice.id}`,
        });
        await this.paymentRepository.save(newLocalPayment);
        this.logger.log(
          `Webhook: Saved local payment for local invoice ${savedLocalInvoice.id}`,
        );

        this.notificationGateway.sendNotificationToAll({
          title: 'Stripe Payment Succeeded',
          message: `Received $${(invoice.amount_paid / 100).toFixed(2)} from ${student.firstName} ${student.lastName}.`,
          type: 'success',
          link: `/billing`,
        });
      }

      if (stripeSubscriptionId) {
        try {
          const stripeSub =
            await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
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
          // Notify frontend of the change
          this.notificationGateway.broadcastDataUpdate('students', {
            updatedId: student.id,
          });
          this.notificationGateway.broadcastDataUpdate('subscriptions', {
            studentId: student.id,
          });
        } catch (subError) {
          this.logger.error(
            `Webhook: Error retrieving Stripe subscription ${stripeSubscriptionId} for student update: ${(subError as Error).message}`,
            (subError as Error).stack,
          );
        }
      }
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `Webhook: Invoice payment failed for invoice ID: ${invoice.id}`,
    );
  }

  private mapStripeSubscriptionToDetails(
    subscription: Stripe.Subscription,
  ): StripeSubscriptionDetails {
    const latestInvoice = (subscription as any)
      .latest_invoice as Stripe.Invoice;
    const paymentIntent =
      ((latestInvoice as any)?.payment_intent as Stripe.PaymentIntent) || null;

    return {
      id: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status as StripeSubscriptionDetails['status'],
      items: {
        data: (((subscription as any).items.data as any[]) || []).map(
          (item: any) => ({
            price: { id: item.price.id },
            quantity: item.quantity,
          }),
        ),
      },
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
      cancel_at_period_end: (subscription as any).cancel_at_period_end,
      clientSecret: paymentIntent?.client_secret || null,
    };
  }
}
