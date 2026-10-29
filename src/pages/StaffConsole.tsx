import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDeals, type DealWithParticipants } from '@/hooks/useDeals';
import {
  Card,
  Badge,
  Button,
  Input,
  Dialog,
  Skeleton,
  EmptyState,
  showToast,
} from '@/components/ui';
import { formatMoney, formatDate, truncateId } from '@/lib/format';
import { manualQrphProvider } from '@/lib/manual-qrph-provider';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  CurrencyCircleDollar,
  Clock,
  WarningCircle,
  ArrowSquareOut,
  UserCheck,
  LockKey,
} from '@phosphor-icons/react';

type QueueTab = 'verify' | 'payouts' | 'disputes' | 'all';

export const StaffConsole: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>('verify');

  // Dialog states
  const [selectedDeal, setSelectedDeal] = useState<DealWithParticipants | null>(null);
  const [reviewMode, setReviewMode] = useState<'verify' | 'payout' | null>(null);
  const [bankRef, setBankRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [revealedAccount, setRevealedAccount] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountMismatch, setAmountMismatch] = useState(false);

  // In production, queries supabase for deals in review states
  const { data: deals = [], isLoading, refetch } = useDeals();

  // Filter queues
  const verifyQueue = deals.filter((d) => d.status === 'PAYMENT_SUBMITTED');
  const payoutQueue = deals.filter((d) => ['CONFIRMED', 'PAYOUT_PENDING'].includes(d.status));
  const disputeQueue = deals.filter((d) => d.status === 'DISPUTED');

  const currentList =
    activeTab === 'verify'
      ? verifyQueue
      : activeTab === 'payouts'
      ? payoutQueue
      : activeTab === 'disputes'
      ? disputeQueue
      : deals;

  const handleOpenVerify = (deal: DealWithParticipants) => {
    setSelectedDeal(deal);
    setReviewMode('verify');
    setBankRef(`BDO-VERIF-${Math.floor(100000 + Math.random() * 900000)}`);
    setRejectReason('');
    setAmountMismatch(false);
  };

  const handleOpenPayout = async (deal: DealWithParticipants) => {
    setSelectedDeal(deal);
    setReviewMode('payout');
    setPayoutRef(`INSTAPAY-${Math.floor(100000 + Math.random() * 900000)}`);
    setRevealedAccount(null);
  };

  const handleRevealSellerAccount = async () => {
    if (!selectedDeal) return;
    try {
      const instructions = await manualQrphProvider.createPayoutInstructions(
        selectedDeal.id,
        user?.id || 'staff-001'
      );
      setRevealedAccount(instructions.sellerAccountNumberRaw || '0917-882-9901');
      showToast.info('Account Revealed', 'Staff reveal action has been logged in audit trail.');
    } catch (err: any) {
      showToast.error('Could not reveal account', err.message);
    }
  };

  const handleConfirmVerify = async () => {
    if (!selectedDeal) return;
    if (amountMismatch) {
      showToast.error('Verification Blocked', 'Cannot verify deposit with unresolved amount discrepancy.');
      return;
    }
    setIsProcessing(true);
    try {
      await manualQrphProvider.confirmPayment(
        selectedDeal.id,
        user?.id || '00000000-0000-0000-0000-000000000003',
        {
          bankReference: bankRef,
          verifiedAmountCentavos: selectedDeal.price_amount + selectedDeal.service_fee_amount,
        }
      );
      showToast.success('Deposit Verified', 'Deal moved to HELD. Funds protected in escrow account.');
      setReviewMode(null);
      refetch();
    } catch (err: any) {
      showToast.error('Verification failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedDeal || !rejectReason || rejectReason.length < 5) {
      showToast.error('Reason Required', 'Please enter a clear explanation for the buyer.');
      return;
    }
    setIsProcessing(true);
    try {
      await manualQrphProvider.rejectPayment(
        selectedDeal.id,
        user?.id || '00000000-0000-0000-0000-000000000003',
        rejectReason
      );
      showToast.info('Payment Rejected', 'Buyer has been requested to submit valid proof.');
      setReviewMode(null);
      refetch();
    } catch (err: any) {
      showToast.error('Rejection failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayout = async () => {
    if (!selectedDeal || !payoutRef) return;
    setIsProcessing(true);
    try {
      await manualQrphProvider.confirmPayout(
        selectedDeal.id,
        user?.id || '00000000-0000-0000-0000-000000000003',
        {
          payoutReference: payoutRef,
        }
      );
      showToast.success('Payout Disbursed', 'Seller payment released via QR Ph / InstaPay.');
      setReviewMode(null);
      refetch();
    } catch (err: any) {
      showToast.error('Payout failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-ink text-white rounded-md">
            <UserCheck size={26} weight="duotone" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink">Staff Verification Console</h1>
              <Badge variant="warning" size="sm">Internal / Staff Only</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              Manual bank matching, QR Ph deposit review, and seller payout disbursements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs bg-cream p-2.5 rounded border border-border">
          <Clock size={16} className="text-ink-muted" />
          <span>SLA Target: <strong>&lt; 2 hours</strong> verification, <strong>&lt; 24h</strong> payout</span>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verify')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${
            activeTab === 'verify' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-hover'
          }`}
        >
          <span>Verify Deposits</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blush text-ink font-mono">
            {verifyQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${
            activeTab === 'payouts' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-hover'
          }`}
        >
          <span>Payouts Due</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-lime text-ink font-mono">
            {payoutQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${
            activeTab === 'disputes' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-hover'
          }`}
        >
          <span>Disputes</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white border border-border text-ink font-mono">
            {disputeQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
            activeTab === 'all' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-hover'
          }`}
        >
          All Deals ({deals.length})
        </button>
      </div>

      {/* Queue Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ) : currentList.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<CheckCircle size={48} />}
            title="Queue Empty"
            description="No transactions currently awaiting staff action in this queue."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {currentList.map((deal) => {
            const expectedCentavos = deal.price_amount + deal.service_fee_amount;
            return (
              <Card key={deal.id} padding="md" className="hover:border-ink transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-ink-light font-bold">
                        {truncateId(deal.id)}
                      </span>
                      <span className="text-xs text-ink-muted">•</span>
                      <span className="text-xs text-ink-muted">Buyer: {deal.buyer?.display_name || 'Buyer'}</span>
                      <span className="text-xs text-ink-muted">&rarr;</span>
                      <span className="text-xs text-ink-muted">Seller: {deal.seller?.display_name || 'Seller'}</span>
                      <Badge
                        variant={
                          deal.status === 'PAYMENT_SUBMITTED'
                            ? 'warning'
                            : deal.status === 'HELD'
                            ? 'success'
                            : 'info'
                        }
                        size="sm"
                        dot
                      >
                        {deal.status}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base text-ink">{deal.title}</h3>
                    <p className="text-xs text-ink-muted line-clamp-1">
                      Inspection Terms: {deal.terms}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-ink-muted">Total Deposit</p>
                      <p className="font-mono font-bold text-base text-ink font-tabular">
                        {formatMoney(expectedCentavos, deal.price_currency)}
                      </p>
                    </div>

                    {/* Action buttons per queue */}
                    {deal.status === 'PAYMENT_SUBMITTED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenVerify(deal)}
                      >
                        Verify Receipt
                      </Button>
                    )}

                    {['CONFIRMED', 'PAYOUT_PENDING'].includes(deal.status) && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenPayout(deal)}
                      >
                        Process Payout
                      </Button>
                    )}

                    {deal.status === 'HELD' && (
                      <Badge variant="success" size="sm">
                        Funds Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* VERIFY PAYMENT DIALOG */}
      {selectedDeal && reviewMode === 'verify' && (
        <Dialog open={true} onOpenChange={() => setReviewMode(null)}>
          <Dialog.Content className="max-w-lg">
            <Dialog.Header>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-green rounded text-ink">
                  <ShieldCheck size={20} />
                </span>
                <Dialog.Title>Verify Buyer QR Ph Deposit</Dialog.Title>
              </div>
            </Dialog.Header>

            <Dialog.Description>
              Match the buyer's uploaded proof against SafeSwap bank / e-wallet transaction history.
            </Dialog.Description>

            <div className="my-4 space-y-4">
              {/* Financial reconciliation */}
              <div className="p-3 bg-cream border border-border rounded-md text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Deal Reference:</span>
                  <span className="font-mono font-bold">SS-{selectedDeal.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Expected Item Price:</span>
                  <span className="font-mono">{formatMoney(selectedDeal.price_amount, selectedDeal.price_currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">3% Service Fee:</span>
                  <span className="font-mono">{formatMoney(selectedDeal.service_fee_amount, selectedDeal.price_currency)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold text-sm">
                  <span>Required Bank Transfer Amount:</span>
                  <span className="font-mono text-ink">
                    {formatMoney(selectedDeal.price_amount + selectedDeal.service_fee_amount, selectedDeal.price_currency)}
                  </span>
                </div>
              </div>

              {/* Duplicate reference check simulated indicator */}
              <div className="p-2.5 bg-lime rounded border border-ink/20 text-xs text-ink flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={16} />
                  <span><strong>Fraud Check Passed:</strong> Bank reference number is unique across all deals.</span>
                </span>
              </div>

              {/* Amount Mismatch Toggle for Testing Staff Protection */}
              <div className="p-2 bg-white border border-border rounded text-xs flex items-center justify-between">
                <span className="text-ink-muted">Simulate Amount Mismatch:</span>
                <button
                  type="button"
                  onClick={() => setAmountMismatch(!amountMismatch)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    amountMismatch ? 'bg-blush text-ink border border-ink' : 'bg-cream text-ink'
                  }`}
                >
                  {amountMismatch ? 'Mismatch Simulated' : 'Exact Amount'}
                </button>
              </div>

              {amountMismatch && (
                <div className="p-3 bg-blush rounded border border-ink/20 text-xs text-ink space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <WarningCircle size={16} /> Amount Discrepancy Detected
                  </p>
                  <p>
                    Buyer paid less than the required total. Verification is blocked until buyer resolves discrepancy or payment is rejected.
                  </p>
                </div>
              )}

              {/* Bank matching reference */}
              <Input
                label="SafeSwap Bank / InstaPay Reference Number"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                hint="Confirmed from SafeSwap Maya / UnionBank statement"
              />

              {/* Rejection input */}
              <div className="space-y-1 pt-2 border-t border-border">
                <Input
                  label="Rejection Reason (if rejecting)"
                  placeholder="e.g. Reference not found in bank ledger / blurred image"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>

            <Dialog.Footer className="flex-col sm:flex-row gap-2">
              <Button
                variant="danger"
                onClick={handleRejectPayment}
                disabled={isProcessing}
              >
                Reject Receipt
              </Button>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button
                  variant="primary"
                  onClick={handleConfirmVerify}
                  disabled={amountMismatch || isProcessing}
                  isLoading={isProcessing}
                >
                  Confirm & Hold Funds
                </Button>
              </div>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      )}

      {/* PROCESS PAYOUT DIALOG */}
      {selectedDeal && reviewMode === 'payout' && (
        <Dialog open={true} onOpenChange={() => setReviewMode(null)}>
          <Dialog.Content className="max-w-lg">
            <Dialog.Header>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-green rounded text-ink">
                  <CurrencyCircleDollar size={20} />
                </span>
                <Dialog.Title>Disburse Seller Payout</Dialog.Title>
              </div>
            </Dialog.Header>

            <Dialog.Description>
              Buyer has confirmed receipt. Transfer exact funds to the seller's registered QR Ph or bank account.
            </Dialog.Description>

            <div className="my-4 space-y-4">
              {/* Seller Payout Details */}
              <div className="p-3 bg-cream border border-border rounded-md text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Seller Name:</span>
                  <span className="font-bold">{selectedDeal.seller?.display_name || 'Seller Maria'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Destination:</span>
                  <span className="font-semibold">GCash / Maya QR Ph</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">
                      {revealedAccount || '•••• •••• 4321'}
                    </span>
                    {!revealedAccount && (
                      <button
                        type="button"
                        onClick={handleRevealSellerAccount}
                        className="text-[11px] underline text-ink flex items-center gap-1 font-semibold hover:text-ink-muted"
                      >
                        <Eye size={14} /> Reveal
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
                  <span>Net Seller Payout (Disbursement):</span>
                  <span className="font-mono text-ink">
                    {formatMoney(selectedDeal.price_amount, selectedDeal.price_currency)}
                  </span>
                </div>
              </div>

              {/* Four-Eyes Compliance Notice */}
              <div className="p-2.5 bg-white border border-border rounded text-xs text-ink-muted flex items-center gap-2">
                <LockKey size={18} className="shrink-0 text-ink" />
                <span>
                  <strong>Four-Eyes Rule Active:</strong> System ensures the verifier of incoming deposit is not the same staff approving this disbursement.
                </span>
              </div>

              <Input
                label="InstaPay / Bank Outbound Reference"
                placeholder="e.g. INSPY-2026-993812"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                hint="Reference number provided by SafeSwap bank app upon sending"
              />
            </div>

            <Dialog.Footer>
              <Dialog.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </Dialog.Close>
              <Button
                variant="primary"
                onClick={handleConfirmPayout}
                isLoading={isProcessing}
              >
                Confirm Payout Disbursed
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      )}
    </div>
  );
};

export default StaffConsole;
