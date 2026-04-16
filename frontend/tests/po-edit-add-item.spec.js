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

  const detailUrl = page.url();
  const poId = detailUrl.match(/\/purchase-orders\/(\d+)$/)?.[1];
  console.log('DETAIL URL BEFORE EDIT =', detailUrl);
  console.log('PO ID =', poId);

  await page.getByRole('button', { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/edit\/\d+$/i, { timeout: 15000 });

  await expect(page.getByText(/order items/i)).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /\+ add part/i }).click();

  const searchPart = page.getByPlaceholder('Search part...').first();
  await expect(searchPart).toBeVisible({ timeout: 15000 });
  await searchPart.click();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  const numberInputs = page.locator('input[type="number"]');
  await expect(numberInputs.nth(0)).toBeVisible();

  await numberInputs.nth(0).fill('2');
  await numberInputs.nth(1).fill('10');

  const saveButton = page.getByRole('button', { name: /save|update/i }).first();
  await saveButton.click();

  await expect(page).toHaveURL(/\/purchase-orders$/i, { timeout: 15000 });
  await expect(page.getByText(/purchase orders/i)).toBeVisible({ timeout: 15000 });

  console.log('FINAL URL =', page.url());
});