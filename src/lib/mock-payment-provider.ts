import type {
  PaymentProvider,
  PaymentInstructions,
  PayoutInstructions,
} from './payment-provider';

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentInstructions(dealId: string): Promise<PaymentInstructions> {
    return {
      qrCodeUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23CDE990"/></svg>',
      qrPayload: `MOCK_QRPH_PAYLOAD_${dealId}`,
      accountName: 'SafeSwap Mock Escrow Account',
      accountNumber: '0917-000-0000',
      institution: 'Mock Bank',
      amountCentavos: 500000,
      currency: 'PHP',
      referenceCode: `MOCK-${dealId.slice(0, 6)}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async submitPaymentProof(): Promise<{ paymentId: string; status: string }> {
    return { paymentId: 'mock-pay-id', status: 'PAYMENT_SUBMITTED' };
  }

  async confirmPayment(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async rejectPayment(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async createPayoutInstructions(dealId: string): Promise<PayoutInstructions> {
    return {
      dealId,
      sellerId: 'seller-id',
      sellerName: 'Mock Seller',
      sellerAccountName: 'Mock Seller Name',
      sellerInstitution: 'Mock GCash',
      sellerAccountNumberMasked: '•••• •••• 1234',
      sellerAccountNumberRaw: '0917-123-1234',
      payoutAmountCentavos: 500000,
      currency: 'PHP',
    };
  }

  async confirmPayout(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async refund(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
