/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// src/stripe/stripe.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Headers,
  Req,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreateStripeSubscriptionDto } from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import Stripe from 'stripe';
import { Request as ExpressRequest } from 'express'; // Import express Request

// Define an interface that extends Express Request to include rawBody
interface RequestWithRawBody extends ExpressRequest {
  rawBody?: string | any; // Replaced Buffer with any
}

@Controller('stripe')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('subscriptions')
  async createSubscription(
    @Body() createSubDto: CreateStripeSubscriptionDto,
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.createSubscription(createSubDto);
  }

  @Get('/students/:studentId/stripe-subscription')
  async getStudentSubscription(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StripeSubscriptionDetails | null> {
    return this.stripeService.getStudentSubscription(studentId);
  }

  // Matches frontend API_ENDPOINTS.STRIPE_SUBSCRIPTION_CANCEL
  @Delete('subscriptions/:subscriptionId/cancel')
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string, // Stripe sub IDs are not UUIDs
    @Body('studentId', ParseUUIDPipe) studentId: string, // Require studentId in body for verification
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.cancelSubscription(studentId, subscriptionId);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RequestWithRawBody, // Use the extended Request type
  ) {
    if (!signature) {
      console.warn('Stripe webhook: Missing stripe-signature header');
      // Consider returning a 400 Bad Request here, but for Stripe to not retry, often a 200 is preferred.
      // However, processing should halt.
      return;
    }

    const rawRequestBody = req.rawBody; // Access rawBody

    if (!rawRequestBody) {
      console.error(
        'Stripe webhook: Raw body not available. Ensure rawBody middleware is configured correctly for this route.',
      );
      // This indicates a server configuration issue.
      return; // Avoid processing without raw body
    }

    let event: Stripe.Event;
    try {
      // Stripe expects the raw body as a Buffer or string.
      // If rawBody is already a string (due to verify in main.ts), it's fine.
      // If NestJS `rawBody:true` was used and it's a Buffer, also fine.
      event = this.stripeService.constructEvent(rawRequestBody, signature);
    } catch (err) {
      console.error(
        `⚠️  Webhook signature verification failed: ${err.message}`,
      );
      // On error, return a 400 error to Stripe
      // throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
      // Or, to prevent Stripe from retrying with a potentially malformed payload:
      return; // Acknowledge receipt but don't process.
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Handles cancellations, end of trial if not paid, etc.
        const subscription = event.data.object;
        await this.stripeService.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoicePaymentSucceeded = event.data.object;
        await this.stripeService.handleInvoicePaymentSucceeded(
          invoicePaymentSucceeded,
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoicePaymentFailed = event.data.object;
        await this.stripeService.handleInvoicePaymentFailed(
          invoicePaymentFailed,
        );
        break;
      }
      // ... handle other event types as needed
      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    // No specific JSON body is needed, but an object can be returned.
    return { received: true };
  }
}
