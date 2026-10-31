import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching browser for high-res README screenshots...');
  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 840 },
    deviceScaleFactor: 2, // HiDPI retina 2x
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const pagesToCapture = [
    {
      name: 'dashboard',
      url: 'http://localhost:5173/',
      waitSelector: 'main',
      desktop: true,
      mobile: true,
    },
    {
      name: 'payment-qrph',
      url: 'http://localhost:5173/deals/33333333-3333-3333-3333-333333333333/pay',
      waitSelector: 'img[alt="QR Ph Payment Code"]',
      desktop: true,
      mobile: true,
    },
    {
      name: 'deal-detail',
      url: 'http://localhost:5173/deals/11111111-1111-1111-1111-111111111111',
      waitSelector: 'h1',
      desktop: true,
      mobile: true,
    },
    {
      name: 'staff-console',
      url: 'http://localhost:5173/staff',
      waitSelector: 'h1',
      desktop: true,
      mobile: true,
    },
    {
      name: 'auth-personas',
      url: 'http://localhost:5173/auth',
      waitSelector: 'h2',
      desktop: true,
      mobile: true,
    },
    {
      name: 'component-gallery',
      url: 'http://localhost:5173/gallery',
      waitSelector: 'h1',
      desktop: true,
      mobile: false,
    },
  ];

  for (const item of pagesToCapture) {
    if (item.desktop) {
      const page = await desktopContext.newPage();
      try {
        await page.goto(item.url, { waitUntil: 'networkidle' });
        if (item.waitSelector) {
          await page.waitForSelector(item.waitSelector, { timeout: 5000 }).catch(() => {});
        }
        await page.waitForTimeout(1200);
        const filePath = path.join(outDir, `desktop-${item.name}.png`);
        await page.screenshot({ path: filePath });
        console.log(`Saved: docs/screenshots/desktop-${item.name}.png`);
      } catch (err) {
        console.error(`Failed to capture desktop ${item.name}:`, err.message);
      } finally {
        await page.close();
      }
    }

    if (item.mobile) {
      const page = await mobileContext.newPage();
      try {
        await page.goto(item.url, { waitUntil: 'networkidle' });
        if (item.waitSelector) {
          await page.waitForSelector(item.waitSelector, { timeout: 5000 }).catch(() => {});
        }
        await page.waitForTimeout(1200);
        const filePath = path.join(outDir, `mobile-${item.name}.png`);
        await page.screenshot({ path: filePath });
        console.log(`Saved: docs/screenshots/mobile-${item.name}.png`);
      } catch (err) {
        console.error(`Failed to capture mobile ${item.name}:`, err.message);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
  console.log('All screenshots captured and saved to docs/screenshots!');
}

capture().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
