/**
 * @file Badge — status indicator chip for SafeSwap.
 *
 * Variants: success · warning · danger · info · primary
 * Sizes: sm · md
 *
 * @example
 * ```tsx
 * <Badge variant="success" dot>Active</Badge>
 * <Badge variant="danger" size="sm">Disputed</Badge>
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Visual variant of the badge. */
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary';

/** Size preset for the badge. */
export type BadgeSize = 'sm' | 'md';

/** Props for the `<Badge>` component. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Colour / semantic variant. @default 'info' */
  variant?: BadgeVariant;
  /** Size preset. @default 'md' */
  size?: BadgeSize;
  /** Show a small coloured dot before the label. @default false */
  dot?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Style maps                                                                 */
/* -------------------------------------------------------------------------- */

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-lime text-ink',
  warning: 'bg-cream text-ink border border-border',
  danger: 'bg-blush text-ink',
  info: 'bg-white text-ink border border-border',
  primary: 'bg-green text-ink',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
};

/**
 * Dot colour per variant.
 * Uses a slightly more saturated or contextual shade for visual distinction.
 */
const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green',
  warning: 'bg-ink-light',
  danger: 'bg-ink',
  info: 'bg-ink-light',
  primary: 'bg-ink',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Inline status badge / chip.
 *
 * Renders as a `<span>` so it can sit inside headings, table cells, etc.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'info',
      size = 'md',
      dot = false,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        // Base layout
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        // Variant
        variantStyles[variant],
        // Size
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';

export default Badge;
