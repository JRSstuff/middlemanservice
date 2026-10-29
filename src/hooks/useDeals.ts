import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Database, DealStatus } from '@/types/database';

export type DealRow = Database['public']['Tables']['deals']['Row'];

export interface DealWithParticipants extends DealRow {
  buyer?: { display_name: string; email: string };
  seller?: { display_name: string; email: string };
}

// Fallback seed deals for instant laptop / offline dev flow
export const FALLBACK_DEALS: DealWithParticipants[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    buyer_id: '00000000-0000-0000-0000-000000000001',
    seller_id: '00000000-0000-0000-0000-000000000002',
    title: 'MacBook Pro M3 Max 16-inch 36GB',
    description: 'Space Black, pristine condition, original charger and box included.',
    terms: 'Buyer inspects device within 48 hours of courier delivery. Battery cycle count <= 25.',
    status: 'HELD',
    price_amount: 17500000,
    price_currency: 'PHP',
    service_fee_amount: 525000,
    payment_provider_ref: 'mock_pay_sess_held_001',
    payment_session_id: 'sess_mock_001',
    expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    delivered_at: null,
    confirmed_at: null,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    buyer: { display_name: 'Buyer Alex', email: 'buyer@safeswap.dev' },
    seller: { display_name: 'Seller Maria', email: 'seller@safeswap.dev' },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    buyer_id: '00000000-0000-0000-0000-000000000001',
    seller_id: '00000000-0000-0000-0000-000000000002',
    title: 'Rolex Submariner Date 126610LN',
    description: 'Full set 2024 with box and warranty card from authorized dealer.',
    terms: 'Physical inspection at watchmaker required prior to confirmation.',
    status: 'DELIVERED',
    price_amount: 72000000,
    price_currency: 'PHP',
    service_fee_amount: 1440000,
    payment_provider_ref: 'mock_pay_sess_deliv_002',
    payment_session_id: 'sess_mock_002',
    expires_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    delivered_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    confirmed_at: null,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    buyer: { display_name: 'Buyer Alex', email: 'buyer@safeswap.dev' },
    seller: { display_name: 'Seller Maria', email: 'seller@safeswap.dev' },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    buyer_id: '00000000-0000-0000-0000-000000000001',
    seller_id: '00000000-0000-0000-0000-000000000002',
    title: 'Custom Web Application Development (Milestone 1)',
    description: 'Frontend architecture and prototype design system deliverables.',
    terms: 'Source code delivered via private GitHub repository with full test coverage.',
    status: 'CREATED',
    price_amount: 5000000,
    price_currency: 'PHP',
    service_fee_amount: 150000,
    payment_provider_ref: null,
    payment_session_id: null,
    expires_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    delivered_at: null,
    confirmed_at: null,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    buyer: { display_name: 'Buyer Alex', email: 'buyer@safeswap.dev' },
    seller: { display_name: 'Seller Maria', email: 'seller@safeswap.dev' },
  },
];

export function useDeals(filter?: 'all' | 'active' | 'completed' | 'disputed') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deals', user?.id, filter],
    queryFn: async (): Promise<DealWithParticipants[]> => {
      try {
        if (!user) {
          // Provide instant local seed deals if guest/preview
          return filterDeals(FALLBACK_DEALS, filter);
        }

        const { data, error } = await supabase
          .from('deals')
          .select(`
            *,
            buyer:profiles!deals_buyer_id_fkey(display_name, email),
            seller:profiles!deals_seller_id_fkey(display_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          return filterDeals(FALLBACK_DEALS, filter);
        }

        return filterDeals(data as any, filter);
      } catch {
        return filterDeals(FALLBACK_DEALS, filter);
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

function filterDeals(deals: DealWithParticipants[], filter?: string): DealWithParticipants[] {
  if (!filter || filter === 'all') return deals;
  if (filter === 'active') {
    return deals.filter((d) => ['CREATED', 'FUNDED', 'HELD', 'DELIVERED'].includes(d.status));
  }
  if (filter === 'completed') {
    return deals.filter((d) => ['CONFIRMED', 'CANCELLED', 'REFUNDED'].includes(d.status));
  }
  if (filter === 'disputed') {
    return deals.filter((d) => d.status === 'DISPUTED');
  }
  return deals;
}
