import { test, expect } from '@playwright/test';

test('PO Receive and BO flow', async ({ page }) => {

  // =====================================================
  // STEP 1: LOGIN
  // =====================================================
  await page.goto('http://psrinventory.local/login');
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Logout')).toBeVisible();

  // =====================================================
  // STEP 2: GO TO PURCHASE ORDERS
  // =====================================================
  await page.getByRole('link', { name: 'Purchase Orders' }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/i);

  // =====================================================
  // STEP 3: RESERVE A TEST PO
  // =====================================================
  await page.getByRole('button', { name: /reserve po/i }).click();

  const reserveModal = page.locator('div.fixed.inset-0')
    .filter({ hasText: 'Reserve PO Number' })
    .first();

  const reserveSelects = reserveModal.locator('select');

  await reserveSelects.nth(0).selectOption({ index: 1 }); // Vendor
  await reserveSelects.nth(1).selectOption({ index: 1 }); // Reserved By
  await reserveModal.locator('textarea').fill('Automation PO receive/BO flow');

  await reserveModal.getByRole('button', { name: /^reserve$/i }).click();

  await page.waitForTimeout(3000);

  if (!/\/purchase-orders\/\d+$/i.test(page.url())) {
    throw new Error('Reserve did not land on PO detail page');
  }

  console.log('PO DETAIL URL =', page.url());

  // =====================================================
  // STEP 4: EDIT PO
  // =====================================================
  await page.getByRole('button', { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/edit\/\d+$/i, { timeout: 15000 });

  // =====================================================
  // STEP 5: ADD ONE PART
  // =====================================================
  await page.getByRole('button', { name: /\+ add part/i }).click();

  const partSearch = page.getByPlaceholder('Search part...').first();
  await expect(partSearch).toBeVisible();
  await partSearch.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill('5');   // Qty
  await numberInputs.nth(1).fill('12');  // Unit Price

  // =====================================================
  // STEP 6: MARK BACKORDER CASE
  // =====================================================
  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(1).check(); // BO checkbox

  await expect(page.getByPlaceholder('Rcvd')).toBeVisible();
  await expect(page.getByPlaceholder('BO')).toBeVisible();

  await page.getByPlaceholder('Rcvd').fill('3');
  await page.getByPlaceholder('BO').fill('2');

  // =====================================================
  // STEP 7: FILL RECEIVED SECTION
  // =====================================================
  const allSelects = page.locator('select');
  const receivedBySelect = allSelects.last();
  await receivedBySelect.selectOption({ label: 'Pam' });

  const receivedOnInput = page.locator('input[type="date"]').last();
  await receivedOnInput.fill('2026-04-15');

  // =====================================================
  // STEP 8: SAVE
  // =====================================================
  await page.getByRole('button', { name: /save|update/i }).first().click();

  await expect(page).toHaveURL(/\/purchase-orders$/i, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();

  console.log('FINAL URL AFTER SAVE =', page.url());
});