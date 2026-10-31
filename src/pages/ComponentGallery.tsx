import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  Badge,
  Timeline,
  Dialog,
  Drawer,
  StatusBanner,
  EmptyState,
  ErrorState,
  Skeleton,
  Tooltip,
  TooltipProvider,
  showToast,
} from '@/components/ui';
import { contrastTable } from '@/design-tokens/contrast-table';
import {
  ShieldCheck,
  Package,
  CheckCircle,
  CurrencyCircleDollar,
  Handshake,
  WarningCircle,
  Clock,
  Sparkle,
  ArrowsClockwise,
} from '@phosphor-icons/react';

export const ComponentGallery: React.FC = () => {
  const [currency, setCurrency] = useState('php');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState<string | null>('offline');
  const [btnLoading, setBtnLoading] = useState(false);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-cream text-ink p-4 sm:p-8 max-w-6xl mx-auto space-y-12">
        {/* Top Header */}
        <header className="border-b border-border pb-6 space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-green rounded-md text-ink">
              <ShieldCheck size={28} weight="duotone" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SafeSwap Component Gallery</h1>
              <p className="text-sm text-ink-muted">
                Fintech design tokens, accessible primitives, and all component states.
              </p>
            </div>
          </div>
        </header>

        {/* Status Banners Demo */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Status Banners</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setActiveBanner('offline')}>
              Show Offline Banner
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActiveBanner('reconnecting')}>
              Show Reconnecting
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActiveBanner('syncing')}>
              Show Syncing
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActiveBanner(null)}>
              Hide Banner
            </Button>
          </div>
          {activeBanner === 'offline' && (
            <StatusBanner
              variant="offline"
              message="You are offline. Safe actions will sync when back online."
              onDismiss={() => setActiveBanner(null)}
            />
          )}
          {activeBanner === 'reconnecting' && (
            <StatusBanner
              variant="reconnecting"
              message="Realtime stream interrupted. Reconnecting to deal status..."
              onDismiss={() => setActiveBanner(null)}
            />
          )}
          {activeBanner === 'syncing' && (
            <StatusBanner
              variant="syncing"
              message="Syncing 2 offline mutation drafts to SafeSwap..."
              onDismiss={() => setActiveBanner(null)}
            />
          )}
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Buttons & States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md">
              <Card.Header>
                <h3 className="font-medium text-sm">Primary</h3>
              </Card.Header>
              <Card.Body className="space-y-3">
                <Button variant="primary" fullWidth>Default</Button>
                <Button variant="primary" leftIcon={<ShieldCheck size={18} />} fullWidth>With Icon</Button>
                <Button variant="primary" isLoading fullWidth>Loading</Button>
                <Button variant="primary" disabled fullWidth>Disabled</Button>
              </Card.Body>
            </Card>

            <Card padding="md">
              <Card.Header>
                <h3 className="font-medium text-sm">Secondary</h3>
              </Card.Header>
              <Card.Body className="space-y-3">
                <Button variant="secondary" fullWidth>Default</Button>
                <Button variant="secondary" leftIcon={<Package size={18} />} fullWidth>Delivery Proof</Button>
                <Button variant="secondary" isLoading fullWidth>Loading</Button>
                <Button variant="secondary" disabled fullWidth>Disabled</Button>
              </Card.Body>
            </Card>

            <Card padding="md">
              <Card.Header>
                <h3 className="font-medium text-sm">Danger</h3>
              </Card.Header>
              <Card.Body className="space-y-3">
                <Button variant="danger" fullWidth>Raise Dispute</Button>
                <Button variant="danger" leftIcon={<WarningCircle size={18} />} fullWidth>Cancel Deal</Button>
                <Button variant="danger" isLoading fullWidth>Loading</Button>
                <Button variant="danger" disabled fullWidth>Disabled</Button>
              </Card.Body>
            </Card>

            <Card padding="md">
              <Card.Header>
                <h3 className="font-medium text-sm">Ghost & Sizes</h3>
              </Card.Header>
              <Card.Body className="space-y-3">
                <Button variant="ghost" fullWidth>Ghost Action</Button>
                <div className="flex gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
                <Button
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1500);
                  }}
                  fullWidth
                >
                  Test Async 1.5s
                </Button>
              </Card.Body>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Badges & Statuses</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="success" dot>Payment Protected (HELD)</Badge>
            <Badge variant="primary" dot>Delivered</Badge>
            <Badge variant="warning" dot>Awaiting Funding</Badge>
            <Badge variant="danger" dot>Disputed</Badge>
            <Badge variant="info">Completed</Badge>
            <Badge variant="success" size="sm">Small Tag</Badge>
          </div>
        </section>

        {/* Inputs & Selects */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Form Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Item / Service Title"
              placeholder="e.g. Vintage Leather Jacket"
              hint="Be specific with model and condition"
            />
            <Input
              label="Protected Amount"
              placeholder="25,000.00"
              leftIcon={<CurrencyCircleDollar size={18} className="text-ink-muted" />}
              hint="Stored in centavos (minor units)"
            />
            <Input
              label="Escrow Reference"
              defaultValue="ES-98342-X"
              error="Reference cannot be modified once funded"
            />
            <Select
              label="Settlement Currency"
              value={currency}
              onValueChange={setCurrency}
              hint="Escrow partner supports PHP and USD"
            >
              <SelectItem value="php">PHP - Philippine Peso (₱)</SelectItem>
              <SelectItem value="usd">USD - US Dollar ($)</SelectItem>
              <SelectItem value="eur">EUR - Euro (€)</SelectItem>
            </Select>
            <Input
              label="Disabled Field"
              disabled
              defaultValue="Locked state"
              hint="Only admin can modify"
            />
            <div className="flex flex-col justify-end">
              <Tooltip content="We never hold money directly in our database. Partner holds all funds.">
                <Button variant="secondary" leftIcon={<ShieldCheck size={18} />}>
                  Hover for Escrow Tooltip
                </Button>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Live Deal Status Timeline</h2>
          <Card padding="lg" className="max-w-2xl">
            <Timeline>
              <Timeline.Item
                icon={<Handshake size={16} />}
                title="Deal Created"
                description="Terms established between Buyer (@alex) and Seller (@maria)"
                timestamp="Oct 29, 2026 08:00 AM"
                status="completed"
              />
              <Timeline.Item
                icon={<ShieldCheck size={16} />}
                title="Payment Funded & Protected"
                description="₱25,000.00 held securely in regulated escrow account"
                timestamp="Oct 29, 2026 08:05 AM"
                status="completed"
              />
              <Timeline.Item
                icon={<Package size={16} />}
                title="Item Delivered"
                description="Seller uploaded tracking receipt #LBC-883921"
                timestamp="Oct 29, 2026 08:12 AM"
                status="current"
              />
              <Timeline.Item
                icon={<CheckCircle size={16} />}
                title="Receipt Confirmation & Fund Release"
                description="Buyer inspects item and confirms receipt. Funds release automatically."
                timestamp="Awaiting Buyer"
                status="upcoming"
              />
            </Timeline>
          </Card>
        </section>

        {/* Dialog, Drawer, Toast Modals */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Feedback & Overlays</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open Dialog Modal
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open Drawer (Mobile Bottom Sheet)
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast.success('Funds Released', '₱24,250.00 transferred to seller account.')}
            >
              Toast Success
            </Button>
            <Button
              variant="danger"
              onClick={() => showToast.error('Dispute Lodged', 'SafeSwap support team has been notified.')}
            >
              Toast Error
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast.info('Auto-release in 48h', 'Review window active.')}
            >
              Toast Info
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Confirm Receipt & Release Funds</Dialog.Title>
              </Dialog.Header>
              <Dialog.Description>
                By confirming, you verify that you received the item in satisfactory condition. ₱24,250.00 will be permanently disbursed to the seller.
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button
                  variant="primary"
                  onClick={() => {
                    setDialogOpen(false);
                    showToast.success('Funds Released', 'Transaction completed successfully!');
                  }}
                >
                  Yes, Release Funds
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Delivery Proof #DP-9921</Drawer.Title>
              </Drawer.Header>
              <Drawer.Description>
                Uploaded by @maria on Oct 29, 2026. LBC Express Tracking: #LBC-883921.
              </Drawer.Description>
              <div className="p-4 bg-white border border-border rounded-md my-4">
                <p className="text-sm font-medium">Tracking Notes:</p>
                <p className="text-xs text-ink-muted mt-1">Package handed over at Pasig branch. Delivery signature required.</p>
              </div>
              <Drawer.Footer>
                <Drawer.Close asChild>
                  <Button variant="secondary" fullWidth>Close</Button>
                </Drawer.Close>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer>
        </section>

        {/* Skeletons */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Skeleton Loaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton.Card />
            <div className="space-y-3 bg-white p-4 border border-border rounded-md">
              <Skeleton.Circle size="48px" />
              <Skeleton.Text width="70%" />
              <Skeleton.Text width="40%" />
              <Skeleton.Button />
            </div>
            <div className="space-y-3 bg-white p-4 border border-border rounded-md">
              <Skeleton height="32px" rounded="sm" />
              <Skeleton height="14px" width="85%" rounded="sm" />
              <Skeleton height="14px" width="60%" rounded="sm" />
              <Skeleton height="44px" rounded="md" />
            </div>
          </div>
        </section>

        {/* Empty & Error States */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Empty & Error States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="md">
              <EmptyState
                icon={<Package size={48} />}
                title="No completed transactions"
                description="Deals you finish will show up in your escrow history."
                action={<Button size="sm">Create New Deal</Button>}
              />
            </Card>
            <Card padding="md">
              <ErrorState
                title="Unable to load transaction timeline"
                description="Network timeout communicating with Supabase Realtime."
                onRetry={() => showToast.info('Retrying connection...')}
              />
            </Card>
          </div>
        </section>

        {/* Contrast Table */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">WCAG AA Contrast Table</h2>
          <div className="overflow-x-auto border border-border rounded-md bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-cream">
                  <th className="p-3 font-semibold">Foreground</th>
                  <th className="p-3 font-semibold">Background</th>
                  <th className="p-3 font-semibold">Ratio</th>
                  <th className="p-3 font-semibold">WCAG AA Body (≥4.5)</th>
                  <th className="p-3 font-semibold">WCAG AA UI (≥3.0)</th>
                  <th className="p-3 font-semibold">Usage</th>
                </tr>
              </thead>
              <tbody>
                {contrastTable.map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0 hover:bg-hover">
                    <td className="p-3 font-mono text-xs">
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5 border border-ink/20" style={{ backgroundColor: row.fgHex }} />
                      {row.foreground} ({row.fgHex})
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className="inline-block w-3 h-3 rounded-full mr-1.5 border border-ink/20" style={{ backgroundColor: row.bgHex }} />
                      {row.background} ({row.bgHex})
                    </td>
                    <td className="p-3 font-mono font-medium font-tabular">
                      {row.ratio.toFixed(2)}:1
                    </td>
                    <td className="p-3">
                      {row.aaBody ? (
                        <span className="text-ink font-semibold">✓ Pass</span>
                      ) : (
                        <span className="text-ink-muted text-xs">N/A (Large/Disabled)</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.aaUI ? (
                        <span className="text-ink font-semibold">✓ Pass</span>
                      ) : (
                        <span className="text-ink-muted text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-ink-muted text-xs">{row.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
};

export default ComponentGallery;
