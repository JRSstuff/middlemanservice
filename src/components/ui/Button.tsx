import * as React from 'react';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';
import { Spinner } from './Spinner';
import type { SpinnerSize } from './Spinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant. @default 'primary' */
  variant?: ButtonVariant;
  /** Size preset. @default 'md' */
  size?: ButtonSize;
  /** Show a spinner, disable interaction, and preserve button width. */
  isLoading?: boolean;
  /** Stretch to fill parent width. */
  fullWidth?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-green text-ink hover:bg-green/90',
  secondary: 'bg-white border border-border text-ink hover:bg-hover',
  danger: 'bg-blush text-ink hover:bg-blush/90',
  ghost: 'bg-transparent text-ink hover:bg-hover',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 min-h-[44px] px-4 text-base gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/** Map button size → spinner size for visual balance. */
const spinnerSizeMap: Record<ButtonSize, SpinnerSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'md',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Primary interactive button for SafeSwap.
 *
 * Supports four visual variants, three sizes, loading states with an
 * inline spinner, and optional leading / trailing icons.
 *
 * The button fires a 10 ms haptic tap on press (respecting
 * `prefers-reduced-motion`) and plays a subtle scale animation.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={submit}>
 *   Confirm Escrow
 * </Button>
 *
 * <Button variant="secondary" isLoading>
 *   Processing…
 * </Button>
 *
 * <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
 *   Back
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      onMouseDown,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    /**
     * Fire haptic feedback on press and delegate to any consumer-supplied
     * handler. The scale animation is handled purely via CSS `:active`.
     */
    const handleMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) hapticTap();
        onMouseDown?.(e);
      },
      [isDisabled, onMouseDown],
    );

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        onMouseDown={handleMouseDown}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'rounded-md font-sans font-medium',
          'select-none whitespace-nowrap',
          // Press animation — transform only, 100 ms
          'transition-transform duration-100 ease-out',
          'active:scale-[0.97]',
          // Focus ring
          'focus-visible:focus-ring focus-visible:outline-none',
          // Variant & size
          variantStyles[variant],
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          // Disabled
          isDisabled &&
            'bg-disabled-bg text-disabled-text cursor-not-allowed border-transparent hover:bg-disabled-bg active:scale-100',
          // Loading — block pointer events so clicks can't queue
          isLoading && 'pointer-events-none',
          className,
        )}
        {...rest}
      >
        {/* Loading overlay — absolutely positioned to preserve intrinsic width */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner
              size={spinnerSizeMap[size]}
              className="text-current"
            />
          </span>
        )}

        {/* Content — invisible (but layout-preserving) while loading */}
        <span
          className={cn(
            'inline-flex items-center justify-center',
            sizeStyles[size]?.includes('gap') ? '' : 'gap-2',
            isLoading && 'invisible',
          )}
          aria-hidden={isLoading}
        >
          {leftIcon && (
            <span className="inline-flex shrink-0">{leftIcon}</span>
          )}
          {children}
          {rightIcon && (
            <span className="inline-flex shrink-0">{rightIcon}</span>
          )}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
