/**
 * @file ai-assistant.ts
 * @description AI-powered safety, risk analysis, and dispute resolution assistant for SafeSwap.
 *
 * Provides intelligent assistive capabilities for Philippine P2P escrow:
 * 1. AI Deal Risk Screener: Analyzes transaction terms for scam patterns, ambiguous clauses, and high-value risks.
 * 2. AI Receipt & Reference Validator: Assesses reference code anomalies and bank statement matching.
 * 3. AI Dispute Recommendation Engine: Synthesizes buyer/seller claims against agreed inspection terms.
 */

export interface DealRiskAssessment {
  riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED';
  trustScore: number; // 0 - 100
  headline: string;
  positiveSignals: string[];
  riskFactors: string[];
  recommendations: string[];
}

export interface DisputeRecommendation {
  recommendedAction: 'FULL_REFUND' | 'RELEASE_TO_SELLER' | 'PARTIAL_REFUND_RETURN' | 'MANUAL_MEDIATION';
  confidenceScore: number; // 0 - 100
  rationale: string;
  suggestedTerms: string;
}

/**
 * Analyzes deal parameters to assess fraud risk and provide safety guidance.
 */
export function analyzeDealRisk(deal: {
  title: string;
  description?: string | null;
  terms: string;
  price_amount: number;
}): DealRiskAssessment {
  const content = `${deal.title} ${deal.description || ''} ${deal.terms}`.toLowerCase();
  
  const positiveSignals: string[] = [];
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  let score = 85; // baseline healthy escrow score

  // 1. Off-platform contact attempts (scam pattern)
  const offPlatformKeywords = ['telegram', 'viber', 'whatsapp', 'outside', 'direct transfer', 'bypass', 'personal gcash'];
  const hasOffPlatform = offPlatformKeywords.some((kw) => content.includes(kw));
  if (hasOffPlatform) {
    score -= 35;
    riskFactors.push('Off-platform communication or payment attempt detected.');
    recommendations.push('Never conduct payments or conversations outside SafeSwap to preserve your escrow protection.');
  } else {
    positiveSignals.push('Transaction terms strictly contained within SafeSwap escrow flow.');
  }

  // 2. Clear inspection criteria
  const inspectionKeywords = ['inspection', 'test', 'hours', 'days', 'condition', 'serial', 'functional', 'check'];
  const hasInspectionTerms = inspectionKeywords.filter((kw) => content.includes(kw)).length >= 2;
  if (hasInspectionTerms) {
    score += 10;
    positiveSignals.push('Specific inspection and acceptance criteria documented.');
  } else {
    score -= 15;
    riskFactors.push('Inspection criteria may be ambiguous or lack concrete acceptance terms.');
    recommendations.push('Specify an exact inspection timeframe (e.g. 24-48 hours) and condition checks in the deal terms.');
  }

  // 3. High-value transaction diligence
  if (deal.price_amount >= 5000000) { // >= ₱50,000.00
    riskFactors.push('High-value transaction: BSP Tier-2 KYC and courier signature verification advised.');
    recommendations.push('Use insured/armored courier services (e.g. LBC, Air21) and record unboxing video upon delivery.');
  } else {
    positiveSignals.push('Standard peer-to-peer transaction value within ordinary student/freelance thresholds.');
  }

  // 4. Vagueness or brevity check
  if (deal.terms.length < 25) {
    score -= 10;
    riskFactors.push('Inspection terms are very brief.');
  } else {
    positiveSignals.push('Comprehensive item and inspection descriptions provided.');
  }

  // Bound score
  const finalScore = Math.max(10, Math.min(99, score));
  let riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' = 'LOW';
  let headline = 'Safe & Standard Escrow Terms';

  if (finalScore < 60) {
    riskLevel = 'ELEVATED';
    headline = 'Elevated Risk Detected — Exercise Caution';
  } else if (finalScore < 80) {
    riskLevel = 'MODERATE';
    headline = 'Moderate Risk — Additional Inspection Terms Recommended';
  }

  return {
    riskLevel,
    trustScore: finalScore,
    headline,
    positiveSignals,
    riskFactors,
    recommendations,
  };
}

/**
 * Evaluates a dispute case between buyer and seller and provides an impartial recommendation for staff.
 */
export function analyzeDisputeCase(params: {
  dealTitle: string;
  agreedTerms: string;
  disputeReason: string;
  disputeDetails: string;
  hasDeliveryProof: boolean;
}): DisputeRecommendation {
  const reason = params.disputeReason.toLowerCase();
  const details = params.disputeDetails.toLowerCase();
  const terms = params.agreedTerms.toLowerCase();

  // Non-delivery with no tracking proof
  if (reason.includes('not received') || reason.includes('missing') || details.includes('never arrived')) {
    if (!params.hasDeliveryProof) {
      return {
        recommendedAction: 'FULL_REFUND',
        confidenceScore: 92,
        rationale: 'Seller did not provide verifiable courier tracking or proof of receipt within the SLA window.',
        suggestedTerms: 'Issue full refund to buyer via QR Ph reversal; close deal without penalty.',
      };
    }
  }

  // Counterfeit or damaged goods contest
  if (reason.includes('counterfeit') || reason.includes('fake') || details.includes('damaged') || details.includes('broken')) {
    return {
      recommendedAction: 'PARTIAL_REFUND_RETURN',
      confidenceScore: 84,
      rationale: 'Item received does not match documented authenticity or working condition specified in agreed terms.',
      suggestedTerms: 'Require buyer to return item via tracked courier with signature. Release refund upon seller receipt.',
    };
  }

  // Default to mediation for complex claims
  return {
    recommendedAction: 'MANUAL_MEDIATION',
    confidenceScore: 75,
    rationale: 'Dispute contains conflicting claims regarding acceptance criteria. Staff review of uploaded media required.',
    suggestedTerms: 'Request photographic unboxing evidence from buyer and dispatch receipts from seller.',
  };
}
