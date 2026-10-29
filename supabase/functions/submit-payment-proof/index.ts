// supabase/functions/submit-payment-proof/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const payloadSchema = z.object({
  dealId: z.string().uuid(),
  referenceNumber: z.string().min(4).max(64),
  proofFilePath: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { dealId, referenceNumber, proofFilePath, idempotencyKey } = payloadSchema.parse(body);

    // Fetch deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is buyer
    if (deal.buyer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the buyer can submit payment proof' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check idempotency
    const { data: existingEvent } = await supabaseAdmin
      .from('payment_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingEvent) {
      return new Response(JSON.stringify({ message: 'Already processed', status: 'PAYMENT_SUBMITTED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalExpectedCentavos = deal.price_amount + deal.service_fee_amount;

    // Check duplicate reference number
    const { data: duplicateRef } = await supabaseAdmin
      .from('payments')
      .select('id, deal_id')
      .eq('direction', 'in')
      .eq('reference_number', referenceNumber.trim().toUpperCase())
      .maybeSingle();

    if (duplicateRef) {
      return new Response(
        JSON.stringify({
          error: `Bank reference "${referenceNumber}" has already been used in another transaction. Duplicate references are rejected.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert payment record
    const paymentId = crypto.randomUUID();
    await supabaseAdmin.from('payments').insert({
      id: paymentId,
      deal_id: dealId,
      direction: 'in',
      amount_centavos: totalExpectedCentavos,
      currency: deal.price_currency,
      reference_number: referenceNumber.trim().toUpperCase(),
      proof_path: proofFilePath || null,
      status: 'submitted',
      submitted_by: user.id,
    });

    // Log idempotency event
    await supabaseAdmin.from('payment_events').insert({
      deal_id: dealId,
      idempotency_key: idempotencyKey,
      event_type: 'PAYMENT_SUBMITTED',
      actor_id: user.id,
      payload: { referenceNumber, totalExpectedCentavos },
    });

    // Execute state transition to PAYMENT_SUBMITTED
    await supabaseAdmin.rpc('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'PAYMENT_SUBMITTED',
      p_action: 'Buyer Submitted Payment Receipt',
      p_note: `Reference: ${referenceNumber.trim().toUpperCase()}`,
      p_metadata: { paymentId, referenceNumber },
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        status: 'PAYMENT_SUBMITTED',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
