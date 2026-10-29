/**
 * @file Tooltip — styled wrapper around Radix UI Tooltip for SafeSwap.
 *
 * Provides a simple `content` prop API: just wrap any trigger element and
 * pass the tooltip text via `content`.
 *
 * Remember to wrap your app root with `<TooltipProvider>` (exported from
 * this module) so delay / skip-delay settings are shared.
 *
 * @example
 * ```tsx
 * // In App.tsx or layout:
 * import { TooltipProvider } from '@/components/ui/Tooltip';
 * <TooltipProvider>
 *   <App />
 * </TooltipProvider>
 *
 * // Usage:
 * import { Tooltip } from '@/components/ui/Tooltip';
 * <Tooltip content="Copy wallet address">
 *   <button><CopySimple /></button>
 * </Tooltip>
 * ```
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Props for `<TooltipProvider>` (app-level wrapper). */
export interface TooltipProviderProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {}

/** Props for the `<Tooltip>` component. */
export interface TooltipProps {
  /** Tooltip text (or ReactNode) displayed on hover / focus. */
  content: React.ReactNode;
  /** Preferred side. @default 'top' */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Pixel offset from the trigger. @default 4 */
  sideOffset?: number;
  /** Trigger alignment. @default 'center' */
  align?: 'start' | 'center' | 'end';
  /** Extra class names for the content bubble. */
  contentClassName?: string;
  /**
   * The trigger element. Must accept a `ref` (use `forwardRef` on custom
   * components). A single React element is expected.
   */
  children: React.ReactNode;
  /** Control open state externally (uncontrolled by default). */
  open?: boolean;
  /** Callback when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Delay in ms before showing. Falls back to the Provider value. */
  delayDuration?: number;
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * App-level tooltip provider. Wrap your root once so all tooltips share
 * the same delay / skip-delay configuration.
 *
 * @default delayDuration 300
 * @default skipDelayDuration 150
 */
export function TooltipProvider({
  delayDuration = 300,
  skipDelayDuration = 150,
  children,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

TooltipProvider.displayName = 'TooltipProvider';

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Styled tooltip with a simple `content` prop API.
 *
 * The tooltip appears on hover & keyboard focus with a short delay.
 * An ink-coloured bubble with white text — the **one** approved case of
 * light-on-dark text in the design system.
 */
export function Tooltip({
  content,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  contentClassName,
  children,
  open,
  onOpenChange,
  delayDuration,
}: TooltipProps) {
  if (!content) {
    // Nothing to show — render trigger as-is.
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          align={align}
          className={cn(
            // Visuals — ink bg, white text (approved dark-bg exception)
            'bg-ink text-white text-xs font-normal',
            'px-2 py-1 rounded-sm shadow-md max-w-[200px]',
            // Prevent text selection
            'select-none',
            // Animation
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=top]:slide-in-from-bottom-1',
            'data-[side=right]:slide-in-from-left-1',
            'data-[side=bottom]:slide-in-from-top-1',
            'data-[side=left]:slide-in-from-right-1',
            contentClassName,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

Tooltip.displayName = 'Tooltip';

export default Tooltip;
