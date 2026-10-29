import React from 'react';
import { Dialog, Button, showToast } from '@/components/ui';
import { useTransitionDeal, type DealDetailData } from '@/hooks/useDeal';
import { formatMoney } from '@/lib/format';
import { CheckCircle, ShieldCheck } from '@phosphor-icons/react';

interface ConfirmReceiptDialogProps {
  deal: DealDetailData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ConfirmReceiptDialog: React.FC<ConfirmReceiptDialogProps> = ({
  deal,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const transitionMutation = useTransitionDeal(deal.id);
  const netSellerPayout = deal.price_amount - (deal.service_fee_amount || 0);

  const handleConfirm = async () => {
    try {
      await transitionMutation.mutateAsync({
        targetStatus: 'CONFIRMED',
        action: 'Buyer Confirmed Delivery & Released Escrow',
        note: `Funds released to seller ${deal.seller?.display_name || 'Seller'} minus service fee.`,
      });

      showToast.success('Funds Released', 'Transaction completed successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      showToast.error('Release Failed', err.message || 'Could not release funds.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-green rounded text-ink">
              <CheckCircle size={20} weight="fill" />
            </span>
            <Dialog.Title>Confirm Receipt & Release Funds</Dialog.Title>
          </div>
        </Dialog.Header>

        <Dialog.Description>
          Please verify that you have received and inspected the item/service according to the agreed terms.
        </Dialog.Description>

        <div className="my-4 p-4 bg-cream border border-border rounded-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Protected Escrow Balance:</span>
            <span className="font-mono font-medium">{formatMoney(deal.price_amount, deal.price_currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">SafeSwap Escrow Fee (3%):</span>
            <span className="font-mono font-medium text-ink-muted">
              -{formatMoney(deal.service_fee_amount, deal.price_currency)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
            <span className="text-ink">Net Seller Disbursement:</span>
            <span className="font-mono text-ink">
              {formatMoney(netSellerPayout, deal.price_currency)}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-lime rounded border border-ink/20 text-xs text-ink flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="shrink-0" />
          <span>
            Once confirmed, our regulated payment partner will disburse funds to the seller. This action cannot be reversed.
          </span>
        </div>

        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button
            variant="primary"
            isLoading={transitionMutation.isPending}
            onClick={handleConfirm}
          >
            Yes, Release Funds
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};
