import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button, Card, Badge, EmptyState, Skeleton } from '@/components/ui';
import { STATUS_META } from '@/lib/state-machine';
import type { DealStatus } from '@/types/database';
import {
  Handshake,
  Plus,
  ShieldCheck,
  CaretRight,
  Clock,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';

interface MockDealDisplay {
  id: string;
  title: string;
  counterparty: string;
  myRole: 'Buyer' | 'Seller';
  status: DealStatus;
  amount: number;
  currency: string;
  updatedAt: string;
}

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'disputed'>('all');

  // Initial mock/cached deals for demonstration
  const [deals] = useState<MockDealDisplay[]>([
    {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'MacBook Pro M3 Max 16-inch 36GB',
      counterparty: 'Seller Maria',
      myRole: 'Buyer',
      status: 'HELD',
      amount: 17500000,
      currency: 'PHP',
      updatedAt: '10 mins ago',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Rolex Submariner Date 126610LN',
      counterparty: 'Seller Maria',
      myRole: 'Buyer',
      status: 'DELIVERED',
      amount: 72000000,
      currency: 'PHP',
      updatedAt: '2 hours ago',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Custom Web Application Development (Milestone 1)',
      counterparty: 'Buyer Alex',
      myRole: 'Seller',
      status: 'CREATED',
      amount: 5000000,
      currency: 'PHP',
      updatedAt: '1 day ago',
    },
  ]);

  const filteredDeals = deals.filter((d) => {
    if (filter === 'active') return ['CREATED', 'FUNDED', 'HELD', 'DELIVERED'].includes(d.status);
    if (filter === 'completed') return ['CONFIRMED', 'CANCELLED', 'REFUNDED'].includes(d.status);
    if (filter === 'disputed') return d.status === 'DISPUTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
            Escrow Dashboard
          </h1>
          <p className="text-sm text-ink-muted">
            Track transactions, verify escrow status, and release funds securely.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<Plus size={16} weight="bold" />}
            onClick={() => navigate('/deals/new')}
          >
            Create Deal
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-1 overflow-x-auto">
        {(['all', 'active', 'completed', 'disputed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
              filter === tab
                ? 'bg-ink text-white'
                : 'text-ink-muted hover:text-ink hover:bg-hover'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Deals List */}
      {filteredDeals.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Handshake size={48} />}
            title="No deals found"
            description="Create your first middleman transaction to buy or sell with confidence."
            action={
              <Button variant="primary" onClick={() => navigate('/deals/new')}>
                Start SafeSwap Deal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => {
            const meta = STATUS_META[deal.status];
            return (
              <Link
                key={deal.id}
                to={`/deals/${deal.id}`}
                className="block focus-ring rounded-md"
              >
                <Card
                  padding="md"
                  className="hover:border-ink transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-medium text-ink-light">
                          {deal.myRole.toUpperCase()}
                        </span>
                        <span className="text-xs text-ink-muted">•</span>
                        <span className="text-xs text-ink-muted">{deal.counterparty}</span>
                        <Badge variant={meta.badgeVariant} size="sm" dot>
                          {meta.label}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-base text-ink line-clamp-1">
                        {deal.title}
                      </h3>
                      <p className="text-xs text-ink-light">Updated {deal.updatedAt}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-ink-muted">Escrow Amount</p>
                        <p className="font-mono font-bold text-base text-ink font-tabular">
                          ₱{(deal.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <CaretRight size={20} className="text-ink-muted" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
