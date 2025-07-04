// src/stripe/dto/record-manual-payment.dto.ts
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentMethodValues } from 'src/payment/payment.entity';

export class RecordManualPaymentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  membershipPlanId: string;

  @IsNumber()
  @Min(0.01)
  amountPaid: number;

  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @IsEnum(PaymentMethodValues)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
