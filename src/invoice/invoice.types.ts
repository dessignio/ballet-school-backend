// src/invoice/invoice.types.ts

export interface InvoiceItem {
  id: string; // Can be a product ID, service ID, or a generated UUID for the line item
  description: string;
  quantity: number;
  unitPrice: number; // Store as a number, e.g., 10.50 for $10.50
  amount: number; // quantity * unitPrice
}

export type InvoiceStatus =
  | 'Draft'
  | 'Sent'
  | 'Paid'
  | 'Overdue'
  | 'Void'
  | 'Uncollectible';
