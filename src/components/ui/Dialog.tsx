/**
 * @file Dialog.tsx
 * @description Accessible modal dialog component wrapping Radix UI Dialog.
 * Compound component with Dialog, Dialog.Trigger, Dialog.Content, Dialog.Header,
 * Dialog.Footer, Dialog.Title, Dialog.Description, and Dialog.Close.
 *
 * @example
 * ```tsx
 * <Dialog>
 *   <Dialog.Trigger asChild>
 *     <Button>Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Confirm Action</Dialog.Title>
 *     </Dialog.Header>
 *     <Dialog.Description>Are you sure you want to proceed?</Dialog.Description>
 *     <Dialog.Footer>
 *       <Dialog.Close asChild>
 *         <Button variant="secondary">Cancel</Button>
 *       </Dialog.Close>
 *       <Button>Confirm</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog>
 * ```
 */

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Props for the root Dialog component. */
export type DialogProps = RadixDialog.DialogProps;

/** Props for Dialog.Trigger. */
export type DialogTriggerProps = RadixDialog.DialogTriggerProps;

/** Props for Dialog.Content. */
export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  /**
   * When true, the built-in close button (top-right X) is hidden.
   * Useful when you provide your own close mechanism.
   * @default false
   */
  hideCloseButton?: boolean;

  /**
   * Accessible title for screen readers when no visible Dialog.Title is rendered.
   * Wraps a hidden <Dialog.Title> via VisuallyHidden.
   */
  ariaTitle?: string;
}

/** Props for Dialog.Header. */
export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

/** Props for Dialog.Footer. */
export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

/** Props for Dialog.Title. */
export type DialogTitleProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Title
>;

/** Props for Dialog.Description. */
export type DialogDescriptionProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Description
>;

/** Props for Dialog.Close. */
export type DialogCloseProps = RadixDialog.DialogCloseProps;

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

const overlayStyles = cn(
  'fixed inset-0 z-50 bg-ink/40',
  // Animation — respects prefers-reduced-motion
  'data-[state=open]:animate-in data-[state=open]:fade-in-0',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
  'motion-reduce:animate-none',
);

const contentStyles = cn(
  'fixed inset-0 z-50 flex items-center justify-center',
  'pointer-events-none',
);

const contentInnerStyles = cn(
  'pointer-events-auto',
  'bg-white border border-border rounded-lg shadow-lg',
  'max-w-md w-[calc(100%-32px)] mx-auto p-6',
  'relative',
  // Focus outline
  'focus:outline-none',
  // Animation — respects prefers-reduced-motion
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
  'motion-reduce:animate-none',
);

const closeButtonStyles = cn(
  'absolute top-4 right-4',
  'h-8 w-8 flex items-center justify-center',
  'rounded-sm text-ink-muted',
  'hover:bg-hover active:bg-pressed',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  'transition-colors',
  'cursor-pointer',
  'disabled:pointer-events-none disabled:opacity-50',
);

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                */
/* -------------------------------------------------------------------------- */

/** Dialog overlay with fade animation. */
const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(overlayStyles, className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

/** Dialog content panel with overlay, close button, and a11y fallback title. */
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton = false, ariaTitle, ...props }, ref) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <div className={contentStyles}>
      <RadixDialog.Content
        ref={ref}
        className={cn(contentInnerStyles, className)}
        {...props}
      >
        {/* Accessible fallback title when no visible title is rendered */}
        {ariaTitle && (
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>{ariaTitle}</RadixDialog.Title>
          </VisuallyHidden.Root>
        )}

        {children}

        {!hideCloseButton && (
          <RadixDialog.Close className={closeButtonStyles} aria-label="Close dialog">
            <X size={18} weight="bold" aria-hidden />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </div>
  </RadixDialog.Portal>
));
DialogContent.displayName = 'DialogContent';

/** Header section — flex row with space for title and close button. */
const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex justify-between items-start pb-4', className)}
      {...props}
    />
  ),
);
DialogHeader.displayName = 'DialogHeader';

/** Footer section — right-aligned actions with top border. */
const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex justify-end gap-3 pt-4 border-t border-border mt-4',
        className,
      )}
      {...props}
    />
  ),
);
DialogFooter.displayName = 'DialogFooter';

/** Dialog title — text-lg semibold ink. */
const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Title>,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn('text-lg font-semibold text-ink', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

/** Dialog description — text-sm muted. */
const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Description>,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn('text-sm text-ink-muted', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

/* -------------------------------------------------------------------------- */
/*                            Compound Component                              */
/* -------------------------------------------------------------------------- */

/**
 * Accessible modal dialog built on Radix UI Dialog.
 *
 * Features:
 * - Focus trap and scroll lock (Radix built-in)
 * - Overlay with ink at 40% opacity, no blur
 * - Fade + scale animations respecting prefers-reduced-motion
 * - Built-in close button with keyboard support
 * - VisuallyHidden title fallback for a11y
 */
const Dialog = Object.assign(RadixDialog.Root, {
  Trigger: RadixDialog.Trigger,
  Content: DialogContent,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: RadixDialog.Close,
});

export { Dialog };
export default Dialog;
