// supabase/functions/staff-review-payment/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const reviewSchema = z.object({
  dealId: z.string().uuid(),
  decision: z.enum(['verify', 'reject']),
  reason: z.string().optional(),
  bankReference: z.string().optional(),
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

    // Verify staff role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Only staff can review payments' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { dealId, decision, reason, bankReference } = reviewSchema.parse(body);

    if (decision === 'reject' && (!reason || reason.trim().length < 5)) {
      return new Response(JSON.stringify({ error: 'Rejection reason is required (min 5 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (decision === 'verify') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'verified',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('deal_id', dealId)
        .eq('direction', 'in');

      await supabaseAdmin.rpc('transition_deal', {
        p_deal_id: dealId,
        p_target_status: 'HELD',
        p_action: 'Staff Verified QR Ph Deposit & Protected Funds',
        p_note: `Verified by staff #${user.id.slice(0, 8)}. Ref: ${bankReference || 'Confirmed'}`,
        p_metadata: { staffId: user.id, bankReference },
      });

      await supabaseAdmin.from('staff_actions').insert({
        staff_id: user.id,
        action: 'VERIFY_PAYMENT',
        target_deal_id: dealId,
        metadata: { bankReference },
      });
    } else {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reject_reason: reason,
        })
        .eq('deal_id', dealId)
        .eq('direction', 'in');

      await supabaseAdmin.rpc('transition_deal', {
        p_deal_id: dealId,
        p_target_status: 'PAYMENT_REJECTED',
        p_action: 'Staff Rejected Payment Receipt',
        p_note: reason,
        p_metadata: { staffId: user.id, reason },
      });

      await supabaseAdmin.from('staff_actions').insert({
        staff_id: user.id,
        action: 'REJECT_PAYMENT',
        target_deal_id: dealId,
        metadata: { reason },
      });
    }

    return new Response(JSON.stringify({ success: true, decision }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
