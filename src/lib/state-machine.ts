import type { DealStatus, UserRole } from '@/types/database';

export interface TransitionRule {
  from: DealStatus;
  to: DealStatus;
  allowedRoles: ('buyer' | 'seller' | 'staff' | 'admin' | 'system')[];
  description: string;
}

/**
 * Single source of truth for allowed transaction state transitions.
 * Enforces the Manual QR Ph Escrow State Machine.
 */
export const TRANSITIONS: TransitionRule[] = [
  // CREATED
  {
    from: 'CREATED',
    to: 'PAYMENT_SUBMITTED',
    allowedRoles: ['buyer', 'staff', 'system'],
    description: 'Buyer uploads bank payment proof / transaction reference',
  },
  {
    from: 'CREATED',
    to: 'CANCELLED',
    allowedRoles: ['buyer', 'seller', 'staff', 'admin', 'system'],
    description: 'Cancel transaction prior to payment',
  },
  {
    from: 'CREATED',
    to: 'EXPIRED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Payment window expired (72h default)',
  },

  // PAYMENT_SUBMITTED
  {
    from: 'PAYMENT_SUBMITTED',
    to: 'HELD',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'SafeSwap staff verifies bank receipt and confirms funds hold',
  },
  {
    from: 'PAYMENT_SUBMITTED',
    to: 'PAYMENT_REJECTED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Staff rejects invalid reference or amount mismatch',
  },
  {
    from: 'PAYMENT_SUBMITTED',
    to: 'CANCELLED',
    allowedRoles: ['buyer', 'staff', 'admin', 'system'],
    description: 'Buyer cancels and requests return',
  },

  // PAYMENT_REJECTED
  {
    from: 'PAYMENT_REJECTED',
    to: 'PAYMENT_SUBMITTED',
    allowedRoles: ['buyer', 'staff', 'system'],
    description: 'Buyer resubmits corrected payment proof',
  },
  {
    from: 'PAYMENT_REJECTED',
    to: 'CANCELLED',
    allowedRoles: ['buyer', 'staff', 'admin', 'system'],
    description: 'Cancel rejected transaction',
  },

  // HELD (Protected in SafeSwap Escrow Account)
  {
    from: 'HELD',
    to: 'DELIVERED',
    allowedRoles: ['seller', 'staff', 'admin', 'system'],
    description: 'Seller marks item dispatched with courier tracking',
  },
  {
    from: 'HELD',
    to: 'DISPUTED',
    allowedRoles: ['buyer', 'seller', 'staff', 'admin'],
    description: 'Contest transaction prior to delivery',
  },
  {
    from: 'HELD',
    to: 'REFUNDED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Staff issues manual refund to buyer',
  },
  {
    from: 'HELD',
    to: 'EXPIRED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Seller failed to deliver within window',
  },

  // DELIVERED
  {
    from: 'DELIVERED',
    to: 'CONFIRMED',
    allowedRoles: ['buyer', 'staff', 'admin', 'system'],
    description: 'Buyer confirms receipt and approves seller payout',
  },
  {
    from: 'DELIVERED',
    to: 'PAYOUT_PENDING',
    allowedRoles: ['buyer', 'staff', 'admin', 'system'],
    description: 'Buyer confirms receipt; payout queued for staff',
  },
  {
    from: 'DELIVERED',
    to: 'DISPUTED',
    allowedRoles: ['buyer', 'seller', 'staff', 'admin'],
    description: 'Buyer contests delivery condition within inspection window',
  },

  // CONFIRMED
  {
    from: 'CONFIRMED',
    to: 'PAYOUT_PENDING',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Staff queues seller payout',
  },
  {
    from: 'CONFIRMED',
    to: 'RELEASED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Staff executes seller payout and records reference',
  },

  // PAYOUT_PENDING
  {
    from: 'PAYOUT_PENDING',
    to: 'RELEASED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Staff confirms manual QR Ph payout to seller with reference',
  },
  {
    from: 'PAYOUT_PENDING',
    to: 'DISPUTED',
    allowedRoles: ['staff', 'admin', 'buyer', 'seller'],
    description: 'Urgent dispute lodged before payout disbursement',
  },

  // DISPUTED
  {
    from: 'DISPUTED',
    to: 'PAYOUT_PENDING',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Admin resolves dispute in seller favor',
  },
  {
    from: 'DISPUTED',
    to: 'RELEASED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Admin resolves in seller favor and releases funds',
  },
  {
    from: 'DISPUTED',
    to: 'REFUNDED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Admin resolves in buyer favor and issues refund',
  },

  // EXPIRED
  {
    from: 'EXPIRED',
    to: 'REFUNDED',
    allowedRoles: ['staff', 'admin', 'system'],
    description: 'Auto-refund on expired unfulfilled transaction',
  },
];

/**
 * Check if a state transition is permitted for a given user role.
 */
export function canTransition(
  from: DealStatus,
  to: DealStatus,
  role: 'buyer' | 'seller' | 'staff' | 'admin' | 'system'
): boolean {
  return TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

/**
 * Get all possible next transitions available for a user role.
 */
export function getAvailableTransitions(
  from: DealStatus,
  role: 'buyer' | 'seller' | 'staff' | 'admin' | 'system'
): TransitionRule[] {
  return TRANSITIONS.filter(
    (t) => t.from === from && t.allowedRoles.includes(role)
  );
}

/**
 * Human-friendly metadata for each state.
 */
export const STATUS_META: Record<
  DealStatus,
  {
    label: string;
    description: string;
    badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'primary';
    isTerminal: boolean;
  }
> = {
  CREATED: {
    label: 'Awaiting Payment',
    description: 'Deal terms created. Buyer must scan QR Ph to deposit funds.',
    badgeVariant: 'warning',
    isTerminal: false,
  },
  PAYMENT_SUBMITTED: {
    label: 'Payment Awaiting Verification',
    description: 'Buyer uploaded payment receipt. SafeSwap staff is verifying the deposit.',
    badgeVariant: 'warning',
    isTerminal: false,
  },
  PAYMENT_REJECTED: {
    label: 'Payment Rejected',
    description: 'Staff could not verify payment proof. Buyer must review and resubmit.',
    badgeVariant: 'danger',
    isTerminal: false,
  },
  FUNDED: {
    label: 'Payment In Transit',
    description: 'Payment deposit received and in processing.',
    badgeVariant: 'warning',
    isTerminal: false,
  },
  HELD: {
    label: 'Payment Protected',
    description: 'Funds verified & held in SafeSwap escrow account. Seller can safely deliver.',
    badgeVariant: 'success',
    isTerminal: false,
  },
  DELIVERED: {
    label: 'Delivered',
    description: 'Seller dispatched item/service. Buyer inspection window active.',
    badgeVariant: 'primary',
    isTerminal: false,
  },
  CONFIRMED: {
    label: 'Receipt Confirmed',
    description: 'Buyer confirmed receipt. Seller payout is queued for disbursement.',
    badgeVariant: 'info',
    isTerminal: false,
  },
  PAYOUT_PENDING: {
    label: 'Payout Pending',
    description: 'SafeSwap staff is preparing seller payout via QR Ph / InstaPay (SLA: <24h).',
    badgeVariant: 'warning',
    isTerminal: false,
  },
  RELEASED: {
    label: 'Completed & Disbursed',
    description: 'Funds sent to seller account. Transaction complete.',
    badgeVariant: 'info',
    isTerminal: true,
  },
  DISPUTED: {
    label: 'Under Dispute',
    description: 'Dispute lodged. All funds locked pending support resolution.',
    badgeVariant: 'danger',
    isTerminal: false,
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Transaction cancelled prior to fulfillment.',
    badgeVariant: 'info',
    isTerminal: true,
  },
  REFUNDED: {
    label: 'Refunded',
    description: 'Funds returned to buyer bank/e-wallet account.',
    badgeVariant: 'info',
    isTerminal: true,
  },
  EXPIRED: {
    label: 'Expired',
    description: 'Payment or delivery window exceeded.',
    badgeVariant: 'warning',
    isTerminal: false,
  },
};
