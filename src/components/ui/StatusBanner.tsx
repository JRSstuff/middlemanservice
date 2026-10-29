/**
 * @file StatusBanner.tsx
 * @description Persistent system status banner for offline/online state,
 * reconnection progress, sync status, and error messages.
 *
 * @example
 * ```tsx
 * // Offline indicator
 * <StatusBanner variant="offline" />
 *
 * // Reconnecting with auto-dismiss
 * <StatusBanner variant="reconnecting" />
 *
 * // Syncing
 * <StatusBanner variant="syncing" />
 *
 * // Error with custom message and dismiss
 * <StatusBanner variant="error" message="Server unreachable" onDismiss={() => {}} />
 * ```
 */

import * as React from 'react';
import { WifiSlash, ArrowsClockwise, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Supported banner variants. */
export type StatusBannerVariant =
  | 'offline'
  | 'reconnecting'
  | 'syncing'
  | 'error';

/** Props for the StatusBanner component. */
export interface StatusBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The type of status to display. */
  variant: StatusBannerVariant;

  /**
   * Custom message text. Required for the `error` variant.
   * Ignored for other variants which use built-in messages.
   */
  message?: string;

  /**
   * Callback when the dismiss button is clicked.
   * When provided, a dismiss (X) button is rendered on the right side.
   */
  onDismiss?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Variant Config                                */
/* -------------------------------------------------------------------------- */

interface VariantConfig {
  bg: string;
  icon: React.ReactNode;
  defaultMessage: string;
}

const VARIANT_MAP: Record<StatusBannerVariant, VariantConfig> = {
  offline: {
    bg: 'bg-blush',
    icon: <WifiSlash size={18} weight="bold" aria-hidden="true" />,
    defaultMessage: 'You are offline',
  },
  reconnecting: {
    bg: 'bg-cream',
    icon: (
      <ArrowsClockwise
        size={18}
        weight="bold"
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
    ),
    defaultMessage: 'Reconnecting...',
  },
  syncing: {
    bg: 'bg-lime',
    icon: <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />,
    defaultMessage: 'Syncing changes...',
  },
  error: {
    bg: 'bg-blush',
    icon: <WifiSlash size={18} weight="bold" aria-hidden="true" />,
    defaultMessage: 'An error occurred',
  },
};

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

/**
 * Persistent status banner fixed to the top of the viewport.
 *
 * Features:
 * - Four variants: offline, reconnecting, syncing, error
 * - `aria-live="polite"` for screen reader announcements
 * - Optional dismiss button
 * - Animate in from top (respects prefers-reduced-motion)
 * - z-40 (below modals at z-50)
 */
const StatusBanner = React.forwardRef<HTMLDivElement, StatusBannerProps>(
  ({ variant, message, onDismiss, className, ...props }, ref) => {
    const config = VARIANT_MAP[variant];
    const displayMessage = message ?? config.defaultMessage;

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          // Layout
          'fixed top-0 inset-x-0 z-40',
          'h-10 flex items-center justify-center gap-2',
          // Typography
          'text-sm font-medium text-ink',
          // Background per variant
          config.bg,
          // Slide-in animation
          'animate-in slide-in-from-top duration-300',
          'motion-reduce:animate-none',
          className,
        )}
        {...props}
      >
        {/* Status icon */}
        {config.icon}

        {/* Message text */}
        <span>{displayMessage}</span>

        {/* Optional dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className={cn(
              'absolute right-3',
              'h-8 w-8 flex items-center justify-center',
              'rounded-sm',
              'hover:bg-hover active:bg-pressed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
              'transition-colors',
              'cursor-pointer',
              // Ensure minimum touch target (44px logical via padding)
              'min-h-[44px] min-w-[44px]',
            )}
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
StatusBanner.displayName = 'StatusBanner';

export { StatusBanner };
export default StatusBanner;
