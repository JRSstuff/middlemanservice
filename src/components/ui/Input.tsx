import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Accessible label text. Always required for a11y.
   * Pass `hideLabel` to visually hide it while keeping it in the DOM.
   */
  label: string;
  /** Visually hide the label (sr-only). @default false */
  hideLabel?: boolean;
  /** Validation error message displayed below the input. */
  error?: string;
  /** Hint / helper text displayed below the input. */
  hint?: string;
  /** Icon rendered inside the input, aligned left. */
  leftIcon?: React.ReactNode;
  /** Icon rendered inside the input, aligned right. */
  rightIcon?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Auto-ID counter                                                    */
/* ------------------------------------------------------------------ */

let autoIdCounter = 0;

/** Generate a stable auto-incrementing ID when no explicit `id` is provided. */
function useAutoId(explicitId?: string): string {
  const generatedRef = React.useRef<string | null>(null);

  if (explicitId) return explicitId;

  if (generatedRef.current === null) {
    autoIdCounter += 1;
    generatedRef.current = `ss-input-${autoIdCounter}`;
  }

  return generatedRef.current;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Accessible text input for SafeSwap forms.
 *
 * Features automatic `id` ↔ `<label>` linkage, `aria-describedby` wiring
 * for error / hint text, and inner icon slots.
 *
 * Fully compatible with `react-hook-form` via `React.forwardRef`.
 *
 * @example
 * ```tsx
 * <Input label="Email" placeholder="you@example.com" />
 *
 * <Input
 *   label="Amount"
 *   leftIcon={<CurrencyDollar size={16} />}
 *   hint="Enter value in USD"
 *   error={errors.amount?.message}
 *   {...register('amount')}
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hideLabel = false,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      className,
      id: explicitId,
      'aria-describedby': externalDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const id = useAutoId(explicitId);
    const errorId = error ? `${id}-error` : undefined;
    const hintId = hint ? `${id}-hint` : undefined;

    // Build aria-describedby from error, hint, and any externally supplied value
    const describedBy = [externalDescribedBy, errorId, hintId]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {/* Label */}
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium text-ink font-sans',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>

        {/* Input wrapper — provides relative positioning for inner icons */}
        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 flex items-center text-ink-muted"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              // Base
              'w-full h-11 rounded-md bg-white font-sans text-base text-ink',
              'border outline-none',
              'placeholder:text-ink-light',
              // Padding — adjust when icons are present
              leftIcon ? 'pl-10' : 'pl-3',
              rightIcon ? 'pr-10' : 'pr-3',
              // Default border
              !error && 'border-border',
              // Focus
              !error && 'focus:border-green focus-visible:focus-ring',
              // Error border
              error && 'border-blush focus-visible:focus-ring',
              // Disabled
              disabled &&
                'bg-disabled-bg text-disabled-text cursor-not-allowed',
              // Transition
              'transition-colors duration-150',
            )}
            {...rest}
          />

          {/* Right icon */}
          {rightIcon && (
            <span
              className="pointer-events-none absolute right-3 flex items-center text-ink-muted"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-ink bg-blush rounded-sm px-2 py-1 font-sans"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={hintId}
            className="text-sm text-ink-muted font-sans"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
