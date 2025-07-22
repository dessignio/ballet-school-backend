/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  Res,
  StreamableFile,
  Patch,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import {
  CreateStripeSubscriptionDto,
  FinancialMetricsDto,
  RecordManualPaymentDto,
  ChangeStripeSubscriptionPlanDto,
  UpdatePaymentMethodDto,
  CreateAuditionPaymentDto,
} from './dto';
import { StripeSubscriptionDetails } from './stripe.interface';
import Stripe from 'stripe';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { Public } from 'src/auth/decorators/public.decorator';
import * as https from 'https';

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

  @Post('create-audition-payment')
  createAuditionPaymentIntent(
    @Body() paymentDto: CreateAuditionPaymentDto,
  ): Promise<{ clientSecret: string }> {
    return this.stripeService.createAuditionPaymentIntent(paymentDto);
  }

  @Get('metrics')
  getFinancialMetrics(): Promise<FinancialMetricsDto> {
    return this.stripeService.getFinancialMetrics();
  }

  @Post('subscriptions')
  createSubscription(
    @Body() createSubDto: CreateStripeSubscriptionDto,
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.createSubscription(createSubDto);
  }

  @Patch('subscriptions/:subscriptionId/change-plan')
  changeSubscriptionPlan(
    @Param('subscriptionId') subscriptionId: string,
    @Body() changePlanDto: ChangeStripeSubscriptionPlanDto,
  ): Promise<StripeSubscriptionDetails> {
    return this.stripeService.updateSubscription(
      subscriptionId,
      changePlanDto.newPriceId,
    );
  }

  @Post('students/:studentId/update-payment-method')
  @HttpCode(HttpStatus.OK)
  updatePaymentMethod(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() updateDto: UpdatePaymentMethodDto,
  ): Promise<{ success: boolean }> {
    return this.stripeService.updatePaymentMethod(
      studentId,
      updateDto.paymentMethodId,
    );
  }

  @Post('payments')
  recordManualPayment(@Body() recordPaymentDto: RecordManualPaymentDto) {
    return this.stripeService.recordManualPayment(recordPaymentDto);
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
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const pdfUrl = await this.stripeService.getInvoicePdfUrl(invoiceId);

    if (!pdfUrl) {
      throw new NotFoundException(
        `Invoice PDF not found for ID "${invoiceId}" or invoice does not exist.`,
      );
    }

    const MAX_REDIRECTS = 5;

    return new Promise((resolve, reject) => {
      const makeRequest = (url: string, redirectCount = 0) => {
        if (redirectCount > MAX_REDIRECTS) {
          reject(
            new InternalServerErrorException(
              'Too many redirects while fetching PDF.',
            ),
          );
          return;
        }

        https
          .get(url, (pdfStream) => {
            const statusCode = pdfStream.statusCode;

            if (
              statusCode &&
              statusCode >= 300 &&
              statusCode < 400 &&
              pdfStream.headers.location
            ) {
              // Handle redirect by consuming the current response and making a new request
              pdfStream.resume();
              makeRequest(pdfStream.headers.location, redirectCount + 1);
              return;
            }

            if (statusCode !== 200) {
              reject(
                new InternalServerErrorException(
                  'Failed to fetch PDF from Stripe.',
                ),
              );
              return;
            }

            res.set({
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
            });
            resolve(new StreamableFile(pdfStream));
          })
          .on('error', (e) => {
            reject(
              new InternalServerErrorException(
                `Could not fetch PDF from Stripe: ${e.message}`,
              ),
            );
          });
      };

      makeRequest(pdfUrl); // Initial call
    });
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
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StripeSubscriptionDetails> {
    const subscription = await this.stripeService.cancelSubscription(
      studentId,
      subscriptionId,
    );
    if (!subscription) {
      throw new InternalServerErrorException(
        'Failed to get subscription details after cancellation.',
      );
    }
    return subscription;
  }

  @Public()
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
