/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Headers,
  Req,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Res, // Import Res decorator
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreateStripeSubscriptionDto } from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import Stripe from 'stripe';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express'; // Import Response

// Se extiende la interfaz de Request para incluir el cuerpo raw
interface RequestWithRawBody extends ExpressRequest {
  rawBody?: any;
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
  createSubscription(
    @Body() createSubDto: CreateStripeSubscriptionDto,
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.createSubscription(createSubDto);
  }

  @Get('students/:studentId/stripe-subscription')
  async getStudentSubscription(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StripeSubscriptionDetails> {
    const subscription =
      await this.stripeService.getStudentSubscription(studentId);

    if (!subscription) {
      throw new NotFoundException(
        `No active Stripe subscription found for student with ID ${studentId}`,
      );
    }
    return subscription;
  }

  @Get('invoices/:invoiceId/pdf')
  async getInvoicePdf(
    @Param('invoiceId') invoiceId: string,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const pdfUrl = await this.stripeService.getInvoicePdfUrl(invoiceId);
    if (pdfUrl) {
      res.redirect(303, pdfUrl);
    } else {
      throw new NotFoundException(
        `Invoice PDF not found for ID "${invoiceId}" or invoice does not exist.`,
      );
    }
  }

  @Get('payments')
  getStudentPayments(@Query('studentId', ParseUUIDPipe) studentId: string) {
    return this.stripeService.getPaymentsForStudent(studentId);
  }

  @Get('invoices')
  getStudentInvoices(@Query('studentId', ParseUUIDPipe) studentId: string) {
    return this.stripeService.getInvoicesForStudent(studentId);
  }

  @Delete('subscriptions/:subscriptionId/cancel')
  cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.cancelSubscription(studentId, subscriptionId);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RequestWithRawBody,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawRequestBody = req.rawBody;
    if (!rawRequestBody) {
      throw new InternalServerErrorException(
        'Raw body not available. Ensure rawBody middleware is configured.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(rawRequestBody, signature);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `⚠️  Webhook signature verification failed: ${errorMessage}`,
      );
      throw new BadRequestException(
        `Webhook signature verification failed: ${errorMessage}`,
      );
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.stripeService.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await this.stripeService.handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await this.stripeService.handleInvoicePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
