// src/stripe/dto/financial-metrics.dto.ts

export class PlanMixItemDto {
  name: string;
  value: number; // For recharts compatibility
}

export class FinancialMetricsDto {
  mrr: number;
  activeSubscribers: number;
  arpu: number;
  churnRate: number;
  ltv: number;
  planMix: PlanMixItemDto[];
  paymentFailureRate: number;
}
