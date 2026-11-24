// Captures screens for review and replica-diff. Run: npx playwright test screens
import { test, expect } from '@playwright/test';
import { join } from 'node:path';
const fx = (n: string) => join(import.meta.dirname, 'fixtures', n);
const out = (n: string) => join(import.meta.dirname, '..', '..', 'replica', 'clone-screens', n);

test('screens', async ({ page }) => {
  await page.goto('./');
  await page.screenshot({ path: out('S01-onboarding.png') });
  await page.getByRole('button', { name: 'ข้าม' }).click();
  await page.screenshot({ path: out('S02-home-empty.png') });
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles([fx('slip-a.png'), fx('slip-b.png'), fx('slip-c.png')]);
  await expect(page.locator('[data-testid=review-item][data-status=ready]')).toHaveCount(3, { timeout: 170_000 });
  await page.screenshot({ path: out('S04-review.png'), fullPage: true });
  await page.getByTestId('save-all').click();
  await expect(page.getByTestId('tx-row')).toHaveCount(3);
  await page.screenshot({ path: out('S02-home.png'), fullPage: true });
  await page.goto('./#/summary');
  await page.getByRole('button', { name: 'เดือนก่อน' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('S07-summary.png'), fullPage: true });
  await page.goto('./#/t/2');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('S05-detail.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/new');
  await page.screenshot({ path: out('S06-new-dark.png') });
});
