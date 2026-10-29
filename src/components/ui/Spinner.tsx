import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spinner size variants.
 * - `sm`: 16×16px — inline indicators, button spinners in small buttons
 * - `md`: 20×20px — default button loading state
 * - `lg`: 24×24px — section-level loading indicators
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /** Visual size of the spinner. @default 'md' */
  size?: SpinnerSize;
  /** Additional CSS classes. */
  className?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Accessible loading spinner.
 *
 * Renders an animated SVG circle that inherits its stroke color from the
 * parent's `currentColor`, making it adaptable to any context.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" className="text-green" />
 * ```
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const px = sizeMap[size];

  return (
    <svg
      role="status"
      aria-label="Loading"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('animate-spin', className)}
    >
      {/* Background track */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.2"
      />
      {/* Animated arc */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.416 31.416"
        strokeDashoffset="10"
      />
    </svg>
  );
};

Spinner.displayName = 'Spinner';

export default Spinner;
