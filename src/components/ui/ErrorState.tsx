import * as React from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ErrorStateProps {
  /** Error heading. @default "Something went wrong" */
  title?: string;
  /** Error explanation. @default "We're having trouble loading this. Please try again." */
  description?: string;
  /** Called when the user clicks "Retry". Shows the button when provided. */
  onRetry?: () => void;
  /** Called when the user clicks "Go home". Shows the link when provided. */
  onGoHome?: () => void;
  /** Additional class names for the outer wrapper. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Error-state card for error screens and error boundaries.
 *
 * Displays a warning icon, title, description, and optional Retry / Go
 * Home actions inside a blush-tinted card.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   onRetry={() => refetch()}
 *   onGoHome={() => navigate('/')}
 * />
 *
 * <ErrorState
 *   title="Deal not found"
 *   description="This deal may have been deleted or the link is invalid."
 *   onGoHome={() => navigate('/')}
 * />
 * ```
 */
export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = 'Something went wrong',
      description = "We're having trouble loading this. Please try again.",
      onRetry,
      onGoHome,
      className,
    },
    ref,
  ) => {
    const hasActions = Boolean(onRetry || onGoHome);

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center py-12',
          className,
        )}
      >
        {/* Card wrapper with blush tint */}
        <div
          className={cn(
            'flex flex-col items-center gap-4 rounded-lg border border-blush',
            'bg-blush/10 px-8 py-10',
          )}
        >
          {/* Icon */}
          <span className="flex items-center justify-center text-ink" aria-hidden="true">
            <WarningCircle size={48} weight="fill" />
          </span>

          {/* Copy */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-lg font-medium text-ink">{title}</h3>
            <p className="max-w-sm text-sm text-ink-muted">{description}</p>
          </div>

          {/* Actions */}
          {hasActions && (
            <div className="mt-2 flex items-center gap-3">
              {onRetry && (
                <Button variant="primary" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {onGoHome && (
                <Button variant="ghost" onClick={onGoHome}>
                  Go home
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ErrorState.displayName = 'ErrorState';

export default ErrorState;
