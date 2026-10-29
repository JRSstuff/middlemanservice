import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { Timeline } from '@/components/ui/Timeline';
import { contrastTable } from '@/design-tokens/contrast-table';

describe('Design Tokens & Contrast Verification', () => {
  it('every body text contrast pair meets WCAG AA (>= 4.5:1)', () => {
    const bodyTextPairs = contrastTable.filter(
      (p) => p.aaBody && !p.usage.includes('decorative') && !p.usage.includes('Disabled'),
    );
    expect(bodyTextPairs.length).toBeGreaterThan(0);
    bodyTextPairs.forEach((pair) => {
      expect(pair.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('no light or white text is paired with pastel backgrounds', () => {
    const invalidPastelPairs = contrastTable.filter(
      (p) =>
        (p.foreground === 'white' || p.fgHex === '#FFFFFF') &&
        ['cream', 'lime', 'blush'].includes(p.background),
    );
    expect(invalidPastelPairs).toHaveLength(0);
  });
});

describe('Button component', () => {
  it('renders primary button by default', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('renders variants: primary, secondary, danger, ghost', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-green');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-white');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blush');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('handles loading state with spinner and disabled', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles disabled state and prevents click', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('fires onClick when active', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Active</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Badge component', () => {
  it('renders badge with correct variants', () => {
    const { rerender } = render(<Badge variant="success">Protected</Badge>);
    expect(screen.getByText('Protected')).toHaveClass('bg-lime');

    rerender(<Badge variant="danger">Disputed</Badge>);
    expect(screen.getByText('Disputed')).toHaveClass('bg-blush');

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText('Pending')).toHaveClass('bg-cream');
  });

  it('renders dot indicator when dot prop is passed', () => {
    render(<Badge dot variant="success">With Dot</Badge>);
    expect(screen.getByText('With Dot')).toBeInTheDocument();
  });
});

describe('Card component', () => {
  it('renders compound sub-components: Header, Body, Footer', () => {
    render(
      <Card>
        <Card.Header>Header Content</Card.Header>
        <Card.Body>Body Content</Card.Body>
        <Card.Footer>Footer Content</Card.Footer>
      </Card>,
    );
    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Body Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('supports interactive card with keyboard activation', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Interactive Card</Card>);
    const card = screen.getByRole('button', { name: /interactive card/i });
    expect(card).toBeInTheDocument();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Input component', () => {
  it('renders label, input, and hint', () => {
    render(<Input label="Deal Amount" hint="Enter in whole pesos" id="deal-amount" />);
    expect(screen.getByLabelText('Deal Amount')).toBeInTheDocument();
    expect(screen.getByText('Enter in whole pesos')).toBeInTheDocument();
  });

  it('displays error message and sets aria-invalid', () => {
    render(<Input label="Deal Amount" error="Amount is required" />);
    const input = screen.getByLabelText('Deal Amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Amount is required');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    render(<Input label="Notes" onChange={handleChange} />);
    const input = screen.getByLabelText('Notes');
    await userEvent.type(input, 'Test notes');
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Timeline component', () => {
  it('renders timeline steps with statuses', () => {
    render(
      <Timeline>
        <Timeline.Item
          icon={<span>1</span>}
          title="Deal Created"
          description="Terms agreed by buyer and seller"
          timestamp="2026-10-29 08:00"
          status="completed"
        />
        <Timeline.Item
          icon={<span>2</span>}
          title="Payment Protected"
          description="Funds deposited in regulated escrow"
          timestamp="2026-10-29 08:05"
          status="current"
        />
        <Timeline.Item
          icon={<span>3</span>}
          title="Delivery"
          description="Awaiting seller delivery proof"
          timestamp="Pending"
          status="upcoming"
        />
      </Timeline>,
    );

    expect(screen.getByText('Deal Created')).toBeInTheDocument();
    expect(screen.getByText('Payment Protected')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('2026-10-29 08:00')).toBeInTheDocument();
  });
});

describe('EmptyState & ErrorState', () => {
  it('renders EmptyState with action', () => {
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No active deals"
        description="You have no transactions in progress."
        action={<Button>Create Deal</Button>}
      />,
    );
    expect(screen.getByText('No active deals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create deal/i })).toBeInTheDocument();
  });

  it('renders ErrorState with retry trigger', async () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to load deals"
        description="Please check your connection and retry."
        onRetry={handleRetry}
      />,
    );
    expect(screen.getByText('Failed to load deals')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBanner', () => {
  it('renders offline warning and handles dismissal', () => {
    const handleDismiss = vi.fn();
    render(
      <StatusBanner
        variant="offline"
        message="You are currently offline. Changes will queue."
        onDismiss={handleDismiss}
      />,
    );
    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton component', () => {
  it('renders skeleton text, circle, button, card', () => {
    const { container } = render(
      <div>
        <Skeleton.Text width="120px" />
        <Skeleton.Circle size="40px" />
        <Skeleton.Button />
        <Skeleton.Card />
      </div>,
    );
    expect(container.querySelectorAll('.skeleton-pulse').length).toBeGreaterThanOrEqual(4);
  });
});
