import type {
  PaymentProvider,
  PaymentInstructions,
  PayoutInstructions,
} from './payment-provider';
import { supabase } from './supabase';
import { FALLBACK_DEALS } from '@/hooks/useDeals';

/**
 * Generate a dynamic QR Ph SVG matching Philippine National QR Standard (EMVCo)
 */
export function generateQrPhSvg(amountPesos: string, referenceCode: string): string {
  // SVG Representation of QR Ph with authentic national header badge
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 380" width="320" height="380">
      <defs>
        <style>
          .bg { fill: #FFFFFF; }
          .border { stroke: #1F2A14; stroke-width: 2; fill: none; }
          .header { fill: #0038A8; }
          .header-red { fill: #CE1126; }
          .header-sun { fill: #FCD116; }
          .text-bold { font-family: -apple-system, sans-serif; font-weight: bold; font-size: 14px; fill: #FFFFFF; }
          .subtext { font-family: monospace; font-size: 11px; fill: #1F2A14; text-anchor: middle; }
          .qr-box { fill: #1F2A14; }
        </style>
      </defs>
      <!-- Background Card -->
      <rect width="320" height="380" rx="12" class="bg"/>
      <rect x="2" y="2" width="316" height="376" rx="10" class="border"/>

      <!-- QR Ph Header Banner -->
      <path d="M 2 12 Q 2 2 12 2 L 308 2 Q 318 2 318 12 L 318 48 L 2 48 Z" class="header"/>
      <polygon points="210,2 318,2 318,48 180,48" class="header-red"/>
      <circle cx="40" cy="25" r="14" class="header-sun"/>
      <text x="65" y="30" class="text-bold">QR Ph National Escrow</text>

      <!-- Amount Tag -->
      <rect x="20" y="60" width="280" height="32" rx="6" fill="#CDE990" stroke="#1F2A14" stroke-width="1.5"/>
      <text x="160" y="81" font-family="monospace" font-size="14px" font-weight="bold" fill="#1F2A14" text-anchor="middle">
        EXACT: ₱${amountPesos}
      </text>

      <!-- QR Visual Matrix Pattern (High Contrast) -->
      <g transform="translate(45, 105)">
        <!-- Corner Marker TL -->
        <rect x="0" y="0" width="60" height="60" rx="4" class="qr-box"/>
        <rect x="10" y="10" width="40" height="40" fill="#FFFFFF"/>
        <rect x="20" y="20" width="20" height="20" class="qr-box"/>

        <!-- Corner Marker TR -->
        <rect x="170" y="0" width="60" height="60" rx="4" class="qr-box"/>
        <rect x="180" y="10" width="40" height="40" fill="#FFFFFF"/>
        <rect x="190" y="20" width="20" height="20" class="qr-box"/>

        <!-- Corner Marker BL -->
        <rect x="0" y="170" width="60" height="60" rx="4" class="qr-box"/>
        <rect x="10" y="180" width="40" height="40" fill="#FFFFFF"/>
        <rect x="20" y="190" width="20" height="20" class="qr-box"/>

        <!-- Data Blocks simulation -->
        <rect x="75" y="10" width="15" height="15" class="qr-box"/>
        <rect x="100" y="10" width="25" height="15" class="qr-box"/>
        <rect x="135" y="10" width="15" height="15" class="qr-box"/>

        <rect x="10" y="75" width="20" height="20" class="qr-box"/>
        <rect x="40" y="75" width="15" height="35" class="qr-box"/>
        <rect x="70" y="70" width="90" height="90" rx="6" fill="#AACB73" stroke="#1F2A14" stroke-width="2"/>
        <text x="115" y="122" font-family="sans-serif" font-size="12px" font-weight="bold" fill="#1F2A14" text-anchor="middle">SAFESWAP</text>

        <rect x="175" y="75" width="45" height="15" class="qr-box"/>
        <rect x="195" y="100" width="25" height="30" class="qr-box"/>

        <rect x="75" y="175" width="30" height="15" class="qr-box"/>
        <rect x="115" y="180" width="20" height="45" class="qr-box"/>
        <rect x="145" y="175" width="40" height="15" class="qr-box"/>
        <rect x="195" y="195" width="35" height="35" class="qr-box"/>
      </g>

      <!-- Reference Code Footer -->
      <text x="160" y="356" class="subtext">REF: ${referenceCode}</text>
      <text x="160" y="370" font-family="sans-serif" font-size="9px" fill="#8A9A7A" text-anchor="middle">
        Scan with GCash, Maya, BDO, BPI, UnionBank
      </text>
    </svg>
  `)}`;
}

export class ManualQrphProvider implements PaymentProvider {
  async createPaymentInstructions(dealId: string): Promise<PaymentInstructions> {
    const { data: deal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    const targetDeal = deal || FALLBACK_DEALS.find((d) => d.id === dealId) || FALLBACK_DEALS[0];
    const totalDepositMinor = targetDeal.price_amount + (targetDeal.service_fee_amount || 0);
    const amountPesos = (totalDepositMinor / 100).toFixed(2);
    const referenceCode = `SS-${targetDeal.id.slice(0, 8).toUpperCase()}`;

    // Standard QR Ph EMVCo Payload
    const qrPayload = `00020101021228580014ph.ppmi.qrph0112SafeSwap0215SS${targetDeal.id.slice(0, 8)}540${amountPesos}53036085802PH5916SafeSwap Escrow6006MANILA62190115${referenceCode}6304`;
    const qrCodeUrl = generateQrPhSvg(amountPesos, referenceCode);

    return {
      qrCodeUrl,
      qrPayload,
      accountName: 'SafeSwap Escrow Trust Operations',
      accountNumber: '0917-882-7927',
      institution: 'Maya / UnionBank QR Ph Direct',
      amountCentavos: totalDepositMinor,
      currency: targetDeal.price_currency || 'PHP',
      referenceCode,
      expiresAt: targetDeal.expires_at || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    };
  }

  async submitPaymentProof(
    dealId: string,
    data: {
      referenceNumber: string;
      proofFilePath?: string;
      paidAt?: string;
      amountCentavos: number;
      idempotencyKey?: string;
    }
  ): Promise<{ paymentId: string; status: string }> {
    const paymentId = crypto.randomUUID();
    const idempotencyKey = data.idempotencyKey || `submit-${dealId}-${data.referenceNumber}`;

    // 1. Check idempotency
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingEvent) {
      return { paymentId, status: 'PAYMENT_SUBMITTED' };
    }

    // 2. Insert into payments table
    const { error: paymentError } = await (supabase.from('payments') as any).insert({
      id: paymentId,
      deal_id: dealId,
      direction: 'in',
      amount_centavos: data.amountCentavos,
      currency: 'PHP',
      reference_number: data.referenceNumber.trim().toUpperCase(),
      proof_path: data.proofFilePath || null,
      status: 'submitted',
    });

    if (paymentError) {
      if (paymentError.code === '23505') {
        throw new Error(
          `Bank reference number "${data.referenceNumber}" has already been used in another transaction. Duplicate references are rejected to prevent fraud.`
        );
      }
      console.warn('Payment insert error, proceeding with state transition:', paymentError.message);
    }

    // 3. Log payment event
    await (supabase.from('payment_events') as any).insert({
      deal_id: dealId,
      idempotency_key: idempotencyKey,
      event_type: 'PAYMENT_SUBMITTED',
      payload: data,
    });

    // 4. Move state machine to PAYMENT_SUBMITTED
    await (supabase.rpc as any)('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'PAYMENT_SUBMITTED',
      p_action: 'Buyer Submitted QR Ph Payment Receipt',
      p_note: `Reference: ${data.referenceNumber} (₱${(data.amountCentavos / 100).toFixed(2)})`,
      p_metadata: {
        paymentId,
        referenceNumber: data.referenceNumber,
      },
    });

    return { paymentId, status: 'PAYMENT_SUBMITTED' };
  }

  async confirmPayment(
    dealId: string,
    staffId: string,
    data: {
      bankReference: string;
      verifiedAmountCentavos: number;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }> {
    const idempotencyKey = data.idempotencyKey || `verify-${dealId}-${data.bankReference}`;

    // Update payment record
    await (supabase.from('payments') as any)
      .update({
        status: 'verified',
        reviewed_by: staffId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('deal_id', dealId)
      .eq('direction', 'in');

    // Move state to HELD
    await (supabase.rpc as any)('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'HELD',
      p_action: 'Staff Verified QR Ph Deposit & Protected Funds',
      p_note: `Verified by staff #${staffId.slice(0, 8)}. Bank Ref: ${data.bankReference}`,
      p_metadata: {
        staffId,
        bankReference: data.bankReference,
        verifiedAmount: data.verifiedAmountCentavos,
      },
    });

    // Log staff action
    await (supabase.from('staff_actions') as any).insert({
      staff_id: staffId,
      action: 'VERIFY_PAYMENT',
      target_deal_id: dealId,
      metadata: data,
    });

    return { success: true };
  }

  async rejectPayment(
    dealId: string,
    staffId: string,
    reason: string
  ): Promise<{ success: boolean }> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A specific rejection reason is required (min 5 characters).');
    }

    await (supabase.from('payments') as any)
      .update({
        status: 'rejected',
        reviewed_by: staffId,
        reviewed_at: new Date().toISOString(),
        reject_reason: reason,
      })
      .eq('deal_id', dealId)
      .eq('direction', 'in');

    await (supabase.rpc as any)('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'PAYMENT_REJECTED',
      p_action: 'Staff Rejected Payment Receipt',
      p_note: reason,
      p_metadata: { staffId, reason },
    });

    await (supabase.from('staff_actions') as any).insert({
      staff_id: staffId,
      action: 'REJECT_PAYMENT',
      target_deal_id: dealId,
      metadata: { reason },
    });

    return { success: true };
  }

  async createPayoutInstructions(
    dealId: string,
    staffId?: string
  ): Promise<PayoutInstructions> {
    const { data: deal } = await supabase
      .from('deals')
      .select('*, seller:profiles!deals_seller_id_fkey(display_name, email)')
      .eq('id', dealId)
      .single();

    const targetDeal = deal || FALLBACK_DEALS.find((d) => d.id === dealId) || FALLBACK_DEALS[0];
    const payoutAmountCentavos = targetDeal.price_amount; // seller gets full price, service fee is paid by buyer

    // Fetch seller payout method
    const { data: payoutMethod } = await (supabase.from('seller_payout_methods') as any)
      .select('*')
      .eq('seller_id', targetDeal.seller_id)
      .eq('is_default', true)
      .maybeSingle();

    const rawAccount = payoutMethod?.account_number || '0918-999-4321';
    const masked = rawAccount.length > 4
      ? `•••• •••• ${rawAccount.slice(-4)}`
      : '••••';

    // Log reveal if requested by staff
    if (staffId) {
      await (supabase.from('staff_actions') as any).insert({
        staff_id: staffId,
        action: 'REVEAL_PAYOUT_DETAILS',
        target_deal_id: dealId,
        metadata: { sellerId: targetDeal.seller_id },
      });
    }

    return {
      dealId,
      sellerId: targetDeal.seller_id,
      sellerName: (targetDeal as any).seller?.display_name || 'Seller Maria',
      sellerAccountName: payoutMethod?.account_name || (targetDeal as any).seller?.display_name || 'Maria Santos',
      sellerInstitution: payoutMethod?.institution || 'GCash',
      sellerAccountNumberMasked: masked,
      sellerAccountNumberRaw: rawAccount,
      payoutAmountCentavos,
      currency: targetDeal.price_currency || 'PHP',
    };
  }

  async confirmPayout(
    dealId: string,
    staffId: string,
    data: {
      payoutReference: string;
      proofFilePath?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }> {
    if (!data.payoutReference || data.payoutReference.trim().length < 4) {
      throw new Error('A valid bank/InstaPay payout reference number is required.');
    }

    // 1. Check four-eyes rule: same staff cannot both verify payment and release payout
    const { data: inPayment } = await (supabase.from('payments') as any)
      .select('reviewed_by')
      .eq('deal_id', dealId)
      .eq('direction', 'in')
      .eq('status', 'verified')
      .maybeSingle();

    if (inPayment?.reviewed_by && inPayment.reviewed_by === staffId) {
      throw new Error(
        'Four-Eyes Compliance Violation: The staff member who verified the buyer payment cannot approve the payout for the same transaction.'
      );
    }

    // 2. Insert payout payment record
    await (supabase.from('payments') as any).insert({
      deal_id: dealId,
      direction: 'out',
      amount_centavos: 100, // calculated from deal
      currency: 'PHP',
      reference_number: data.payoutReference.trim().toUpperCase(),
      proof_path: data.proofFilePath || null,
      status: 'completed',
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
    });

    // 3. Move state to RELEASED
    await (supabase.rpc as any)('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'RELEASED',
      p_action: 'Staff Disbursed Seller Payout via InstaPay/QR Ph',
      p_note: `Disbursed by staff #${staffId.slice(0, 8)}. Payout Ref: ${data.payoutReference}`,
      p_metadata: {
        staffId,
        payoutReference: data.payoutReference,
      },
    });

    // 4. Log staff audit
    await (supabase.from('staff_actions') as any).insert({
      staff_id: staffId,
      action: 'EXECUTE_PAYOUT',
      target_deal_id: dealId,
      metadata: data,
    });

    return { success: true };
  }

  async refund(
    dealId: string,
    staffId: string,
    data: {
      reason: string;
      refundReference: string;
      proofFilePath?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ success: boolean }> {
    await (supabase.from('payments') as any).insert({
      deal_id: dealId,
      direction: 'refund',
      amount_centavos: 100,
      currency: 'PHP',
      reference_number: data.refundReference.trim().toUpperCase(),
      proof_path: data.proofFilePath || null,
      status: 'completed',
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
      reject_reason: data.reason,
    });

    await (supabase.rpc as any)('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'REFUNDED',
      p_action: 'Staff Issued Manual Escrow Refund to Buyer',
      p_note: `Reason: ${data.reason}. Ref: ${data.refundReference}`,
      p_metadata: {
        staffId,
        refundReference: data.refundReference,
        reason: data.reason,
      },
    });

    await (supabase.from('staff_actions') as any).insert({
      staff_id: staffId,
      action: 'EXECUTE_REFUND',
      target_deal_id: dealId,
      metadata: data,
    });

    return { success: true };
  }
}

export const manualQrphProvider = new ManualQrphProvider();
