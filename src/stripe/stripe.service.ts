/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger, // Added Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StripeSubscriptionStatus } from 'src/student/student.entity';
import Stripe from 'stripe';
import { CreateStripeSubscriptionDto } from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment, PaymentMethod } from 'src/payment/payment.entity'; // Import Payment entity
import { Invoice } from 'src/invoice/invoice.entity'; // Import Invoice entity
import { InvoiceItem, InvoiceStatus } from 'src/invoice/invoice.types'; // Corrected import for InvoiceItem and InvoiceStatus

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name); // Initialize logger

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MembershipPlanDefinitionEntity)
    private membershipPlanRepository: Repository<MembershipPlanDefinitionEntity>,
    @InjectRepository(Payment) // Inject PaymentRepository
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice) // Inject InvoiceRepository
    private invoiceRepository: Repository<Invoice>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-ignore
      apiVersion: '2024-06-20', // Use a stable, recent API version
    });
  }

  // --- MÉTODOS PÚBLICOS PARA PRODUCTOS Y PRECIOS ---

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
    unitAmount: number, // en dólares
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

  // --- MÉTODOS PARA GESTIONAR CLIENTES Y SUSCRIPCIONES ---

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
      // This should ideally not happen if findOrCreateCustomer worked.
      throw new InternalServerErrorException(
        `Could not find student ${studentId} after customer creation.`,
      );
    }

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
        payment_behavior: 'default_incomplete',
      });

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

  async getPaymentsForStudent(studentId: string) {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      return [];
    }
    return this.paymentRepository.find({
      where: { studentId },
      order: { paymentDate: 'DESC' },
    });
  }

  async getInvoicesForStudent(studentId: string) {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      return [];
    }
    return this.invoiceRepository.find({
      where: { studentId },
      order: { issueDate: 'DESC' },
    });
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
        return null; // Invoice not found in Stripe
      }
      throw new InternalServerErrorException(
        `Failed to retrieve invoice PDF URL: ${(error as Error).message}`,
      );
    }
  }

  // --- MÉTODOS PARA WEBHOOKS ---

  constructEvent(
    payload: string | Buffer,
    sig: string | string[],
  ): Stripe.Event {
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
      }
      await this.studentRepository.save(student);
      this.logger.log(
        `Webhook: Updated subscription for student ${student.id} to ${subscription.status}`,
      );
    } else {
      this.logger.warn(
        `Webhook: Received subscription update for unknown customer ${subscription.customer}`,
      );
    }
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `Webhook: Invoice payment succeeded for invoice ID: ${invoice.id}, Customer: ${invoice.customer}`,
    );
    if (!invoice.customer) {
      this.logger.warn(
        `Webhook: Invoice ${invoice.id} paid but has no customer ID.`,
      );
      return;
    }

    const student = await this.studentRepository.findOne({
      where: { stripeCustomerId: invoice.customer as string },
    });
    if (!student) {
      this.logger.warn(
        `Webhook: Student not found for Stripe Customer ID ${invoice.customer} from invoice ${invoice.id}.`,
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
      } catch (subError) {
        this.logger.error(
          `Webhook: Error retrieving Stripe subscription ${stripeSubscriptionId} for student update: ${(subError as Error).message}`,
          (subError as Error).stack,
        );
      }
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(
      `Webhook: Invoice payment failed for invoice ID: ${invoice.id}`,
    );
  }

  // --- MÉTODOS PRIVADOS DE AYUDA ---

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
