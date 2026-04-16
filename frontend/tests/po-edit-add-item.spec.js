import { test, expect } from '@playwright/test';

test('PO Edit and Add Item flow', async ({ page }) => {
  await page.goto('http://psrinventory.local/login');
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Logout')).toBeVisible();

  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/i);

  await page.getByRole('button', { name: /reserve po/i }).click();

  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Reserve PO Number' }).first();
  const selects = modal.locator('select');

  await selects.nth(0).selectOption({ index: 1 });
  await selects.nth(1).selectOption({ index: 1 });
  await modal.locator('textarea').fill('PO edit test');

  await modal.getByRole('button', { name: /^reserve$/i }).click();

  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/i, { timeout: 15000 });

  await page.getByRole('button', { name: /edit/i }).click();

  await page.waitForTimeout(2000);

  console.log('BUTTON TEXTS =', await page.getByRole('button').allInnerTexts());
  console.log('BODY SNIPPET =', (await page.locator('body').innerText()).slice(0, 2500));
});