import { test, expect } from '@playwright/test';

test('PO Reserve flow', async ({ page }) => {
  await page.goto('http://psrinventory.local/login');
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Logout')).toBeVisible();

  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/i);

  await page.getByRole('button', { name: /reserve po/i }).click();

  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Reserve PO Number' }).first();
  await expect(modal.getByText(/reserve po number/i)).toBeVisible();

  const selects = modal.locator('select');
  await expect(selects).toHaveCount(2);

  await selects.nth(0).selectOption({ index: 1 }); // Vendor
  await selects.nth(1).selectOption({ index: 1 }); // Reserved By

  await modal.locator('textarea').fill('Reserved by automation');

  await modal.getByRole('button', { name: /^reserve$/i }).click();

  await expect(modal).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/purchase orders/i)).toBeVisible();
});