import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deliveryProofSchema, type DeliveryProofFormValues } from '@/lib/validation';
import { Drawer, Dialog, Button, Input, Select, SelectItem, showToast } from '@/components/ui';
import { useTransitionDeal } from '@/hooks/useDeal';
import { Package, Truck, Paperclip } from '@phosphor-icons/react';

interface DeliveryProofFormProps {
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DeliveryProofForm: React.FC<DeliveryProofFormProps> = ({
  dealId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const transitionMutation = useTransitionDeal(dealId);
  const [proofType, setProofType] = useState<'tracking_number' | 'photo' | 'file' | 'notes'>('tracking_number');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeliveryProofFormValues>({
    resolver: zodResolver(deliveryProofSchema),
    defaultValues: {
      proofType: 'tracking_number',
      carrier: '',
      trackingNumber: '',
      notes: '',
    },
  });

  const onSubmit = async (values: DeliveryProofFormValues) => {
    try {
      await transitionMutation.mutateAsync({
        targetStatus: 'DELIVERED',
        action: 'Seller Marked Item Delivered',
        note: values.trackingNumber
          ? `${values.carrier || 'Courier'} Tracking #${values.trackingNumber}`
          : values.notes || 'Delivery completed',
        metadata: {
          proofType: values.proofType,
          carrier: values.carrier,
          trackingNumber: values.trackingNumber,
          notes: values.notes,
        },
      });

      showToast.success('Delivery Marked', 'Buyer has been notified to inspect and confirm receipt.');
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      showToast.error('Submission Failed', err.message || 'Could not record delivery.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-green rounded text-ink">
              <Package size={20} />
            </span>
            <Dialog.Title>Mark Item / Service Delivered</Dialog.Title>
          </div>
        </Dialog.Header>

        <Dialog.Description>
          Provide proof of delivery (courier tracking or notes). The buyer will be given their agreed inspection window to confirm.
        </Dialog.Description>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
          <Select
            label="Proof Type"
            value={proofType}
            onValueChange={(val: any) => setProofType(val)}
          >
            <SelectItem value="tracking_number">Courier Tracking Number</SelectItem>
            <SelectItem value="photo">Photo / File Evidence</SelectItem>
            <SelectItem value="notes">Digital Delivery / Completion Notes</SelectItem>
          </Select>

          {proofType === 'tracking_number' && (
            <>
              <Input
                label="Carrier / Courier"
                placeholder="e.g. LBC Express, Air21, DHL, J&T"
                leftIcon={<Truck size={18} className="text-ink-muted" />}
                {...register('carrier')}
              />
              <Input
                label="Tracking / Waybill Number"
                placeholder="e.g. #LBC-9923812"
                {...register('trackingNumber')}
              />
            </>
          )}

          <Input
            label="Delivery Notes (Optional)"
            placeholder="Package handed to recipient / code repository transfer completed"
            hint="Any specific instructions for buyer during inspection"
            {...register('notes')}
          />

          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              type="submit"
              variant="primary"
              isLoading={transitionMutation.isPending}
            >
              Submit Delivery Proof
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
};
