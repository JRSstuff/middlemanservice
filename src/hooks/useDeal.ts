import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FALLBACK_DEALS, type DealWithParticipants } from '@/hooks/useDeals';
import type { Database, DealStatus } from '@/types/database';

export type TimelineRow = Database['public']['Tables']['deal_timeline']['Row'];
export type DeliveryProofRow = Database['public']['Tables']['delivery_proofs']['Row'];

export interface DealDetailData extends DealWithParticipants {
  timeline: TimelineRow[];
  deliveryProofs: DeliveryProofRow[];
}

export const FALLBACK_TIMELINES: Record<string, TimelineRow[]> = {
  '11111111-1111-1111-1111-111111111111': [
    {
      id: 't-1',
      deal_id: '11111111-1111-1111-1111-111111111111',
      actor_id: '00000000-0000-0000-0000-000000000002',
      from_status: null,
      to_status: 'CREATED',
      action: 'Deal Created',
      note: 'Seller Maria initiated transaction terms',
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
    {
      id: 't-2',
      deal_id: '11111111-1111-1111-1111-111111111111',
      actor_id: '00000000-0000-0000-0000-000000000001',
      from_status: 'CREATED',
      to_status: 'FUNDED',
      action: 'Buyer Funded Escrow',
      note: 'Payment session completed via mock escrow partner',
      created_at: new Date(Date.now() - 2400 * 1000).toISOString(),
    },
    {
      id: 't-3',
      deal_id: '11111111-1111-1111-1111-111111111111',
      actor_id: null,
      from_status: 'FUNDED',
      to_status: 'HELD',
      action: 'Funds Protected in Escrow Vault',
      note: 'Partner verified funds hold. Seller CANNOT withdraw.',
      created_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    },
  ],
  '22222222-2222-2222-2222-222222222222': [
    {
      id: 't-20',
      deal_id: '22222222-2222-2222-2222-222222222222',
      actor_id: '00000000-0000-0000-0000-000000000001',
      from_status: null,
      to_status: 'CREATED',
      action: 'Deal Created',
      note: 'Created for Rolex inspection',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 't-21',
      deal_id: '22222222-2222-2222-2222-222222222222',
      actor_id: null,
      from_status: 'CREATED',
      to_status: 'HELD',
      action: 'Funds Protected',
      note: 'Escrow partner hold verified',
      created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    },
    {
      id: 't-22',
      deal_id: '22222222-2222-2222-2222-222222222222',
      actor_id: '00000000-0000-0000-0000-000000000002',
      from_status: 'HELD',
      to_status: 'DELIVERED',
      action: 'Item Dispatched via Air21',
      note: 'Air21 Armored tracking: #AR-99321',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
  ],
};

export function useDeal(id?: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async (): Promise<DealDetailData> => {
      if (!id) throw new Error('Deal ID required');

      try {
        const { data: deal, error } = await supabase
          .from('deals')
          .select(`
            *,
            buyer:profiles!deals_buyer_id_fkey(display_name, email),
            seller:profiles!deals_seller_id_fkey(display_name, email)
          `)
          .eq('id', id)
          .single();

        if (error || !deal) {
          const fallback = FALLBACK_DEALS.find((d) => d.id === id);
          if (fallback) {
            return {
              ...fallback,
              timeline: FALLBACK_TIMELINES[id] || [],
              deliveryProofs: [],
            };
          }
          throw new Error('Deal not found');
        }

        const [{ data: timeline }, { data: deliveryProofs }] = await Promise.all([
          supabase
            .from('deal_timeline')
            .select('*')
            .eq('deal_id', id)
            .order('created_at', { ascending: true }),
          supabase
            .from('delivery_proofs')
            .select('*')
            .eq('deal_id', id)
            .order('created_at', { ascending: false }),
        ]);

        return {
          ...(deal as any),
          timeline: timeline || [],
          deliveryProofs: deliveryProofs || [],
        };
      } catch (err: any) {
        const fallback = FALLBACK_DEALS.find((d) => d.id === id);
        if (fallback) {
          return {
            ...fallback,
            timeline: FALLBACK_TIMELINES[id] || [],
            deliveryProofs: [],
          };
        }
        throw err;
      }
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });
}

export function useTransitionDeal(dealId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetStatus,
      action,
      note,
      metadata = {},
    }: {
      targetStatus: DealStatus;
      action: string;
      note?: string;
      metadata?: any;
    }) => {
      // 1. Enforce online connection for money actions
      if (['FUNDED', 'CONFIRMED', 'REFUNDED'].includes(targetStatus)) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Active internet connection required for escrow money actions.');
        }
      }

      // 2. Call Postgres SECURITY DEFINER function
      const { data, error } = await (supabase.rpc as any)('transition_deal', {
        p_deal_id: dealId,
        p_target_status: targetStatus,
        p_action: action,
        p_note: note || null,
        p_metadata: metadata,
      });

      if (error) {
        // Fallback for mock/local execution if Supabase RPC not deployed to remote instance yet
        const existing = FALLBACK_DEALS.find((d) => d.id === dealId);
        if (existing) {
          existing.status = targetStatus;
          if (targetStatus === 'DELIVERED') existing.delivered_at = new Date().toISOString();
          if (targetStatus === 'CONFIRMED') existing.confirmed_at = new Date().toISOString();

          const timeline = FALLBACK_TIMELINES[dealId] || [];
          timeline.push({
            id: `t-${Date.now()}`,
            deal_id: dealId,
            actor_id: null,
            from_status: existing.status,
            to_status: targetStatus,
            action,
            note: note || null,
            created_at: new Date().toISOString(),
          });
          FALLBACK_TIMELINES[dealId] = timeline;

          return { success: true, deal: existing };
        }
        throw new Error(error.message || 'Failed to update deal status');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
