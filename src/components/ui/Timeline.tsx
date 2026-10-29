import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Status of a single timeline step. */
export type TimelineItemStatus = 'completed' | 'current' | 'upcoming';

export interface TimelineItemProps {
  /** Icon rendered inside the circle marker. */
  icon: React.ReactNode;
  /** Primary label for the step. */
  title: string;
  /** Secondary explanation text. */
  description: string;
  /** Timestamp or ID string rendered in monospace. */
  timestamp: string;
  /** Whether this step is completed, current, or upcoming. */
  status: TimelineItemStatus;
}

export interface TimelineProps {
  /** TimelineItem children. */
  children: React.ReactNode;
  /** Additional class names for the outer list. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Style helpers                                                      */
/* ------------------------------------------------------------------ */

/** Circle marker styles per status. */
const circleStyles: Record<TimelineItemStatus, string> = {
  completed: 'bg-lime border-green border',
  current: 'bg-green border-ink border-2',
  upcoming: 'bg-white border-border border border-dashed',
};

/** Line segment (above the circle) styles per status. */
const lineStyles: Record<TimelineItemStatus, string> = {
  completed: 'bg-green',
  current: 'bg-green',
  upcoming: 'bg-border',
};

/* ------------------------------------------------------------------ */
/*  TimelineItem                                                       */
/* ------------------------------------------------------------------ */

/**
 * A single step in a vertical timeline.
 *
 * **Do not use directly** — render inside `<Timeline>` which injects
 * positional context via internal props.
 */
const TimelineItem = React.forwardRef<
  HTMLLIElement,
  TimelineItemProps & {
    /** @internal injected by Timeline — is this the first item? */
    _isFirst?: boolean;
    /** @internal injected by Timeline — is this the last item? */
    _isLast?: boolean;
  }
>(
  (
    {
      icon,
      title,
      description,
      timestamp,
      status,
      _isFirst = false,
      _isLast = false,
    },
    ref,
  ) => {
    const isCurrent = status === 'current';

    return (
      <li
        ref={ref}
        role="listitem"
        aria-current={isCurrent ? 'step' : undefined}
        className="relative flex gap-4"
      >
        {/* ── Left column: line + circle ─────────────────────────── */}
        <div className="relative flex flex-col items-center" aria-hidden="true">
          {/* Line segment above the circle */}
          {!_isFirst ? (
            <span
              className={cn('w-0.5 grow', lineStyles[status])}
            />
          ) : (
            /* Spacer to keep the circle centred vertically */
            <span className="w-0.5 grow" />
          )}

          {/* Circle marker */}
          <span
            className={cn(
              'relative z-10 flex shrink-0 items-center justify-center',
              'h-8 w-8 rounded-full',
              circleStyles[status],
              isCurrent && 'ring-4 ring-green/30',
            )}
          >
            <span className="flex items-center justify-center text-ink [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          </span>

          {/* Line segment below the circle */}
          {!_isLast ? (
            <span
              className={cn(
                'w-0.5 grow',
                /* Use *next* item's line colour — approximate with own status */
                lineStyles[status],
              )}
            />
          ) : (
            <span className="w-0.5 grow" />
          )}
        </div>

        {/* ── Right column: content ──────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-0.5 pb-8 pt-1">
          <span className="text-base font-medium text-ink">{title}</span>
          <span className="text-sm text-ink-muted">{description}</span>
          <span className="mt-0.5 font-mono text-xs text-ink-light">
            {timestamp}
          </span>
        </div>
      </li>
    );
  },
);

TimelineItem.displayName = 'Timeline.Item';

/* ------------------------------------------------------------------ */
/*  Timeline (root)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Vertical timeline showing deal status history.
 *
 * Uses a compound-component API:
 *
 * ```tsx
 * <Timeline>
 *   <Timeline.Item
 *     icon={<CheckCircle weight="fill" />}
 *     title="Escrow funded"
 *     description="Buyer deposited 0.5 SOL"
 *     timestamp="2024-09-15 14:32 UTC"
 *     status="completed"
 *   />
 *   <Timeline.Item
 *     icon={<Package weight="fill" />}
 *     title="Awaiting delivery"
 *     description="Seller should ship the item"
 *     timestamp="2024-09-15 14:35 UTC"
 *     status="current"
 *   />
 *   <Timeline.Item
 *     icon={<HandCoins />}
 *     title="Release funds"
 *     description="Buyer confirms receipt"
 *     timestamp="—"
 *     status="upcoming"
 *   />
 * </Timeline>
 * ```
 */
const TimelineRoot = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ children, className }, ref) => {
    /* Inject positional props (_isFirst / _isLast) into each item. */
    const items = React.Children.toArray(children).filter(React.isValidElement);

    return (
      <ol
        ref={ref}
        role="list"
        aria-label="Deal timeline"
        className={cn('flex flex-col', className)}
      >
        {items.map((child, index) =>
          React.cloneElement(child as React.ReactElement<any>, {
            _isFirst: index === 0,
            _isLast: index === items.length - 1,
          }),
        )}
      </ol>
    );
  },
);

TimelineRoot.displayName = 'Timeline';

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

/**
 * Timeline compound component.
 *
 * - `<Timeline>` — the ordered list wrapper (`role="list"`)
 * - `<Timeline.Item>` — a single step (`role="listitem"`)
 */
export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
});

export default Timeline;
