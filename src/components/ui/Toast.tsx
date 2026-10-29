/**
 * @file Toast.tsx
 * @description Toast notification system wrapping Sonner.
 * Exports a configured `<SafeSwapToaster />` provider and `showToast` helpers.
 *
 * @example
 * ```tsx
 * // In your root layout:
 * import { SafeSwapToaster } from '@/components/ui/Toast';
 * <SafeSwapToaster />
 *
 * // Anywhere in the app:
 * import { showToast } from '@/components/ui/Toast';
 * showToast.success('Transaction complete', 'Funds have been released.');
 * showToast.error('Payment failed', 'Insufficient balance.');
 * showToast.info('Heads up', 'New terms of service available.');
 * const id = showToast.loading('Processing payment...');
 * // Later: toast.dismiss(id);
 * ```
 */

import * as React from 'react';
import { Toaster, toast } from 'sonner';
import type { ExternalToast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Props for the SafeSwapToaster provider component. */
export interface SafeSwapToasterProps {
  /**
   * Override the default position.
   * @default 'bottom-center'
   */
  position?: React.ComponentPropsWithoutRef<typeof Toaster>['position'];
}

/** Convenience helpers for triggering toasts. */
export interface ShowToast {
  /** Show a success toast with a green left border. */
  success: (message: string, description?: string) => string | number;
  /** Show an error toast with a blush left border. */
  error: (message: string, description?: string) => string | number;
  /** Show an informational toast. */
  info: (message: string, description?: string) => string | number;
  /** Show a loading toast. Returns the toast id for later dismissal. */
  loading: (message: string) => string | number;
}

/* -------------------------------------------------------------------------- */
/*                               Toast Options                                */
/* -------------------------------------------------------------------------- */

/**
 * Base styles applied to every toast via Sonner's `toastOptions.style`.
 * We avoid Tailwind classes in `style` and instead use `className` for
 * layout/spacing and `style` for CSS custom property–driven colours.
 */
const baseClassName = [
  '!bg-white !border !border-border !text-ink !rounded-md !shadow-md',
  '!font-sans',
].join(' ');

const baseStyle: React.CSSProperties = {
  // Override Sonner's default colours
  '--normal-bg': '#ffffff',
  '--normal-border': 'var(--color-border, #C5CCBC)',
  '--normal-text': 'var(--color-ink, #1F2A14)',
} as React.CSSProperties;

/* -------------------------------------------------------------------------- */
/*                             Toaster Component                              */
/* -------------------------------------------------------------------------- */

/**
 * Pre-configured Sonner `<Toaster />` styled to the SafeSwap design system.
 *
 * Mount once at the root of your app. All calls to `showToast.*` will render
 * through this provider.
 */
const SafeSwapToaster: React.FC<SafeSwapToasterProps> = ({
  position = 'bottom-center',
}) => (
  <Toaster
    position={position}
    richColors={false}
    gap={8}
    toastOptions={{
      className: baseClassName,
      style: baseStyle,
      classNames: {
        success: '!border-l-4 !border-l-green',
        error: '!border-l-4 !border-l-blush',
        description: '!text-ink-muted !text-sm',
      },
    }}
  />
);
SafeSwapToaster.displayName = 'SafeSwapToaster';

/* -------------------------------------------------------------------------- */
/*                            Convenience Helpers                             */
/* -------------------------------------------------------------------------- */

/**
 * Convenience wrappers around Sonner's `toast()` function.
 *
 * Each method maps to a toast type styled to the SafeSwap design system.
 */
const showToast: ShowToast = {
  success(message: string, description?: string) {
    return toast.success(message, { description } as ExternalToast);
  },

  error(message: string, description?: string) {
    return toast.error(message, { description } as ExternalToast);
  },

  info(message: string, description?: string) {
    return toast.info(message, { description } as ExternalToast);
  },

  loading(message: string) {
    return toast.loading(message);
  },
};

/* -------------------------------------------------------------------------- */
/*                                  Exports                                   */
/* -------------------------------------------------------------------------- */

export { SafeSwapToaster, showToast, toast };
export default SafeSwapToaster;
