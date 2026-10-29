import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Input, Button, showToast } from '@/components/ui';
import { useTransitionDeal, useDeal } from '@/hooks/useDeal';
import { WarningCircle, ShieldCheck } from '@phosphor-icons/react';

export const Dispute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dealId = id || '11111111-1111-1111-1111-111111111111';
  const navigate = useNavigate();
  const { data: deal } = useDeal(dealId);
  const transitionMutation = useTransitionDeal(dealId);

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      showToast.error('Reason Required', 'Please enter a clear explanation (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await transitionMutation.mutateAsync({
        targetStatus: 'DISPUTED',
        action: 'Participant Lodged Dispute',
        note: `${reason.trim()}: ${details.trim()}`,
        metadata: { reason, details },
      });

      showToast.error('Dispute Lodged', 'Escrow funds are now frozen. SafeSwap staff will review.');
      navigate(`/deals/${dealId}`);
    } catch (err: any) {
      showToast.error('Dispute Failed', err.message || 'Could not register dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Report a Problem / Dispute</h1>
        <p className="text-sm text-ink-muted">
          Lodging a dispute freezes all fund payouts until staff investigation is complete.
        </p>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="p-3 bg-blush rounded-md border border-ink/20 flex items-center gap-3">
          <WarningCircle size={28} className="text-ink shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-ink">Escrow Freeze Active</p>
            <p className="text-ink-muted">
              Neither buyer nor seller can withdraw or complete payout until staff review.
            </p>
          </div>
        </div>

        {deal && (
          <div className="p-3 bg-cream rounded border border-border text-xs space-y-1">
            <p><strong>Deal:</strong> {deal.title}</p>
            <p><strong>Current State:</strong> {deal.status}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Reason for Problem"
            placeholder="e.g. Item damaged in transit / Did not receive package"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <Input
            label="Detailed Explanation"
            placeholder="Provide specific notes for SafeSwap staff investigation..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmitting}
            >
              Report Problem & Lock Escrow
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Dispute;
