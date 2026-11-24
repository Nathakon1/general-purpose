import { test, expect, type Page } from '@playwright/test';
import { join } from 'node:path';

const fx = (n: string) => join(import.meta.dirname, 'fixtures', n);

async function skipOnboarding(page: Page, name = '') {
  await page.goto('./');
  if (name) {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ถัดไป' }).click();
    await page.getByLabel('ชื่อบัญชีของคุณ').fill(name);
    await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  } else {
    await page.getByRole('button', { name: 'ข้าม' }).click();
  }
  await expect(page.getByText('ยังไม่มีรายการ')).toBeVisible();
}

test('F01 import slips, review, save, dedupe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await skipOnboarding(page);
  await page.getByRole('link', { name: '🧾 นำเข้าสลิป' }).click();
  await page.getByTestId('file-input').setInputFiles([fx('slip-a.png'), fx('slip-b.png'), fx('slip-c.png'), fx('not-a-slip.png')]);

  const items = page.getByTestId('review-item');
  await expect(items).toHaveCount(4);
  await expect(page.locator('[data-testid=review-item][data-status=ready]')).toHaveCount(4, { timeout: 170_000 });

  const amounts = await page.getByTestId('review-amount').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(amounts.slice(0, 3)).toEqual(['150.00', '1250.50', '89.00']);
  await expect(page.getByTestId('review-date').nth(0)).toHaveValue('2025-11-19T14:32');
  await expect(page.getByTestId('review-date').nth(1)).toHaveValue('2025-11-20T08:15');
  await expect(page.getByTestId('review-party').nth(1)).toHaveValue('ร้านกาแฟบ้านสวน');
  await expect(page.getByTestId('review-party').nth(0)).toHaveValue(/^นางสาว มะลิ/);
  // coffee shop is guessed as a drink
  await expect(items.nth(1).getByRole('combobox')).toHaveValue(/\d+/);
  expect(await items.nth(1).getByRole('combobox').locator('option:checked').textContent()).toContain('เครื่องดื่ม');
  // the photo that is not a slip is left unticked
  await expect(items.nth(3).getByRole('checkbox')).not.toBeChecked();

  await page.getByTestId('save-all').click();
  await expect(page.getByTestId('tx-row')).toHaveCount(3);

  // Import the same slip again: it is flagged as a duplicate.
  await page.getByRole('link', { name: '🧾 นำเข้าสลิป' }).click();
  await page.getByTestId('file-input').setInputFiles([fx('slip-a.png')]);
  await expect(page.locator('[data-testid=review-item][data-status=duplicate]')).toHaveCount(1, { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('F02 add by hand, F03 edit, F04 summary', async ({ page }) => {
  await skipOnboarding(page);
  await page.locator('a.fab').click();
  await page.getByLabel('จำนวนเงิน (บาท)').fill('45');
  await page.getByRole('button', { name: /อาหาร/ }).click();
  await page.getByLabel('จ่ายให้').fill('ร้านข้าวมันไก่');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByTestId('today-expense')).toHaveText('฿45.00');

  await page.getByTestId('tx-row').first().click();
  await page.getByLabel('จำนวนเงิน (บาท)').fill('60.50');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByTestId('today-expense')).toHaveText('฿60.50');

  await page.getByRole('link', { name: 'สรุป' }).click();
  await expect(page.getByTestId('sum-expense')).toHaveText('฿60.50');
  await page.getByRole('listitem').filter({ hasText: 'อาหาร' }).click();
  await expect(page.getByText('อาหาร · 1 รายการ')).toBeVisible();

  // validation: zero is rejected
  await page.goto('./#/new');
  await page.getByLabel('จำนวนเงิน (บาท)').fill('0');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('ใส่จำนวนเงินมากกว่า 0')).toBeVisible();

  // delete
  await page.goto('./#/');
  await page.getByTestId('tx-row').first().click();
  await page.getByRole('button', { name: 'ลบรายการ' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ลบ' }).click();
  await expect(page.getByText('ยังไม่มีรายการ')).toBeVisible();
});

test('F05 backup and restore, income detection by my name', async ({ page }) => {
  await skipOnboarding(page, 'มะลิ หอมหวาน');
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles([fx('slip-a.png')]);
  await expect(page.locator('[data-testid=review-item][data-status=ready]')).toHaveCount(1, { timeout: 170_000 });
  // receiver is me, so it's income
  await expect(page.getByRole('button', { name: 'รับ', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('save-all').click();
  await expect(page.getByTestId('tx-row')).toHaveCount(1);

  await page.goto('./#/settings');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /สำรองข้อมูล/ }).click();
  const file = await (await dl).path();

  await page.getByRole('button', { name: /ลบข้อมูลทั้งหมด/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ลบทั้งหมด' }).click();
  await page.getByTestId('restore-input').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'กู้คืน' }).click();
  await page.goto('./#/');
  await expect(page.getByTestId('tx-row')).toHaveCount(1);
});
