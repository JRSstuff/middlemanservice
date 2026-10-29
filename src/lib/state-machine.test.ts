import { describe, it, expect } from 'vitest';
import { canTransition, getAvailableTransitions, STATUS_META } from './state-machine';

describe('SafeSwap Manual QR Ph State Machine', () => {
  it('allows buyer to submit payment proof for a newly created deal', () => {
    expect(canTransition('CREATED', 'PAYMENT_SUBMITTED', 'buyer')).toBe(true);
    expect(canTransition('CREATED', 'PAYMENT_SUBMITTED', 'seller')).toBe(false);
  });

  it('allows either party to cancel a created deal prior to payment', () => {
    expect(canTransition('CREATED', 'CANCELLED', 'buyer')).toBe(true);
    expect(canTransition('CREATED', 'CANCELLED', 'seller')).toBe(true);
  });

  it('prevents illegal jump from CREATED directly to CONFIRMED or RELEASED', () => {
    expect(canTransition('CREATED', 'CONFIRMED', 'buyer')).toBe(false);
    expect(canTransition('CREATED', 'RELEASED', 'buyer')).toBe(false);
    expect(canTransition('CREATED', 'RELEASED', 'seller')).toBe(false);
    expect(canTransition('CREATED', 'RELEASED', 'staff')).toBe(false);
  });

  it('allows staff to verify deposit from PAYMENT_SUBMITTED to HELD', () => {
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'staff')).toBe(true);
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'buyer')).toBe(false);
    expect(canTransition('PAYMENT_SUBMITTED', 'HELD', 'seller')).toBe(false);
  });

  it('allows seller to mark HELD as DELIVERED', () => {
    expect(canTransition('HELD', 'DELIVERED', 'seller')).toBe(true);
    expect(canTransition('HELD', 'DELIVERED', 'buyer')).toBe(false);
  });

  it('allows buyer to confirm receipt on DELIVERED deal', () => {
    expect(canTransition('DELIVERED', 'CONFIRMED', 'buyer')).toBe(true);
    expect(canTransition('DELIVERED', 'PAYOUT_PENDING', 'buyer')).toBe(true);
    expect(canTransition('DELIVERED', 'CONFIRMED', 'seller')).toBe(false);
  });

  it('allows staff to release seller payout from PAYOUT_PENDING', () => {
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'staff')).toBe(true);
    expect(canTransition('PAYOUT_PENDING', 'RELEASED', 'seller')).toBe(false);
  });

  it('strictly restricts dispute resolution to staff/admin', () => {
    expect(canTransition('DISPUTED', 'RELEASED', 'buyer')).toBe(false);
    expect(canTransition('DISPUTED', 'RELEASED', 'seller')).toBe(false);
    expect(canTransition('DISPUTED', 'RELEASED', 'staff')).toBe(true);
    expect(canTransition('DISPUTED', 'REFUNDED', 'staff')).toBe(true);
  });

  it('treats RELEASED, CANCELLED, and REFUNDED as terminal states', () => {
    expect(STATUS_META.RELEASED.isTerminal).toBe(true);
    expect(STATUS_META.CANCELLED.isTerminal).toBe(true);
    expect(STATUS_META.REFUNDED.isTerminal).toBe(true);

    expect(getAvailableTransitions('RELEASED', 'staff')).toHaveLength(0);
    expect(getAvailableTransitions('RELEASED', 'seller')).toHaveLength(0);
    expect(getAvailableTransitions('CANCELLED', 'buyer')).toHaveLength(0);
  });
});
