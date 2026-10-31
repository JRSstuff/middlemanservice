import { describe, it, expect } from 'vitest';
import { analyzeDealRisk, analyzeDisputeCase } from './ai-assistant';

describe('AI Escrow Assistant', () => {
  it('identifies healthy, well-specified deals with high trust score', () => {
    const analysis = analyzeDealRisk({
      title: 'Custom Mechanical Keyboard Build',
      description: 'Fully built keyboard with lubed switches',
      terms: 'Buyer has 48 hours inspection window to test every switch and stabilizer before confirmation.',
      price_amount: 850000,
    });

    expect(analysis.riskLevel).toBe('LOW');
    expect(analysis.trustScore).toBeGreaterThanOrEqual(80);
    expect(analysis.positiveSignals.length).toBeGreaterThan(0);
  });

  it('detects off-platform scam keywords and flags elevated risk', () => {
    const analysis = analyzeDealRisk({
      title: 'iPhone 15 Pro Max Cheap',
      terms: 'Message me on telegram or viber for outside personal gcash payment.',
      price_amount: 3000000,
    });

    expect(analysis.riskLevel).toBe('ELEVATED');
    expect(analysis.trustScore).toBeLessThan(60);
    expect(analysis.riskFactors.some((r) => r.includes('Off-platform'))).toBe(true);
  });

  it('recommends full refund for non-delivery when no tracking proof is uploaded', () => {
    const recommendation = analyzeDisputeCase({
      dealTitle: 'Anime Figure Lot',
      agreedTerms: 'Delivery within 3 days via J&T Express with tracking.',
      disputeReason: 'Item not received',
      disputeDetails: 'Package never arrived and seller is unresponsive.',
      hasDeliveryProof: false,
    });

    expect(recommendation.recommendedAction).toBe('FULL_REFUND');
    expect(recommendation.confidenceScore).toBeGreaterThan(80);
  });
});
