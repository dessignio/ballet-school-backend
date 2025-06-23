/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/stripe/stripe.service.ts
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

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
    });
  }

  async createStripeProduct(
    name: string,
    description?: string,
  ): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create({
        name: name,
        description: description || undefined, // Stripe expects undefined, not empty string for no description
        type: 'service', // For most SaaS membership plans
      });
      return product;
    } catch (error) {
      console.error('Stripe Product Creation Error:', error);
      throw new InternalServerErrorException(
        `Failed to create Stripe product: ${error.message}`,
      );
    }
  }

  async createStripePrice(
    productId: string,
    unitAmount: number, // in dollars for this function, converted to cents before API call
    currency: string,
    interval: Stripe.PriceCreateParams.Recurring.Interval,
  ): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: Math.round(unitAmount * 100), // Convert dollars to cents
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval,
        },
      });
      return price;
    } catch (error) {
      console.error('Stripe Price Creation Error:', error);
      throw new InternalServerErrorException(
        `Failed to create Stripe price: ${error.message}`,
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
        console.warn(
          `Could not retrieve Stripe customer ${student.stripeCustomerId}, creating a new one. Error: ${error.message}`,
        );
      }
    }

    const customerParams: Stripe.CustomerCreateParams = {
      email: student.email,
      name: `${student.firstName} ${student.lastName}`,
      phone: student.phone || undefined,
      metadata: { student_id: student.id },
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
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found.`);
    }

    let customerId = student.stripeCustomerId;
    if (!customerId) {
      const customer = await this.findOrCreateCustomer(
        studentId,
        paymentMethodId,
      );
      customerId = customer.id;
    } else {
      try {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
        await this.stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      } catch (error) {
        throw new BadRequestException(
          `Failed to attach payment method: ${error.message}`,
        );
      }
    }

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });

      student.stripeSubscriptionId = subscription.id;
      student.stripeSubscriptionStatus =
        subscription.status as StripeSubscriptionDetails['status'];
      await this.studentRepository.save(student);

      return this.mapStripeSubscriptionToDetails(subscription);
    } catch (error) {
      console.error('Stripe Subscription Error:', error);
      throw new BadRequestException(
        `Failed to create Stripe subscription: ${error.message}`,
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
      const canceledSubscription =
        await this.stripe.subscriptions.cancel(subscriptionId);
      student.stripeSubscriptionStatus =
        canceledSubscription.status as StripeSubscriptionDetails['status'];
      await this.studentRepository.save(student);
      return this.mapStripeSubscriptionToDetails(canceledSubscription);
    } catch (error) {
      throw new BadRequestException(
        `Failed to cancel Stripe subscription: ${error.message}`,
      );
    }
  }

  async getStudentSubscription(
    studentId: string,
  ): Promise<StripeSubscriptionDetails | null> {
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student || !student.stripeSubscriptionId) {
      if (student) {
        student.stripeSubscriptionStatus = null;
        await this.studentRepository.save(student);
      }
      return null;
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        student.stripeSubscriptionId,
      );
      if (student.stripeSubscriptionStatus !== subscription.status) {
        student.stripeSubscriptionStatus =
          subscription.status as StripeSubscriptionDetails['status'];
        await this.studentRepository.save(student);
      }
      return this.mapStripeSubscriptionToDetails(subscription);
    } catch (error) {
      if (error.code === 'resource_missing') {
        student.stripeSubscriptionId = undefined;
        student.stripeSubscriptionStatus = null;
        await this.studentRepository.save(student);
        return null;
      }
      console.error(
        `Failed to retrieve Stripe subscription ${student.stripeSubscriptionId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Could not fetch subscription details.',
      );
    }
  }

  constructEvent(
    payload: string | any,
    sig: string | string[] | any,
  ): Stripe.Event {
    // Replaced Buffer with any
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    return this.stripe.webhooks.constructEvent(payload, sig, secret);
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
        `Webhook: Updated subscription status for student ${student.id} to ${subscription.status}`,
      );
    } else {
      console.warn(
        `Webhook: Received subscription update for unknown customer ${subscription.customer}`,
      );
    }
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionIdFromInvoice = (invoice as any).subscription;
    if (
      subscriptionIdFromInvoice &&
      typeof subscriptionIdFromInvoice === 'string'
    ) {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionIdFromInvoice,
      );
      const student = await this.studentRepository.findOne({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (student) {
        student.stripeSubscriptionStatus =
          subscription.status as StripeSubscriptionDetails['status'];
        console.log(
          `Webhook: Invoice payment succeeded for student ${student.id}, subscription ${subscription.id}. Status: ${subscription.status}`,
        );
        await this.studentRepository.save(student);
      } else {
        console.warn(
          `Webhook: Invoice payment for unknown customer ${subscription.customer}`,
        );
      }
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionIdFromInvoice = (invoice as any).subscription;
    if (
      subscriptionIdFromInvoice &&
      typeof subscriptionIdFromInvoice === 'string'
    ) {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionIdFromInvoice,
      );
      const student = await this.studentRepository.findOne({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (student) {
        student.stripeSubscriptionStatus =
          subscription.status as StripeSubscriptionDetails['status'];
        console.log(
          `Webhook: Invoice payment failed for student ${student.id}, subscription ${subscription.id}. Status: ${subscription.status}`,
        );
        await this.studentRepository.save(student);
      } else {
        console.warn(
          `Webhook: Invoice payment failure for unknown customer ${subscription.customer}`,
        );
      }
    }
  }

  private mapStripeSubscriptionToDetails(
    subscription: Stripe.Subscription,
  ): StripeSubscriptionDetails {
    return {
      id: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status as StripeSubscriptionDetails['status'],
      items: {
        data: subscription.items.data.map((item) => ({
          price: { id: item.price.id },
          quantity: item.quantity,
        })),
      },
      current_period_end: (subscription as any).current_period_end as number, // Add type assertion
    };
  }
}
