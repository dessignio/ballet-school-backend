/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from 'src/student/student.entity';
import Stripe from 'stripe';
import { CreateStripeSubscriptionDto } from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';

// Interfaz que "extiende" la de Stripe, añadiendo las propiedades que faltaban.
interface ExtendedStripeSubscription extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MembershipPlanDefinitionEntity)
    private membershipPlanRepository: Repository<MembershipPlanDefinitionEntity>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
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
      console.error('Stripe Product Creation Error:', error);
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
      console.error('Stripe Price Creation Error:', error);
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
        console.warn(
          `Could not retrieve Stripe customer ${student.stripeCustomerId}, creating a new one.`,
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

    const newCustomer = await this.stripe.customers.create(customerParams);
    student.stripeCustomerId = newCustomer.id;
    await this.studentRepository.save(student);
    return newCustomer;
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
      const subscription = (await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      })) as unknown as ExtendedStripeSubscription;

      student.stripeSubscriptionId = subscription.id;
      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];

      const plan = await this.membershipPlanRepository.findOne({
        where: { stripePriceId: priceId },
      });

      if (plan) {
        student.membershipPlanId = plan.id;
        student.membershipType = plan.name;
        student.membershipStartDate = new Date(
          subscription.current_period_start * 1000,
        )
          .toISOString()
          .split('T')[0];
        student.membershipRenewalDate = new Date(
          subscription.current_period_end * 1000,
        )
          .toISOString()
          .split('T')[0];
      } else {
        console.warn(
          `No local membership plan found for Stripe Price ID: ${priceId}.`,
        );
      }

      await this.studentRepository.save(student);
      return this.mapStripeSubscriptionToDetails(subscription);
    } catch (error) {
      console.error('Stripe Subscription Creation Error:', error);
      throw new BadRequestException(
        `Failed to create Stripe subscription: ${(error as Error).message}`,
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
      const canceledSubscription = (await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        },
      )) as unknown as ExtendedStripeSubscription;

      student.stripeSubscriptionStatus =
        canceledSubscription.status as StripeSubscriptionDetails['status'];
      await this.studentRepository.save(student);
      return this.mapStripeSubscriptionToDetails(canceledSubscription);
    } catch (error) {
      console.error('Stripe Subscription Cancellation Error:', error);
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
      const subscription = (await this.stripe.subscriptions.retrieve(
        student.stripeSubscriptionId,
      )) as unknown as ExtendedStripeSubscription;

      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];
      if (subscription.status === 'active') {
        student.membershipRenewalDate = new Date(
          subscription.current_period_end * 1000,
        )
          .toISOString()
          .split('T')[0];
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
      console.error(
        `Failed to retrieve Stripe subscription ${student.stripeSubscriptionId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not fetch subscription details.',
      );
    }
  }

  async getPaymentsForStudent(studentId: string) {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      return { data: [] };
    }

    return this.stripe.paymentIntents.list({
      customer: student.stripeCustomerId,
      limit: 100,
    });
  }

  async getInvoicesForStudent(studentId: string) {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeCustomerId) {
      return { data: [] };
    }

    return this.stripe.invoices.list({
      customer: student.stripeCustomerId,
      limit: 100,
    });
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
      await this.studentRepository.save(student);
      console.log(
        `Webhook: Updated subscription for student ${student.id} to ${subscription.status}`,
      );
    } else {
      console.warn(
        `Webhook: Received subscription update for unknown customer ${subscription.customer}`,
      );
    }
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(
      `Webhook: Invoice payment succeeded for invoice ID: ${invoice.id}`,
    );
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(
      `Webhook: Invoice payment failed for invoice ID: ${invoice.id}`,
    );
  }

  // --- MÉTODOS PRIVADOS DE AYUDA ---

  private mapStripeSubscriptionToDetails(
    subscription: Stripe.Subscription,
  ): StripeSubscriptionDetails {
    const extendedSub = subscription as ExtendedStripeSubscription;
    return {
      id: extendedSub.id,
      stripeCustomerId: extendedSub.customer as string,
      status: extendedSub.status as StripeSubscriptionDetails['status'],
      items: {
        data: extendedSub.items.data.map((item) => ({
          price: { id: item.price.id },
          quantity: item.quantity,
        })),
      },
      current_period_end: extendedSub.current_period_end,
    };
  }
}
