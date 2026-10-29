import React, { useState } from 'react';
import { Card, Badge, EmptyState, Button } from '@/components/ui';
import { Bell, CheckCircle, Package, ShieldCheck } from '@phosphor-icons/react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  time: string;
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'STATUS_CHANGE',
      title: 'Payment Protected',
      body: '₱175,000.00 has been verified and placed in secure escrow for MacBook Pro M3.',
      read: false,
      time: '15m ago',
    },
    {
      id: '2',
      type: 'DELIVERY',
      title: 'Item Delivered',
      body: 'Seller Maria uploaded Air21 tracking receipt #AR-99321 for Rolex Submariner.',
      read: false,
      time: '2h ago',
    },
    {
      id: '3',
      type: 'STATUS_CHANGE',
      title: 'Deal Created',
      body: 'Milestone 1 contract terms submitted for review.',
      read: true,
      time: '1d ago',
    },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Notifications</h1>
          <p className="text-sm text-ink-muted">Transaction updates and escrow release alerts.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={markAllRead}>
          Mark all as read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Bell size={48} />}
            title="All caught up"
            description="You will be notified here whenever your transaction status changes."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              padding="md"
              className={n.read ? 'bg-white opacity-80' : 'bg-white border-green border-2'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-ink">{n.title}</h3>
                    {!n.read && <Badge variant="success" size="sm">New</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">{n.body}</p>
                </div>
                <span className="text-[11px] font-mono text-ink-light shrink-0">{n.time}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
