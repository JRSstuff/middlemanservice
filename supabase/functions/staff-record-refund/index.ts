// supabase/functions/staff-record-refund/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const refundSchema = z.object({
  dealId: z.string().uuid(),
  refundReference: z.string().min(4),
  reason: z.string().min(5),
  proofFilePath: z.string().optional(),
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Staff access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { dealId, refundReference, reason, proofFilePath } = refundSchema.parse(body);

    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (!deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('payments').insert({
      deal_id: dealId,
      direction: 'refund',
      amount_centavos: deal.price_amount,
      currency: deal.price_currency,
      reference_number: refundReference.trim().toUpperCase(),
      proof_path: proofFilePath || null,
      status: 'completed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    });

    await supabaseAdmin.rpc('transition_deal', {
      p_deal_id: dealId,
      p_target_status: 'REFUNDED',
      p_action: 'Staff Issued Manual Escrow Refund to Buyer',
      p_note: `Reason: ${reason}. Ref: ${refundReference.trim().toUpperCase()}`,
      p_metadata: { staffId: user.id, refundReference, reason },
    });

    await supabaseAdmin.from('staff_actions').insert({
      staff_id: user.id,
      action: 'EXECUTE_REFUND',
      target_deal_id: dealId,
      metadata: { refundReference, reason },
    });

    return new Response(
      JSON.stringify({ success: true, status: 'REFUNDED' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
