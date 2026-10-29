/**
 * SafeSwap PaymentProvider Adapter Interface
 * 
 * Abstract payment interface supporting:
 * - Manual QR Ph (Production mode with staff verification)
 * - Mock Payment Provider (Unit tests & local development)
 * - Swap-ready for future automated payment gateways (e.g. Maya, Xendit, Brankas)
 */

export interface PaymentInstructions {
  qrCodeUrl: string; // Dynamic QR Ph SVG / image URL or data URI
  qrPayload: string; // Raw QR Ph EMVCo standard payload string
  accountName: string;
  accountNumber: string;
  institution: string;
  amountCentavos: number;
  currency: string;
  referenceCode: string;
  expiresAt: string;
}

export interface PayoutInstructions {
  dealId: string;
  sellerId: string;
  sellerName: string;
  sellerAccountName: string;
  sellerInstitution: string;
  sellerAccountNumberMasked: string;
  sellerAccountNumberRaw?: string;
  payoutAmountCentavos: number;
  currency: string;
}

export interface PaymentProvider {
  createPaymentInstructions(dealId: string): Promise<PaymentInstructions>;
  submitPaymentProof(
    dealId: string,
    data: {
      referenceNumber: string;
      proofFilePath?: string;
      paidAt?: string;
      amountCentavos: number;
      idempotencyKey?: string;
    }
  ): Promise<{ paymentId: string; status: string }>;
  confirmPayment(
    dealId: string,
    staffId: string,
    data: {
      bankReference: string;
      verifiedAmountCentavos: number;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }>;
  rejectPayment(
    dealId: string,
    staffId: string,
    reason: string
  ): Promise<{ success: boolean }>;
  createPayoutInstructions(
    dealId: string,
    staffId?: string
  ): Promise<PayoutInstructions>;
  confirmPayout(
    dealId: string,
    staffId: string,
    data: {
      payoutReference: string;
      proofFilePath?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }>;
  refund(
    dealId: string,
    staffId: string,
    data: {
      reason: string;
      refundReference: string;
      proofFilePath?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }>;
}

import { manualQrphProvider } from './manual-qrph-provider';
import { mockPaymentProvider } from './mock-payment-provider';

export function getPaymentProvider(): PaymentProvider {
  const provider = import.meta.env.VITE_PAYMENT_PROVIDER;
  if (provider === 'mock') {
    return mockPaymentProvider;
  }
  // Production default is Manual QR Ph
  return manualQrphProvider;
}
