// src/stripe/dto/create-stripe-subscription.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateStripeSubscriptionDto {
  @IsUUID('4')
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  priceId: string; // Stripe Price ID (e.g., price_xxxxxxxxxxxxxx)

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string; // Stripe PaymentMethod ID (e.g., pm_xxxxxxxxxxxxxx)

  @IsOptional()
  @IsString()
  existingStripeCustomerId?: string; // Optional: if student already has a Stripe Customer ID
}

export class ChangeStripeSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  newPriceId: string;
}

export class UpdatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
