import { test, expect } from '@playwright/test';

test('Login Test', async ({ page }) => {
  await page.goto('http://psrinventory.local/login');

  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(3000);

  console.log('FINAL URL =', page.url());
  console.log('PAGE TITLE TEXT =', await page.locator('body').innerText());

  await expect(page).toHaveURL(/psrinventory\.local\/?$/i, { timeout: 15000 });
});