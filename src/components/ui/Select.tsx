/**
 * @file Select — styled wrapper around Radix UI Select for SafeSwap.
 *
 * Follows the same visual language as the Input component:
 * 44px trigger height, ink borders, focus-ring, label / error / hint slots.
 *
 * All ARIA semantics (listbox, option, aria-selected, keyboard nav) are
 * handled internally by `@radix-ui/react-select`.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Currency"
 *   placeholder="Choose…"
 *   error="Required"
 *   value={currency}
 *   onValueChange={setCurrency}
 * >
 *   <SelectItem value="php">PHP</SelectItem>
 *   <SelectItem value="usd">USD</SelectItem>
 * </Select>
 * ```
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Props for the root `<Select>` wrapper. */
export interface SelectProps
  extends Omit<SelectPrimitive.SelectProps, 'children'> {
  /** Visible label rendered above the trigger. */
  label?: string;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /** Error message — when present the trigger gets a danger border. */
  error?: string;
  /** Helper text displayed below the trigger (hidden when `error` is set). */
  hint?: string;
  /** Additional class names applied to the outermost wrapper. */
  className?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Select item children (use `<SelectItem>` components). */
  children: React.ReactNode;
}

/** Props for individual `<SelectItem>` options. */
export interface SelectItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {}

/* -------------------------------------------------------------------------- */
/*  Select Item                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A single option inside a `<Select>`.
 *
 * Renders with a checkmark indicator when selected.
 */
export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex h-10 cursor-pointer select-none items-center px-3 pr-8 text-sm text-ink',
      'rounded-sm outline-none',
      'data-[highlighted]:bg-hover',
      'data-[disabled]:pointer-events-none data-[disabled]:text-disabled-text',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

    <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center">
      <Check size={16} weight="bold" aria-hidden="true" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

SelectItem.displayName = 'SelectItem';

/* -------------------------------------------------------------------------- */
/*  Scroll Buttons                                                             */
/* -------------------------------------------------------------------------- */

const ScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex h-6 cursor-default items-center justify-center',
      className,
    )}
    {...props}
  >
    <CaretUp size={14} aria-hidden="true" />
  </SelectPrimitive.ScrollUpButton>
));
ScrollUpButton.displayName = 'SelectScrollUpButton';

const ScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex h-6 cursor-default items-center justify-center',
      className,
    )}
    {...props}
  >
    <CaretDown size={14} aria-hidden="true" />
  </SelectPrimitive.ScrollDownButton>
));
ScrollDownButton.displayName = 'SelectScrollDownButton';

/* -------------------------------------------------------------------------- */
/*  Select (root)                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A styled dropdown select input.
 *
 * Wrap `<SelectItem>` children to define options.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      placeholder = 'Select…',
      error,
      hint,
      className,
      disabled,
      children,
      ...radixProps
    },
    ref,
  ) => {
    const id = React.useId();
    const errorId = error ? `${id}-error` : undefined;
    const hintId = !error && hint ? `${id}-hint` : undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-ink select-none"
          >
            {label}
          </label>
        )}

        {/* Radix Select */}
        <SelectPrimitive.Root disabled={disabled} {...radixProps}>
          {/* Trigger */}
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId ?? hintId}
            className={cn(
              // Layout
              'inline-flex h-11 w-full items-center justify-between gap-2',
              'rounded-md border bg-white px-3 text-sm text-ink',
              // Border
              error ? 'border-blush' : 'border-border',
              // Placeholder colour
              'data-[placeholder]:text-ink-light',
              // States
              'hover:border-ink-light',
              'focus-ring',
              // Disabled
              'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-border',
              // Transition
              'transition-colors duration-100',
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />

            <SelectPrimitive.Icon asChild>
              <CaretDown
                size={16}
                className="shrink-0 text-ink-muted"
                aria-hidden="true"
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          {/* Content (dropdown) */}
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className={cn(
                'z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)]',
                'overflow-hidden rounded-md border border-border bg-white shadow-md',
                // Animation
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                'data-[side=top]:slide-in-from-bottom-2',
                'data-[side=bottom]:slide-in-from-top-2',
              )}
            >
              <ScrollUpButton />
              <SelectPrimitive.Viewport className="p-1">
                {children}
              </SelectPrimitive.Viewport>
              <ScrollDownButton />
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {/* Error message */}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-ink-muted">
            {error}
          </p>
        )}

        {/* Hint text */}
        {!error && hint && (
          <p id={hintId} className="text-xs text-ink-light">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
