import { test, expect } from '@playwright/test';

test('PO persistence flow - reopen and verify saved values', async ({ page }) => {

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
  // STEP 3: RESERVE NEW TEST PO
  // =====================================================
  await page.getByRole('button', { name: /reserve po/i }).click();

  const reserveModal = page.locator('div.fixed.inset-0')
    .filter({ hasText: 'Reserve PO Number' })
    .first();

  const reserveSelects = reserveModal.locator('select');
  await reserveSelects.nth(0).selectOption({ index: 1 }); // Vendor
  await reserveSelects.nth(1).selectOption({ index: 1 }); // Reserved By
  await reserveModal.locator('textarea').fill('Automation persistence flow');

  await reserveModal.getByRole('button', { name: /^reserve$/i }).click();

  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/i, { timeout: 15000 });

  const detailUrl = page.url();
  const poId = detailUrl.match(/\/purchase-orders\/(\d+)$/)?.[1];
  console.log('PO ID =', poId);

  // =====================================================
  // STEP 4: EDIT PO
  // =====================================================
  await page.getByRole('button', { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/edit\/\d+$/i, { timeout: 15000 });

  // =====================================================
  // STEP 5: ADD PART + SAVE VALUES
  // =====================================================
  await page.getByRole('button', { name: /\+ add part/i }).click();

  const partSearch = page.getByPlaceholder('Search part...').first();
  await partSearch.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill('5');   // Qty
  await numberInputs.nth(1).fill('12');  // Unit Price

  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(1).check(); // BO

  await page.getByPlaceholder('Rcvd').fill('3');
  await page.getByPlaceholder('BO').fill('2');

  const allSelects = page.locator('select');
  const receivedBySelect = allSelects.last();
  await receivedBySelect.selectOption({ label: 'Pam' });

  const receivedOnInput = page.locator('input[type="date"]').last();
  await receivedOnInput.fill('2026-04-15');

  await page.getByRole('button', { name: /save|update/i }).first().click();

  await expect(page).toHaveURL(/\/purchase-orders$/i, { timeout: 15000 });

  // =====================================================
  // STEP 6: REOPEN SAME PO
  // =====================================================
  await page.goto(`http://psrinventory.local/purchase-orders/${poId}`);
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${poId}$`, 'i'));

  const bodyText = await page.locator('body').innerText();
  console.log('DETAIL BODY =', bodyText);

  // =====================================================
  // STEP 7: VERIFY SAVED DATA EXISTS
  // =====================================================
  await expect(page.getByText('Pam', { exact: true })).toBeVisible();
await expect(page.getByText(/4\/15\/2026|04\/15\/2026|2026/i).first()).toBeVisible();
await expect(page.getByText(/\$12\.00|\$12/i).first()).toBeVisible();
});