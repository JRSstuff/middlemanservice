import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  /** Large icon displayed above the title. */
  icon: React.ReactNode;
  /** Primary heading text. */
  title: string;
  /** Secondary explanation text. */
  description: string;
  /** Optional call-to-action, e.g. a Button. */
  action?: React.ReactNode;
  /** Additional class names for the outer wrapper. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Centred empty-state placeholder for lists and pages with no data.
 *
 * Renders a large icon, a title, a description, and an optional action
 * button — all vertically centred.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Inbox size={48} />}
 *   title="No deals yet"
 *   description="Create your first escrow deal to get started."
 *   action={<Button>New Deal</Button>}
 * />
 * ```
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12',
        className,
      )}
    >
      {/* Icon */}
      <span
        className="flex items-center justify-center text-ink-light [&>svg]:h-12 [&>svg]:w-12"
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Copy */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-lg font-medium text-ink">{title}</h3>
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      </div>

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  ),
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
