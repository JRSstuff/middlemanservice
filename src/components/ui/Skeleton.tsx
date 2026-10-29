import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SkeletonRounded = 'sm' | 'md' | 'lg' | 'full';

export interface SkeletonProps {
  /** CSS width value. @default '100%' */
  width?: string;
  /** CSS height value. @default '20px' */
  height?: string;
  /** Border-radius preset. @default 'md' */
  rounded?: SkeletonRounded;
  /** Additional class names. */
  className?: string;
}

export interface SkeletonTextProps {
  /** CSS width value. @default '100%' */
  width?: string;
  /** Additional class names. */
  className?: string;
}

export interface SkeletonCircleProps {
  /** Diameter in CSS units. @default '32px' */
  size?: string;
  /** Additional class names. */
  className?: string;
}

export interface SkeletonCardProps {
  /** Additional class names for the card wrapper. */
  className?: string;
}

export interface SkeletonButtonProps {
  /** Additional class names. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Radius map                                                         */
/* ------------------------------------------------------------------ */

const roundedMap: Record<SkeletonRounded, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/* ------------------------------------------------------------------ */
/*  Base Skeleton                                                      */
/* ------------------------------------------------------------------ */

/**
 * Generic loading-placeholder rectangle.
 *
 * Uses the project's `skeleton-pulse` CSS animation (defined in
 * `index.css`) and the `bg-border` token colour.
 *
 * @example
 * ```tsx
 * <Skeleton width="200px" height="24px" />
 * <Skeleton.Text width="60%" />
 * <Skeleton.Circle size="40px" />
 * <Skeleton.Card />
 * <Skeleton.Button />
 * ```
 */
const SkeletonBase = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width = '100%',
      height = '20px',
      rounded = 'md',
      className,
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn(
        'bg-border skeleton-pulse',
        roundedMap[rounded],
        className,
      )}
      style={{ width, height }}
    />
  ),
);

SkeletonBase.displayName = 'Skeleton';

/* ------------------------------------------------------------------ */
/*  Variant: Text                                                      */
/* ------------------------------------------------------------------ */

/**
 * Single-line text placeholder (16 px tall).
 */
const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ width = '100%', className }, ref) => (
    <SkeletonBase
      ref={ref}
      width={width}
      height="16px"
      rounded="sm"
      className={className}
    />
  ),
);

SkeletonText.displayName = 'Skeleton.Text';

/* ------------------------------------------------------------------ */
/*  Variant: Circle                                                    */
/* ------------------------------------------------------------------ */

/**
 * Circular placeholder (avatar, icon, etc.).
 */
const SkeletonCircle = React.forwardRef<HTMLDivElement, SkeletonCircleProps>(
  ({ size = '32px', className }, ref) => (
    <SkeletonBase
      ref={ref}
      width={size}
      height={size}
      rounded="full"
      className={className}
    />
  ),
);

SkeletonCircle.displayName = 'Skeleton.Circle';

/* ------------------------------------------------------------------ */
/*  Variant: Card                                                      */
/* ------------------------------------------------------------------ */

/**
 * Card-shaped skeleton with a header line and three body lines.
 */
const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className }, ref) => (
    <div
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border p-4',
        className,
      )}
    >
      {/* Header */}
      <SkeletonBase width="40%" height="20px" rounded="sm" />

      {/* Body lines */}
      <SkeletonBase width="100%" height="16px" rounded="sm" />
      <SkeletonBase width="90%" height="16px" rounded="sm" />
      <SkeletonBase width="70%" height="16px" rounded="sm" />
    </div>
  ),
);

SkeletonCard.displayName = 'Skeleton.Card';

/* ------------------------------------------------------------------ */
/*  Variant: Button                                                    */
/* ------------------------------------------------------------------ */

/**
 * Button-shaped placeholder (44 px tall, 128 px wide).
 */
const SkeletonButton = React.forwardRef<HTMLDivElement, SkeletonButtonProps>(
  ({ className }, ref) => (
    <SkeletonBase
      ref={ref}
      width="128px"
      height="44px"
      rounded="md"
      className={cn('h-11 w-32', className)}
    />
  ),
);

SkeletonButton.displayName = 'Skeleton.Button';

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

/**
 * Skeleton loading placeholder system.
 *
 * - `<Skeleton>`        — generic rectangle
 * - `<Skeleton.Text>`   — single text line (16 px)
 * - `<Skeleton.Circle>` — circular (avatar / icon)
 * - `<Skeleton.Card>`   — card with header + 3 lines
 * - `<Skeleton.Button>` — button shape (h-11 w-32)
 */
export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Circle: SkeletonCircle,
  Card: SkeletonCard,
  Button: SkeletonButton,
});

export default Skeleton;
