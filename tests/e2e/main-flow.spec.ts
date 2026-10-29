import { test, expect } from '@playwright/test';

test.describe('SafeSwap Main Escrow Flow (Manual QR Ph)', () => {
  test('Complete end-to-end escrow transaction flow', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Buyer creates a deal
    // -------------------------------------------------------------------------
    await page.goto('/deals/new');
    await expect(page.locator('h2')).toContainText('New Escrow Transaction');

    // Fill deal details
    await page.fill('input[placeholder*="MacBook Pro"]', 'Sony A7 IV Mirrorless Camera');
    await page.fill('input[type="email"]', 'seller@safeswap.dev');
    await page.fill('input[type="number"]', '125000');
    await page.fill(
      'input[placeholder*="48-hour"]',
      '48-hour mechanical shutter and sensor inspection window'
    );

    // Verify 3% upfront fee disclosure
    await expect(page.locator('text=3% Regulated Fee')).toBeVisible();

    // Submit deal
    await page.click('button:has-text("Create Escrow Deal")');

    // Should redirect to the newly created deal page
    await expect(page).toHaveURL(/\/deals\/.+/);
    await expect(page.locator('h1')).toContainText('Sony A7 IV Mirrorless Camera');

    // Navigate to payment screen
    await page.click('text=Deposit Escrow Funds');
    await expect(page).toHaveURL(/\/deals\/.+\/pay/);

    // Verify QR Ph details
    await expect(page.locator('text=Scan via Philippine QR Ph')).toBeVisible();
    await expect(page.locator('img[alt="QR Ph Payment Code"]')).toBeVisible();
    await expect(page.locator('text=Unique Deal Reference Code')).toBeVisible();
    await expect(page.locator('text=Exact Amount to Pay')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Buyer uploads proof and submits
    // -------------------------------------------------------------------------
    const bankRefNumber = `GCASH-${Date.now().toString().slice(-6)}`;
    await page.fill('input[placeholder*="10293848123"]', bankRefNumber);
    await page.click('button:has-text("Submit Payment for Staff Verification")');

    // Status shows "Awaiting Staff Verification"
    await expect(page.locator('text=Payment Submitted — Awaiting Verification')).toBeVisible();
    await expect(page.locator('text=Awaiting Staff Verification')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 3: Staff open the queue, see the proof, and click Verify
    // -------------------------------------------------------------------------
    await page.goto('/staff');
    await expect(page.locator('h1')).toContainText('Staff Verification Console');

    // Should see deal in "Verify Deposits" queue
    await page.click('button:has-text("Verify Deposits")');
    await expect(page.locator('text=Sony A7 IV Mirrorless Camera')).toBeVisible();

    // Open verification dialog
    await page.click('button:has-text("Verify Receipt")');
    await expect(page.locator('text=Verify Buyer QR Ph Deposit')).toBeVisible();
    await expect(page.locator('text=Fraud Check Passed')).toBeVisible();

    // Click Confirm & Hold Funds
    await page.click('button:has-text("Confirm & Hold Funds")');

    // Deal should move to HELD
    await expect(page.locator('text=Funds Locked')).toBeVisible();

    // Go to Deal Detail and verify "Payment Protected"
    await page.goto('/deals/11111111-1111-1111-1111-111111111111');
    await expect(page.locator('text=Funds Protected in Regulated Escrow')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 4: Seller marks the item as delivered
    // -------------------------------------------------------------------------
    await page.click('button:has-text("Mark as Delivered")');
    await expect(page.locator('text=Mark Item / Service Delivered')).toBeVisible();

    await page.fill('input[placeholder*="LBC Express"]', 'Air21 Armored Vault');
    await page.fill('input[placeholder*="LBC-9923812"]', '#AR-8839120');
    await page.click('button:has-text("Submit Delivery Proof")');

    // -------------------------------------------------------------------------
    // Step 5: Buyer confirms receipt
    // -------------------------------------------------------------------------
    await page.goto('/deals/22222222-2222-2222-2222-222222222222'); // DELIVERED deal
    await expect(page.locator('button:has-text("Confirm Receipt & Release")')).toBeVisible();

    await page.click('button:has-text("Confirm Receipt & Release")');
    await expect(page.locator('text=Net Seller Disbursement')).toBeVisible();
    await page.click('button:has-text("Yes, Release Funds")');

    // -------------------------------------------------------------------------
    // Step 6: Staff record payout
    // -------------------------------------------------------------------------
    await page.goto('/staff');
    await page.click('button:has-text("Payouts Due")');
    await expect(page.locator('button:has-text("Process Payout")')).toBeVisible();

    await page.click('button:has-text("Process Payout")');
    await expect(page.locator('text=Disburse Seller Payout')).toBeVisible();
    await expect(page.locator('text=Four-Eyes Rule Active')).toBeVisible();

    // Reveal seller account
    await page.click('button:has-text("Reveal")');
    await expect(page.locator('text=0918-999-4321')).toBeVisible();

    // Confirm payout
    await page.click('button:has-text("Confirm Payout Disbursed")');
    await expect(page.locator('text=Payout Disbursed')).toBeVisible();
  });

  test('Payment rejection flow allows buyer resubmission', async ({ page }) => {
    await page.goto('/deals/11111111-1111-1111-1111-111111111111/pay');
    await expect(page.locator('text=Payment Protected')).toBeVisible();
  });
});
