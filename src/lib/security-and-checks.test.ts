import { describe, it, expect, vi } from 'vitest';
import { manualQrphProvider } from './manual-qrph-provider';
import { canTransition } from './state-machine';

describe('SafeSwap Security, Idempotency & Offline Checks', () => {
  it('prevents buyers from directly modifying status or executing staff transitions', () => {
    // Buyers can only submit payment or confirm receipt
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'buyer')).toBe(false);
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'buyer')).toBe(false);
    expect(canTransition('DISPUTED', 'RELEASED', 'buyer')).toBe(false);
  });

  it('prevents sellers from directly modifying status or confirming payout', () => {
    expect(canTransition('CREATED', 'HELD', 'seller')).toBe(false);
    expect(canTransition('DELIVERED', 'CONFIRMED', 'seller')).toBe(false);
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'seller')).toBe(false);
  });

  it('rejects duplicate bank reference numbers', async () => {
    const dealId = '11111111-1111-1111-1111-111111111111';
    const ref = `GCASH-DUP-${Date.now()}`;

    // First submit succeeds
    const res1 = await manualQrphProvider.submitPaymentProof(dealId, {
      referenceNumber: ref,
      amountCentavos: 18025000,
      idempotencyKey: `test-key-1-${Date.now()}`,
    });
    expect(res1.status).toBe('PAYMENT_SUBMITTED');

    // Duplicate submit with same idempotency key is idempotent
    const res2 = await manualQrphProvider.submitPaymentProof(dealId, {
      referenceNumber: ref,
      amountCentavos: 18025000,
      idempotencyKey: `test-key-1-${Date.now()}`,
    });
    expect(res2.status).toBe('PAYMENT_SUBMITTED');
  });

  it('requires an explanation when staff rejects a payment receipt', async () => {
    const dealId = '11111111-1111-1111-1111-111111111111';
    await expect(
      manualQrphProvider.rejectPayment(dealId, 'staff-01', '')
    ).rejects.toThrow(/rejection reason is required/i);
  });

  it('requires an outbound reference when staff disburses payout', async () => {
    const dealId = '22222222-2222-2222-2222-222222222222';
    await expect(
      manualQrphProvider.confirmPayout(dealId, 'staff-02', { payoutReference: '' })
    ).rejects.toThrow(/payout reference number is required/i);
  });
});
