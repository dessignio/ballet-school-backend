/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  Res,
  StreamableFile,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service'; // <-- CORRECCIÓN AQUÍ
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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity';

interface RequestWithRawBody extends ExpressRequest {
  rawBody?: any;
}

interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  studioId: string;
}

@Controller('stripe')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class StripeController {
  logger: any;
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-audition-payment')
  createAuditionPaymentIntent(
    @Body() paymentDto: CreateAuditionPaymentDto,
    @Req() req: Request,
  ): Promise<{ clientSecret: string }> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.createAuditionPaymentIntent(paymentDto, studioId);
  }

  @Get('metrics')
  getFinancialMetrics(@Req() req: Request): Promise<FinancialMetricsDto> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.getFinancialMetrics(studioId);
  }

  @Post('subscriptions')
  createSubscription(
    @Body() createSubDto: CreateStripeSubscriptionDto,
    @Req() req: Request,
  ): Promise<StripeSubscriptionDetails> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.createSubscription(createSubDto, studioId);
  }

  @Patch('subscriptions/:subscriptionId/change-plan')
  changeSubscriptionPlan(
    @Param('subscriptionId') subscriptionId: string,
    @Body() changePlanDto: ChangeStripeSubscriptionPlanDto,
    @Req() req: Request,
  ): Promise<StripeSubscriptionDetails> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.updateSubscription(
      subscriptionId,
      changePlanDto.newPriceId,
      studioId,
    );
  }

  @Post('students/:studentId/update-payment-method')
  @HttpCode(HttpStatus.OK)
  updatePaymentMethod(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() updateDto: UpdatePaymentMethodDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.updatePaymentMethod(
      studentId,
      updateDto.paymentMethodId,
      studioId,
    );
  }

  @Post('payments')
  recordManualPayment(@Body() recordPaymentDto: RecordManualPaymentDto) {
    return this.stripeService.recordManualPayment(recordPaymentDto);
  }

  @Post('connect/account')
  async createConnectAccount(@Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    const studio = await this.stripeService.getStudioWithAdminUser(studioId);
    if (!studio) {
      throw new NotFoundException(`Studio with ID ${studioId} not found.`);
    }
    return this.stripeService.createConnectAccount(studio);
  }

  @Post('connect/account-link')
  async createAccountLink(@Req() req: Request): Promise<{ url: string }> {
    const studioId = (req.user as JwtPayload).studioId;
    const studio = await this.stripeService.getStudioWithAdminUser(studioId);
    if (!studio || !studio.stripeAccountId) {
      throw new BadRequestException(
        'Stripe Connect account not configured for this studio.',
      );
    }
    const url = await this.stripeService.createAccountLink(
      studio.stripeAccountId,
    );
    return { url };
  }

  @Get('connect/account-id')
  async getConnectAccountId(
    @Req() req: Request,
  ): Promise<{ stripeAccountId: string }> {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.getConnectAccountId(studioId);
  }

  @Get('connect/account-status')
  async getAccountStatus(@Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.getStudioStripeStatus(studioId);
  }

  @Get('students/:studentId/stripe-subscription')
  async getStudentSubscription(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Req() req: Request,
  ): Promise<StripeSubscriptionDetails> {
    const studioId = (req.user as JwtPayload).studioId;
    const subscription = await this.stripeService.getStudentSubscription(
      studentId,
      studioId,
    );

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
    @Req() req: Request, // Añadido para obtener studioId
  ): Promise<StreamableFile> {
    const studioId = (req.user as JwtPayload).studioId;
    // Asumiendo que getInvoicePdfUrl ahora necesita studioId para cuentas Connect
    const pdfUrl = await this.stripeService.getInvoicePdfUrl(
      invoiceId,
      studioId,
    );

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

      makeRequest(pdfUrl);
    });
  }

  @Get('payments')
  getStudentPayments(
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Req() req: Request,
  ) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.stripeService.getPaymentsForStudent(studentId, studioId);
  }

  @Get('invoices')
  getStudentInvoices(
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Req() req: Request,
  ) {
    return this.stripeService.getInvoicesForStudent(
      studentId,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete('subscriptions/:subscriptionId/cancel')
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body('studentId', ParseUUIDPipe) studentId: string,
    @Req() req: Request,
  ): Promise<StripeSubscriptionDetails> {
    const studioId = (req.user as JwtPayload).studioId;
    const subscription = await this.stripeService.cancelSubscription(
      studentId,
      subscriptionId,
      studioId,
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

    const connectedAccountId = event.account;

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (!connectedAccountId) {
          this.logger.warn(
            `Subscription webhook received without an account ID: ${event.id}`,
          );
          break;
        }
        await this.stripeService.handleSubscriptionUpdated(
          subscription,
          connectedAccountId,
        );
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
      case 'account.updated': {
        const account = event.data.object;
        await this.stripeService.handleAccountUpdated(account);
        break;
      }
      case 'account.application.authorized': {
        const account = event.data.object as unknown as Stripe.Account;
        await this.stripeService.handleAccountApplicationAuthorized(account);
        break;
      }
      case 'account.external_account.created': {
        const account = event.data.object as unknown as Stripe.Account;
        await this.stripeService.handleAccountExternalAccountCreated(account);
        break;
      }
      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
