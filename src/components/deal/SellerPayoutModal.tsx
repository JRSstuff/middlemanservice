import React, { useState } from 'react';
import { Dialog, Input, Select, SelectItem, Button, showToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Bank, WarningCircle } from '@phosphor-icons/react';

interface SellerPayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const SellerPayoutModal: React.FC<SellerPayoutModalProps> = ({
  open,
  onOpenChange,
  onSaved,
}) => {
  const { user, profile } = useAuth();
  const [institution, setInstitution] = useState('GCash');
  const [accountName, setAccountName] = useState(profile?.display_name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const nameMismatch =
    profile?.display_name &&
    accountName.trim().length > 0 &&
    profile.display_name.trim().toLowerCase() !== accountName.trim().toLowerCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountNumber) {
      showToast.error('Missing Details', 'Please provide both account name and number.');
      return;
    }

    setIsSaving(true);
    try {
      if (user?.id) {
        await (supabase.from('seller_payout_methods') as any).upsert({
          seller_id: user.id,
          account_name: accountName.trim(),
          institution,
          account_number: accountNumber.trim(),
          is_default: true,
        });
      }
      showToast.success('Payout Method Saved', 'SafeSwap staff will disburse confirmed escrow payouts to this account.');
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      showToast.error('Could not save payout method', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-md">
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-green rounded text-ink">
              <Bank size={20} />
            </span>
            <Dialog.Title>Seller Receiving Account</Dialog.Title>
          </div>
        </Dialog.Header>

        <Dialog.Description>
          Enter the QR Ph / InstaPay bank account or e-wallet where you want to receive your escrow proceeds.
        </Dialog.Description>

        <form onSubmit={handleSave} className="space-y-4 my-4">
          <Select
            label="Receiving Bank or E-Wallet"
            value={institution}
            onValueChange={setInstitution}
          >
            <SelectItem value="GCash">GCash</SelectItem>
            <SelectItem value="Maya">Maya</SelectItem>
            <SelectItem value="BDO">BDO Unibank</SelectItem>
            <SelectItem value="BPI">Bank of the Philippine Islands (BPI)</SelectItem>
            <SelectItem value="UnionBank">UnionBank of the Philippines</SelectItem>
          </Select>

          <Input
            label="Account / Registered Name"
            placeholder="e.g. Maria Santos"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            hint="Must match your verified government identification"
            required
          />

          {nameMismatch && (
            <div className="p-2.5 bg-cream border border-border rounded text-xs text-ink flex items-start gap-2">
              <WarningCircle size={18} className="shrink-0 text-ink-muted mt-0.5" />
              <span>
                <strong>Name Notice:</strong> Account name differs from your SafeSwap profile ({profile?.display_name}). Payouts to third-party accounts may require manual AML verification.
              </span>
            </div>
          )}

          <Input
            label="Account Number or Mobile Number"
            placeholder="e.g. 0917-123-4567 or 1092837482"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />

          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Receiving Details
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
};
