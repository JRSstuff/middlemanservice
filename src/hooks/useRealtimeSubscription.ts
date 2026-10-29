import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useRealtimeSubscription(dealId?: string) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDataRefresh = useCallback(() => {
    if (dealId) {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
    }
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    setLastEventTime(new Date().toISOString());
  }, [dealId, queryClient]);

  useEffect(() => {
    let channel = supabase.channel(`deal-realtime-${dealId || 'global'}`);

    const setupChannel = () => {
      // 1. Deals table listener
      let dealsFilter = dealId ? `id=eq.${dealId}` : undefined;
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: dealsFilter,
        },
        () => {
          handleDataRefresh();
        }
      );

      // 2. Timeline table listener
      let timelineFilter = dealId ? `deal_id=eq.${dealId}` : undefined;
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_timeline',
          filter: timelineFilter,
        },
        () => {
          handleDataRefresh();
        }
      );

      // 3. Payments table listener
      let paymentsFilter = dealId ? `deal_id=eq.${dealId}` : undefined;
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: paymentsFilter,
        },
        () => {
          handleDataRefresh();
        }
      );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsReconnecting(false);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsReconnecting(true);
          // Exponential backoff reconnect
          if (!retryTimeoutRef.current) {
            retryTimeoutRef.current = setTimeout(() => {
              retryTimeoutRef.current = null;
              supabase.removeChannel(channel);
              channel = supabase.channel(`deal-realtime-${dealId || 'global'}`);
              setupChannel();
            }, 5000);
          }
        }
      });
    };

    setupChannel();

    // 4. Fallback polling every 15s to guarantee fresh state across any network hiccups
    const pollingInterval = setInterval(() => {
      handleDataRefresh();
    }, 15000);

    return () => {
      clearInterval(pollingInterval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [dealId, isStaff, handleDataRefresh]);

  return {
    isReconnecting,
    lastEventTime,
    refreshNow: handleDataRefresh,
  };
}
