import { test, expect } from '@playwright/test';

const PART_NUMBER = 'AUTO-' + Date.now();

async function login(page) {
  await page.goto('http://psrinventory.local/login');
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Logout')).toBeVisible();
}

test('Parts CRUD flow', async ({ page }) => {
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  await login(page);

  await page.getByRole('link', { name: 'Inventory / Parts' }).click();
  await expect(page).toHaveURL(/\/parts$/i);

  await page.getByRole('button', { name: /add part/i }).click();

  await page.locator('input[name="part_number"]').fill(PART_NUMBER);
  await page.locator('textarea[name="description"]').fill('Created by automation');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample1.png');

  await page.locator('button[type="submit"]').click();

  await expect(page.getByText(PART_NUMBER)).toBeVisible({ timeout: 15000 });

  await page.getByText(PART_NUMBER).click();
  await expect(page.getByText(/part details/i)).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.locator('textarea[name="description"]').fill('Updated by automation');
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample2.png');
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText(PART_NUMBER)).toBeVisible({ timeout: 15000 });

  await page.getByText(PART_NUMBER).click();
  await page.getByRole('button', { name: 'Delete' }).click();
});