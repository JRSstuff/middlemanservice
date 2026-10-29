import { z } from 'zod';

export const createDealSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  terms: z
    .string()
    .min(10, 'Inspection terms must be at least 10 characters detailing condition or acceptance criteria'),
  priceMajor: z
    .number()
    .positive('Price must be greater than zero')
    .min(1, 'Minimum amount is 1.00'),
  priceCurrency: z
    .string()
    .length(3, 'Currency must be 3-letter ISO code'),
  counterpartyEmail: z
    .string()
    .email('Please enter a valid counterparty email address'),
  creatorRole: z.enum(['buyer', 'seller']),
});

export type CreateDealFormValues = z.infer<typeof createDealSchema>;

export const deliveryProofSchema = z.object({
  proofType: z.enum(['tracking_number', 'photo', 'file', 'notes']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  notes: z.string().optional(),
});

export type DeliveryProofFormValues = z.infer<typeof deliveryProofSchema>;

export const disputeSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters detailing the discrepancy'),
});

export type DisputeFormValues = z.infer<typeof disputeSchema>;
