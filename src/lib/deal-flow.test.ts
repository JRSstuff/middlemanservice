import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  toMinorUnits,
  toMajorUnits,
  calculateServiceFee,
  truncateId,
} from './format';
import {
  createDealSchema,
  deliveryProofSchema,
  disputeSchema,
} from './validation';

describe('SafeSwap Money & Formatting Utilities', () => {
  it('formats minor units (centavos) into localized currency string', () => {
    expect(formatMoney(17500000, 'PHP')).toBe('₱175,000.00');
    expect(formatMoney(5000, 'USD')).toBe('$50.00');
    expect(formatMoney(100, 'EUR')).toBe('€1.00');
  });

  it('converts major unit inputs into minor unit integers safely', () => {
    expect(toMinorUnits(150.5)).toBe(15050);
    expect(toMinorUnits('25,000.00')).toBe(2500000);
    expect(toMinorUnits('0.99')).toBe(99);
    expect(toMinorUnits(-50)).toBe(0);
  });

  it('converts minor units back to major units', () => {
    expect(toMajorUnits(15050)).toBe(150.5);
    expect(toMajorUnits(100)).toBe(1);
  });

  it('calculates 3% standard escrow service fee accurately', () => {
    // ₱175,000.00 (17500000 centavos) * 3% = ₱5,250.00 (525000 centavos)
    expect(calculateServiceFee(17500000, 0.03)).toBe(525000);
    // ₱50,000.00 (5000000 centavos) * 3% = ₱1,500.00 (150000 centavos)
    expect(calculateServiceFee(5000000, 0.03)).toBe(150000);
  });

  it('truncates UUID for UI display', () => {
    expect(truncateId('11111111-2222-3333-4444-555555555555')).toBe('#11111111');
    expect(truncateId('short')).toBe('#short');
  });
});

describe('SafeSwap Form Validation Schemas', () => {
  it('validates valid deal creation payload', () => {
    const valid = {
      title: 'Vintage Leather Jacket',
      description: 'Size 40, original condition',
      terms: 'Buyer inspects zipper and lining within 48h',
      priceMajor: 4500,
      priceCurrency: 'PHP',
      counterpartyEmail: 'seller@example.com',
      creatorRole: 'buyer' as const,
    };
    const result = createDealSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects deal creation with short title or short terms', () => {
    const invalid = {
      title: 'ab', // < 3 chars
      terms: 'too short', // < 10 chars
      priceMajor: 100,
      priceCurrency: 'PHP',
      counterpartyEmail: 'invalid-email',
      creatorRole: 'buyer' as const,
    };
    const result = createDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('title'))).toBe(true);
      expect(result.error.issues.some((i) => i.path.includes('terms'))).toBe(true);
      expect(result.error.issues.some((i) => i.path.includes('counterpartyEmail'))).toBe(true);
    }
  });

  it('rejects non-positive amounts', () => {
    const invalidAmount = {
      title: 'Valid Title Here',
      terms: 'Inspection terms are at least ten chars long',
      priceMajor: 0,
      priceCurrency: 'PHP',
      counterpartyEmail: 'valid@example.com',
      creatorRole: 'buyer' as const,
    };
    const result = createDealSchema.safeParse(invalidAmount);
    expect(result.success).toBe(false);
  });

  it('validates delivery proof schemas', () => {
    const validProof = {
      proofType: 'tracking_number' as const,
      carrier: 'LBC Express',
      trackingNumber: 'LBC-12345',
      notes: 'Delivered to recipient residence',
    };
    expect(deliveryProofSchema.safeParse(validProof).success).toBe(true);
  });

  it('validates dispute schemas requiring detailed reason', () => {
    expect(disputeSchema.safeParse({ reason: 'Item broken on delivery' }).success).toBe(true);
    expect(disputeSchema.safeParse({ reason: 'bad' }).success).toBe(false);
  });
});
