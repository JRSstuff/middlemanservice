/**
 * @file Card — compound container component for SafeSwap.
 *
 * Variants: default · outlined · filled
 * Sub-components: Card.Header · Card.Body · Card.Footer
 *
 * When an `onClick` handler is provided the card becomes interactive
 * (pointer cursor, hover overlay, press scale, keyboard support).
 *
 * @example
 * ```tsx
 * <Card variant="filled" padding="lg" onClick={() => navigate('/deal/1')}>
 *   <Card.Header>
 *     <h3>Deal #001</h3>
 *     <Badge variant="success">Active</Badge>
 *   </Card.Header>
 *   <Card.Body>Content here</Card.Body>
 *   <Card.Footer>
 *     <Button>View</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Visual variant of the card container. */
export type CardVariant = 'default' | 'outlined' | 'filled';

/** Padding preset for the card container. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/** Props for the root `<Card>` component. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style variant. @default 'default' */
  variant?: CardVariant;
  /** Inner padding preset. @default 'md' */
  padding?: CardPadding;
  /**
   * When provided the card becomes interactive: focusable, clickable,
   * and responds to Enter / Space key-presses.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/** Props for `Card.Header`. */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Props for `Card.Body`. */
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Props for `Card.Footer`. */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/* -------------------------------------------------------------------------- */
/*  Style maps                                                                 */
/* -------------------------------------------------------------------------- */

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-border',
  outlined: 'bg-transparent border border-border',
  filled: 'bg-cream border border-border',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

/** Card header row — flex, bottom border. */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex justify-between items-center pb-3 border-b border-border',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'Card.Header';

/** Card body — vertical padding. */
const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('py-3', className)} {...props} />
  ),
);
CardBody.displayName = 'Card.Body';

/** Card footer row — flex end, top border. */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex justify-end gap-3 pt-3 border-t border-border',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'Card.Footer';

/* -------------------------------------------------------------------------- */
/*  Root Card                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A container card with optional interactivity.
 *
 * Use the compound sub-components (`Card.Header`, `Card.Body`, `Card.Footer`)
 * to compose structured card layouts.
 */
const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      onClick,
      className,
      onKeyDown,
      role,
      tabIndex,
      ...props
    },
    ref,
  ) => {
    const isInteractive = Boolean(onClick);

    /** Handle keyboard activation for interactive cards. */
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);

        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      },
      [onClick, onKeyDown],
    );

    return (
      <div
        ref={ref}
        role={isInteractive ? (role ?? 'button') : role}
        tabIndex={isInteractive ? (tabIndex ?? 0) : tabIndex}
        onClick={onClick}
        onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
        className={cn(
          // Base
          'rounded-md text-ink',
          // Variant
          variantStyles[variant],
          // Padding
          paddingStyles[padding],
          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'transition-transform duration-100',
            'hover:bg-hover',
            'active:scale-[0.99]',
            'focus-ring',
          ],
          className,
        )}
        {...props}
      />
    );
  },
);
CardRoot.displayName = 'Card';

/* -------------------------------------------------------------------------- */
/*  Compound export                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Compound Card component.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>…</Card.Header>
 *   <Card.Body>…</Card.Body>
 *   <Card.Footer>…</Card.Footer>
 * </Card>
 * ```
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default Card;
