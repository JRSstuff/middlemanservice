/**
 * Haptic feedback utility.
 * Wraps navigator.vibrate with feature detection and prefers-reduced-motion check.
 */

export function hapticTap(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate(10);
}

export function hapticSuccess(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate([10, 50, 10]);
}

export function hapticError(): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate([30, 50, 30]);
}
