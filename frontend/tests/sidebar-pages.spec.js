import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('http://psrinventory.local/login');

  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/psrinventory\.local\/?$/i, { timeout: 15000 });
  await expect(page.getByText('Logout')).toBeVisible();
}

async function openAndCheck(page, linkName, urlPattern) {
  await page.getByRole('link', { name: linkName }).click();
  await expect(page).toHaveURL(urlPattern, { timeout: 15000 });
  await expect(page.getByText('Logout')).toBeVisible();
}

test('Sidebar main pages load', async ({ page }) => {
  await login(page);

  await openAndCheck(page, 'Products', /\/products$/i);
  await openAndCheck(page, 'Inventory / Parts', /\/parts$/i);
  await openAndCheck(page, 'Vendors', /\/vendors$/i);
  await openAndCheck(page, 'Purchase Orders', /\/purchase-orders$/i);
  await openAndCheck(page, 'Reports', /\/reports$/i);
  await openAndCheck(page, 'Settings', /\/settings$/i);
});