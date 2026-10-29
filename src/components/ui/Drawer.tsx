/**
 * @file Drawer.tsx
 * @description Bottom-sheet drawer component wrapping Vaul.
 * Compound component with Drawer, Drawer.Trigger, Drawer.Content, Drawer.Header,
 * Drawer.Footer, Drawer.Title, Drawer.Description, and Drawer.Close.
 *
 * @example
 * ```tsx
 * <Drawer>
 *   <Drawer.Trigger asChild>
 *     <Button>Open Drawer</Button>
 *   </Drawer.Trigger>
 *   <Drawer.Content>
 *     <Drawer.Header>
 *       <Drawer.Title>Transaction Details</Drawer.Title>
 *     </Drawer.Header>
 *     <Drawer.Description>Review before confirming.</Drawer.Description>
 *     <Drawer.Footer>
 *       <Drawer.Close asChild>
 *         <Button variant="secondary">Cancel</Button>
 *       </Drawer.Close>
 *       <Button>Confirm</Button>
 *     </Drawer.Footer>
 *   </Drawer.Content>
 * </Drawer>
 * ```
 */

import * as React from 'react';
import { Drawer as VaulDrawer } from 'vaul';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Props for the root Drawer component. */
export type DrawerProps = React.ComponentPropsWithoutRef<typeof VaulDrawer.Root>;

/** Props for Drawer.Trigger. */
export type DrawerTriggerProps = React.ComponentPropsWithoutRef<
  typeof VaulDrawer.Trigger
>;

/** Props for Drawer.Content. */
export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof VaulDrawer.Content> {
  /**
   * When true the drag handle indicator is hidden.
   * @default false
   */
  hideHandle?: boolean;
}

/** Props for Drawer.Header. */
export type DrawerHeaderProps = React.HTMLAttributes<HTMLDivElement>;

/** Props for Drawer.Footer. */
export type DrawerFooterProps = React.HTMLAttributes<HTMLDivElement>;

/** Props for Drawer.Title. */
export type DrawerTitleProps = React.ComponentPropsWithoutRef<
  typeof VaulDrawer.Title
>;

/** Props for Drawer.Description. */
export type DrawerDescriptionProps = React.ComponentPropsWithoutRef<
  typeof VaulDrawer.Description
>;

/** Props for Drawer.Close. */
export type DrawerCloseProps = React.ComponentPropsWithoutRef<
  typeof VaulDrawer.Close
>;

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

const overlayStyles = cn('fixed inset-0 z-50 bg-ink/40');

const contentStyles = cn(
  'fixed inset-x-0 bottom-0 z-50',
  'bg-white border-t border-border rounded-t-lg',
  'max-h-[85dvh]',
  'flex flex-col',
  'focus:outline-none',
);

const handleStyles = cn(
  'w-12 h-1.5 bg-border rounded-full mx-auto mt-3 mb-2',
  'shrink-0',
);

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                */
/* -------------------------------------------------------------------------- */

/** Drawer overlay — ink at 40% opacity. */
const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof VaulDrawer.Overlay>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Overlay>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Overlay
    ref={ref}
    className={cn(overlayStyles, className)}
    {...props}
  />
));
DrawerOverlay.displayName = 'DrawerOverlay';

/** Drawer content panel with handle, overlay, and swipe-to-dismiss via Vaul. */
const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof VaulDrawer.Content>,
  DrawerContentProps
>(({ className, children, hideHandle = false, ...props }, ref) => (
  <VaulDrawer.Portal>
    <DrawerOverlay />
    <VaulDrawer.Content
      ref={ref}
      className={cn(contentStyles, className)}
      {...props}
    >
      {/* Drag handle */}
      {!hideHandle && (
        <div className={handleStyles} aria-hidden="true" />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
    </VaulDrawer.Content>
  </VaulDrawer.Portal>
));
DrawerContent.displayName = 'DrawerContent';

/** Header section — flex row with space between title and extras. */
const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex justify-between items-start pb-4', className)}
      {...props}
    />
  ),
);
DrawerHeader.displayName = 'DrawerHeader';

/** Footer section — right-aligned actions with top border. */
const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
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
DrawerFooter.displayName = 'DrawerFooter';

/** Drawer title — text-lg semibold ink. */
const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof VaulDrawer.Title>,
  DrawerTitleProps
>(({ className, ...props }, ref) => (
  <VaulDrawer.Title
    ref={ref}
    className={cn('text-lg font-semibold text-ink', className)}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

/** Drawer description — text-sm muted. */
const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof VaulDrawer.Description>,
  DrawerDescriptionProps
>(({ className, ...props }, ref) => (
  <VaulDrawer.Description
    ref={ref}
    className={cn('text-sm text-ink-muted', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

/* -------------------------------------------------------------------------- */
/*                            Compound Component                              */
/* -------------------------------------------------------------------------- */

/**
 * Bottom-sheet drawer built on Vaul.
 *
 * Features:
 * - Swipe-to-dismiss (Vaul built-in)
 * - Drag handle indicator
 * - Max height 85dvh with scrollable content
 * - Same header/footer/title/description styling as Dialog
 * - Overlay with ink at 40% opacity
 */
const Drawer = Object.assign(VaulDrawer.Root, {
  Trigger: VaulDrawer.Trigger,
  Content: DrawerContent,
  Header: DrawerHeader,
  Footer: DrawerFooter,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Close: VaulDrawer.Close,
});

export { Drawer };
export default Drawer;
