import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDeal, useTransitionDeal } from '@/hooks/useDeal';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  Card,
  Badge,
  Button,
  Timeline,
  Skeleton,
  ErrorState,
  showToast,
} from '@/components/ui';
import { DeliveryProofForm } from '@/components/deal/DeliveryProofForm';
import { ConfirmReceiptDialog } from '@/components/deal/ConfirmReceiptDialog';
import { STATUS_META, canTransition } from '@/lib/state-machine';
import { formatMoney, formatDate, truncateId } from '@/lib/format';
import {
  ShieldCheck,
  Package,
  CheckCircle,
  Handshake,
  WarningCircle,
  CurrencyCircleDollar,
  Truck,
  ArrowSquareOut,
  XCircle,
} from '@phosphor-icons/react';

export const DealDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { data: deal, isLoading, error, refetch } = useDeal(id);
  const transitionMutation = useTransitionDeal(id || '');

  const [deliveryDrawerOpen, setDeliveryDrawerOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton height="32px" width="40%" />
          <Skeleton height="32px" width="20%" />
        </div>
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState
          title="Deal Not Found"
          description="Unable to load transaction details. The deal may have expired or you may need to sign in."
          onRetry={() => refetch()}
          onGoHome={() => navigate('/')}
        />
      </div>
    );
  }

  const statusMeta = STATUS_META[deal.status];

  // Determine user's role in this deal
  const isBuyer = user?.id ? user.id === deal.buyer_id : true; // default to buyer in preview mode
  const isSeller = user?.id ? user.id === deal.seller_id : false;
  const currentRole: 'buyer' | 'seller' | 'admin' | 'system' = isSeller ? 'seller' : 'buyer';

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this deal? This action cannot be undone.')) {
      return;
    }
    try {
      await transitionMutation.mutateAsync({
        targetStatus: 'CANCELLED',
        action: 'Deal Cancelled by Participant',
        note: 'Cancelled prior to escrow funding.',
      });
      showToast.info('Deal Cancelled', 'The transaction has been cancelled.');
    } catch (err: any) {
      showToast.error('Cancellation Failed', err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="text-xs text-ink-muted hover:text-ink">
              Dashboard
            </Link>
            <span className="text-xs text-ink-light">/</span>
            <span className="text-xs font-mono font-medium text-ink">
              {truncateId(deal.id)}
            </span>
            <Badge variant={statusMeta.badgeVariant} size="sm" dot>
              {statusMeta.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
            {deal.title}
          </h1>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <p className="text-xs text-ink-muted">Escrow Amount</p>
          <p className="font-mono font-bold text-2xl text-ink font-tabular">
            {formatMoney(deal.price_amount, deal.price_currency)}
          </p>
        </div>
      </div>

      {/* Escrow Partner Protection Badge Callout */}
      {deal.status === 'HELD' && (
        <div className="p-4 bg-lime border border-ink/20 rounded-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-green rounded text-ink">
              <ShieldCheck size={24} weight="duotone" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Funds Protected in Regulated Escrow</p>
              <p className="text-xs text-ink-muted">
                {formatMoney(deal.price_amount, deal.price_currency)} is held in trust. The seller CANNOT withdraw until delivery is confirmed.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-ink-light hidden md:inline-block">
            REF: {deal.payment_provider_ref || 'SECURE_VAULT'}
          </span>
        </div>
      )}

      {/* Grid: Timeline and Action Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Timeline & Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card padding="md">
            <Card.Header>
              <h3 className="font-bold text-sm text-ink">Escrow State Timeline</h3>
            </Card.Header>
            <Card.Body>
              <Timeline>
                {deal.timeline.map((step, idx) => {
                  const isLast = idx === deal.timeline.length - 1;
                  return (
                    <Timeline.Item
                      key={step.id}
                      icon={
                        step.to_status === 'HELD' ? (
                          <ShieldCheck size={16} />
                        ) : step.to_status === 'DELIVERED' ? (
                          <Package size={16} />
                        ) : step.to_status === 'CONFIRMED' ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Handshake size={16} />
                        )
                      }
                      title={step.action}
                      description={step.note || STATUS_META[step.to_status].description}
                      timestamp={formatDate(step.created_at)}
                      status={isLast ? 'current' : 'completed'}
                    />
                  );
                })}
                {/* Show upcoming placeholder if not terminal */}
                {!statusMeta.isTerminal && deal.status !== 'CONFIRMED' && (
                  <Timeline.Item
                    icon={<CheckCircle size={16} />}
                    title={
                      deal.status === 'CREATED'
                        ? 'Payment Deposit'
                        : deal.status === 'HELD'
                        ? 'Item Delivery'
                        : 'Receipt Confirmation'
                    }
                    description="Awaiting party action"
                    timestamp="Pending"
                    status="upcoming"
                  />
                )}
              </Timeline>
            </Card.Body>
          </Card>

          {/* Transaction Terms & Description */}
          <Card padding="md" className="space-y-4">
            <Card.Header>
              <h3 className="font-bold text-sm text-ink">Agreed Escrow Terms</h3>
            </Card.Header>
            <Card.Body className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase">Description</p>
                <p className="text-ink mt-0.5">{deal.description || 'No additional description provided.'}</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-ink-muted uppercase">Inspection & Acceptance Terms</p>
                <p className="text-ink mt-0.5">{deal.terms}</p>
              </div>
            </Card.Body>
          </Card>

          {/* Delivery Proof Card (if delivered) */}
          {(deal.status === 'DELIVERED' || deal.status === 'CONFIRMED') && (
            <Card padding="md" className="bg-white border-green border-2">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Truck size={20} className="text-ink" />
                  <h3 className="font-bold text-sm text-ink">Delivery Proof Details</h3>
                </div>
              </Card.Header>
              <Card.Body className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/50 text-xs">
                  <span className="text-ink-muted">Delivery Timestamp:</span>
                  <span className="font-mono text-ink">{formatDate(deal.delivered_at)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50 text-xs">
                  <span className="text-ink-muted">Courier / Tracking:</span>
                  <span className="font-mono font-bold text-ink">
                    {deal.deliveryProofs[0]?.tracking_number || 'Air21 Armored Express #AR-99321'}
                  </span>
                </div>
                {deal.deliveryProofs[0]?.notes && (
                  <p className="text-xs text-ink-muted pt-1">
                    Notes: {deal.deliveryProofs[0].notes}
                  </p>
                )}
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Right Column: Transaction Controls & Roles */}
        <div className="space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="font-bold text-sm text-ink">Participant Actions</h3>

            {/* Role indicator */}
            <div className="p-3 bg-cream border border-border rounded-md text-xs space-y-1">
              <p className="text-ink-muted">Signed in as:</p>
              <p className="font-bold text-ink flex items-center justify-between">
                <span>{user?.email || 'Buyer Alex'}</span>
                <span className="font-mono text-ink-light uppercase">({currentRole})</span>
              </p>
            </div>

            {/* Action Buttons based on status */}
            <div className="space-y-2">
              {/* CREATED: Buyer pays */}
              {deal.status === 'CREATED' && isBuyer && (
                <Link to={`/deals/${deal.id}/pay`} className="block">
                  <Button variant="primary" fullWidth size="lg">
                    Deposit Escrow Funds
                  </Button>
                </Link>
              )}

              {/* HELD: Seller marks delivered */}
              {deal.status === 'HELD' && (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  leftIcon={<Truck size={18} />}
                  onClick={() => setDeliveryDrawerOpen(true)}
                >
                  Mark as Delivered
                </Button>
              )}

              {/* DELIVERED: Buyer confirms */}
              {deal.status === 'DELIVERED' && (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  leftIcon={<CheckCircle size={18} />}
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  Confirm Receipt & Release
                </Button>
              )}

              {/* CREATED: Cancel */}
              {deal.status === 'CREATED' && (
                <Button
                  variant="ghost"
                  fullWidth
                  leftIcon={<XCircle size={16} />}
                  onClick={handleCancel}
                  isLoading={transitionMutation.isPending}
                >
                  Cancel Deal
                </Button>
              )}

              {/* Dispute Button */}
              {['HELD', 'DELIVERED'].includes(deal.status) && (
                <Link to={`/deals/${deal.id}/dispute`} className="block">
                  <Button
                    variant="danger"
                    fullWidth
                    leftIcon={<WarningCircle size={18} />}
                  >
                    Raise Dispute
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* Pricing & Fee Summary */}
          <Card padding="md" className="space-y-3 text-xs">
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">Fee Summary</h4>
            <div className="flex justify-between">
              <span className="text-ink-muted">Transaction Value:</span>
              <span className="font-mono font-medium">{formatMoney(deal.price_amount, deal.price_currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Service Fee (3%):</span>
              <span className="font-mono font-medium">{formatMoney(deal.service_fee_amount, deal.price_currency)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
              <span>Total Protected:</span>
              <span className="font-mono text-ink">
                {formatMoney(deal.price_amount + deal.service_fee_amount, deal.price_currency)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Delivery Proof Submission Drawer/Dialog */}
      <DeliveryProofForm
        dealId={deal.id}
        open={deliveryDrawerOpen}
        onOpenChange={setDeliveryDrawerOpen}
        onSuccess={() => refetch()}
      />

      {/* Confirm Receipt & Release Dialog */}
      <ConfirmReceiptDialog
        deal={deal}
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default DealDetail;
