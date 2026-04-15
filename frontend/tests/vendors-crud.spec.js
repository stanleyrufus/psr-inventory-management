import { test, expect } from '@playwright/test';

const VENDOR_NAME = 'AUTO-VENDOR-' + Date.now();

async function login(page) {
  await page.goto('http://psrinventory.local/login');
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Logout')).toBeVisible();
}

test('Vendors CRUD flow', async ({ page }) => {
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  await login(page);

  await page.getByRole('link', { name: 'Vendors' }).click();
  await expect(page).toHaveURL(/\/vendors$/i);

  await page.getByRole('button', { name: /add vendor/i }).click();

  await page.locator('input[name="vendor_name"]').fill(VENDOR_NAME);
  await page.locator('input[name="contact_name"]').fill('Auto Contact');
  await page.locator('input[name="phone"]').fill('1234567890');
  await page.locator('input[name="email"]').fill('auto@test.com');

  await page.locator('button[type="submit"]').click();

  const searchBox = page.getByPlaceholder(/search name, contact, phone, email/i);
  await searchBox.fill(VENDOR_NAME);

  const vendorCell = page.locator('.ag-center-cols-container')
    .getByText(VENDOR_NAME, { exact: true }).first();

  await vendorCell.click();

  await page.getByRole('button', { name: /edit vendor/i }).click();

  await page.locator('input[name="contact_name"]').fill('Updated Contact');
  await page.locator('textarea[name="remarks"]').fill('Updated by automation');

  await page.locator('button[type="submit"]').click();

  await searchBox.fill(VENDOR_NAME);

  await page.locator('.ag-center-cols-container')
    .getByText(VENDOR_NAME, { exact: true }).first().click();

  await page.getByRole('button', { name: /delete vendor/i }).click();
});