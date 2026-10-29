import { describe, it, expect } from 'vitest';
import { manualQrphProvider, generateQrPhSvg } from './manual-qrph-provider';
import { canTransition, getAvailableTransitions, STATUS_META } from './state-machine';

describe('Manual QR Ph Payment Provider', () => {
  it('generates high-contrast QR Ph SVG with exact amount and reference code', () => {
    const svg = generateQrPhSvg('180,250.00', 'SS-11111111');
    expect(svg).toContain('data:image/svg+xml');
    const decoded = decodeURIComponent(svg);
    expect(decoded).toContain('QR Ph National Escrow');
    expect(decoded).toContain('180,250.00');
    expect(decoded).toContain('SS-11111111');
    expect(decoded).toContain('GCash, Maya, BDO, BPI, UnionBank');
  });

  it('creates payment instructions for a deal with exact centavos', async () => {
    const instructions = await manualQrphProvider.createPaymentInstructions('11111111-1111-1111-1111-111111111111');
    expect(instructions.amountCentavos).toBeGreaterThan(0);
    expect(instructions.currency).toBe('PHP');
    expect(instructions.referenceCode).toMatch(/^SS-[A-Z0-9]{8}$/);
    expect(instructions.accountName).toContain('SafeSwap');
  });

  it('creates seller payout instructions with masked account details', async () => {
    const payout = await manualQrphProvider.createPayoutInstructions('22222222-2222-2222-2222-222222222222');
    expect(payout.sellerAccountNumberMasked).toContain('••••');
    expect(payout.payoutAmountCentavos).toBe(72000000);
    expect(payout.sellerInstitution).toBeDefined();
  });
});

describe('Manual QR Ph State Machine Transitions', () => {
  it('allows buyer to submit payment proof from CREATED', () => {
    expect(canTransition('CREATED', 'PAYMENT_SUBMITTED', 'buyer')).toBe(true);
    expect(canTransition('CREATED', 'PAYMENT_SUBMITTED', 'seller')).toBe(false);
  });

  it('allows staff to verify deposit and move to HELD', () => {
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'staff')).toBe(true);
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'buyer')).toBe(false);
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'seller')).toBe(false);
  });

  it('allows staff to reject payment and buyer to resubmit', () => {
    expect(canTransition('PAYMENT_SUBMITTED', 'PAYMENT_REJECTED', 'staff')).toBe(true);
    expect(canTransition('PAYMENT_REJECTED', 'PAYMENT_SUBMITTED', 'buyer')).toBe(true);
  });

  it('allows staff to disburse seller payout when PAYOUT_PENDING', () => {
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'staff')).toBe(true);
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'seller')).toBe(false);
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'buyer')).toBe(false);
  });

  it('strictly enforces RELEASED and REFUNDED as terminal states', () => {
    expect(STATUS_META.RELEASED.isTerminal).toBe(true);
    expect(STATUS_META.REFUNDED.isTerminal).toBe(true);
    expect(getAvailableTransitions('RELEASED', 'staff')).toHaveLength(0);
    expect(getAvailableTransitions('RELEASED', 'seller')).toHaveLength(0);
  });
});
