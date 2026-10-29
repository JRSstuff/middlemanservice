import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeal } from '@/hooks/useDeal';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  Card,
  Button,
  Input,
  Badge,
  Skeleton,
  showToast,
} from '@/components/ui';
import { manualQrphProvider } from '@/lib/manual-qrph-provider';
import type { PaymentInstructions } from '@/lib/payment-provider';
import { formatMoney, truncateId } from '@/lib/format';
import {
  ShieldCheck,
  Copy,
  Clock,
  DownloadSimple,
  CheckCircle,
  WarningCircle,
  UploadSimple,
  ArrowsClockwise,
} from '@phosphor-icons/react';

export const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOnline } = useOnlineStatus();
  const { data: deal, isLoading, refetch } = useDeal(id);

  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState('71:59:45');

  useEffect(() => {
    if (id) {
      manualQrphProvider.createPaymentInstructions(id).then(setInstructions);
    }
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      // simulated countdown
      const hours = Math.floor(Math.random() * 2) + 70;
      const mins = Math.floor(Math.random() * 59);
      const secs = Math.floor(Math.random() * 59);
      setTimeLeft(`${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast.success('Copied to Clipboard', `${label} copied.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast.error('File Too Large', 'Maximum receipt image size is 5MB.');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !deal) return;

    if (!isOnline) {
      showToast.error('Connection Required', 'Payment proof submission requires an active internet connection.');
      return;
    }

    if (!referenceNumber || referenceNumber.trim().length < 4) {
      showToast.error('Reference Required', 'Please enter your bank or e-wallet reference number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalCentavos = deal.price_amount + deal.service_fee_amount;
      await manualQrphProvider.submitPaymentProof(id, {
        referenceNumber: referenceNumber.trim(),
        amountCentavos: totalCentavos,
        proofFilePath: selectedFile ? `receipts/${id}/${selectedFile.name}` : undefined,
        paidAt: new Date().toISOString(),
      });

      showToast.success('Proof Submitted!', 'SafeSwap staff will verify your deposit within 2 hours.');
      refetch();
    } catch (err: any) {
      showToast.error('Submission Failed', err.message || 'Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !instructions || !deal) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-8">
        <Skeleton height="36px" width="60%" />
        <Skeleton.Card />
      </div>
    );
  }

  const isAwaitingVerification = deal.status === 'PAYMENT_SUBMITTED';
  const isRejected = deal.status === 'PAYMENT_REJECTED';
  const isHeld = ['HELD', 'DELIVERED', 'CONFIRMED', 'PAYOUT_PENDING', 'RELEASED'].includes(deal.status);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-ink-light">DEAL {truncateId(deal.id)}</span>
          <Badge
            variant={
              isHeld ? 'success' : isAwaitingVerification ? 'warning' : isRejected ? 'danger' : 'info'
            }
            size="sm"
            dot
          >
            {isHeld
              ? 'Payment Protected'
              : isAwaitingVerification
              ? 'Awaiting Staff Verification'
              : isRejected
              ? 'Payment Rejected'
              : 'Awaiting Payment'}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-1">
          {deal.title}
        </h1>
      </div>

      {/* Already Protected State */}
      {isHeld ? (
        <Card padding="lg" className="bg-lime/20 border-green border-2 space-y-4 text-center">
          <div className="w-14 h-14 bg-green rounded-full flex items-center justify-center mx-auto text-ink">
            <CheckCircle size={32} weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Payment Verified &amp; Funds Protected</h2>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              Your deposit of {formatMoney(deal.price_amount + deal.service_fee_amount, deal.price_currency)} is held safely in escrow. The seller cannot withdraw until you confirm receipt.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate(`/deals/${deal.id}`)}>
            View Deal Timeline
          </Button>
        </Card>
      ) : isAwaitingVerification ? (
        /* Awaiting Verification State */
        <Card padding="lg" className="space-y-4 text-center bg-white border-2 border-border">
          <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center mx-auto text-ink border border-border">
            <Clock size={32} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Payment Submitted — Awaiting Verification</h2>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
              Our staff is actively matching your deposit with SafeSwap's bank statement. Both you and the seller will receive an alert once verified (SLA: &lt; 2 hours).
            </p>
          </div>
          <div className="p-3 bg-cream rounded text-xs font-mono text-ink-muted">
            Status: Reviewing bank reference code
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={() => refetch()}>
              Check Status
            </Button>
            <Button variant="primary" onClick={() => navigate(`/deals/${deal.id}`)}>
              Back to Deal
            </Button>
          </div>
        </Card>
      ) : (
        /* Payment Instructions & Submission Form */
        <div className="space-y-6">
          {isRejected && (
            <div className="p-4 bg-blush border border-ink/20 rounded-md text-xs text-ink space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <WarningCircle size={18} /> Payment Proof Rejected
              </p>
              <p>
                Our staff could not verify the previous reference number or receipt. Please verify your bank receipt and resubmit below.
              </p>
            </div>
          )}

          {/* QR Ph Card */}
          <Card padding="md" className="space-y-4 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs border-b border-border pb-2">
              <span className="font-bold uppercase tracking-wider text-ink-muted">
                Scan via Philippine QR Ph
              </span>
              <span className="flex items-center gap-1 text-ink font-mono font-medium">
                <Clock size={14} /> Exp: {timeLeft}
              </span>
            </div>

            {/* Render High-Contrast Dynamic QR Ph */}
            <div className="flex flex-col items-center justify-center p-4 bg-cream rounded-md border border-border">
              <img
                src={instructions.qrCodeUrl}
                alt="QR Ph Payment Code"
                className="w-64 h-auto rounded border border-border shadow-sm"
              />
              <a
                href={instructions.qrCodeUrl}
                download={`QRPh-${instructions.referenceCode}.svg`}
                className="mt-3 text-xs underline text-ink flex items-center gap-1 font-semibold hover:text-ink-muted"
              >
                <DownloadSimple size={16} /> Download QR Code Image
              </a>
            </div>

            {/* Exact Deposit Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-cream rounded border border-border">
                <div>
                  <p className="text-[11px] text-ink-muted">Exact Amount to Pay</p>
                  <p className="font-mono font-bold text-base text-ink font-tabular">
                    {formatMoney(instructions.amountCentavos, instructions.currency)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Copy size={14} />}
                  onClick={() =>
                    copyToClipboard((instructions.amountCentavos / 100).toFixed(2), 'Amount')
                  }
                >
                  Copy
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-cream rounded border border-border">
                <div>
                  <p className="text-[11px] text-ink-muted">Unique Deal Reference Code</p>
                  <p className="font-mono font-bold text-sm text-ink">{instructions.referenceCode}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Copy size={14} />}
                  onClick={() => copyToClipboard(instructions.referenceCode, 'Reference Code')}
                >
                  Copy
                </Button>
              </div>

              <div className="p-2.5 bg-cream rounded border border-border space-y-1 text-[11px]">
                <p>
                  <strong>Account Name:</strong> {instructions.accountName}
                </p>
                <p>
                  <strong>Account Number / Mobile:</strong> {instructions.accountNumber} ({instructions.institution})
                </p>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3 bg-white border border-border rounded text-xs space-y-1.5 text-ink-muted">
              <p className="font-bold text-ink">How to Pay via QR Ph:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open GCash, Maya, BDO, BPI, UnionBank, or any InstaPay banking app.</li>
                <li>Tap <strong>Scan QR</strong> and point camera at the QR code above (or upload saved image).</li>
                <li>Ensure the recipient is <strong>{instructions.accountName}</strong>.</li>
                <li>Enter the exact amount <strong>{formatMoney(instructions.amountCentavos, instructions.currency)}</strong>.</li>
                <li>Put <strong>{instructions.referenceCode}</strong> in message/remarks.</li>
              </ol>
            </div>
          </Card>

          {/* Submission Form */}
          <Card padding="md" className="space-y-4">
            <Card.Header>
              <h3 className="font-bold text-sm text-ink">Submit Bank Transfer Proof</h3>
            </Card.Header>

            <form onSubmit={handleSubmitProof} className="space-y-4">
              <Input
                label="Bank / InstaPay Reference Number"
                placeholder="e.g. 10293848123 or MP-998231"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                hint="Locate the reference number from your bank's confirmation receipt"
                required
              />

              {/* Receipt File Upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">
                  Upload Screenshot / Receipt (Image or PDF, max 5MB)
                </label>
                <div className="border-2 border-dashed border-border rounded-md p-4 text-center bg-cream/50 hover:bg-cream transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="receipt-file-input"
                  />
                  <label
                    htmlFor="receipt-file-input"
                    className="cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <UploadSimple size={24} className="text-ink-muted" />
                    <span className="text-xs font-semibold text-ink">
                      {selectedFile ? selectedFile.name : 'Click to select receipt screenshot'}
                    </span>
                    <span className="text-[11px] text-ink-muted">JPG, PNG, WebP or PDF</span>
                  </label>
                </div>
                {filePreview && (
                  <div className="mt-2 text-center">
                    <img
                      src={filePreview}
                      alt="Receipt Preview"
                      className="max-h-40 mx-auto rounded border border-border"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
              >
                Submit Payment for Staff Verification
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Payment;
