import { test, expect } from '@playwright/test';

test('PO Full Flow - Reserve → Edit → Add Item → Save Draft', async ({ page }) => {

  // =====================================================
  // STEP 1: LOGIN
  // =====================================================
  await page.goto('http://psrinventory.local/login');

  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');

  await page.locator('button[type="submit"]').click();

  await expect(page.getByText('Logout')).toBeVisible();

  // =====================================================
  // STEP 2: NAVIGATE TO PURCHASE ORDERS
  // =====================================================
  await page.getByRole('link', { name: 'Purchase Orders' }).click();

  await expect(page).toHaveURL(/\/purchase-orders$/i);

  // =====================================================
  // STEP 3: CREATE TEST PO USING RESERVE FLOW
  // =====================================================
  await page.getByRole('button', { name: /reserve po/i }).click();

  const modal = page.locator('div.fixed.inset-0')
    .filter({ hasText: 'Reserve PO Number' })
    .first();

  const selects = modal.locator('select');

  // Select Vendor
  await selects.nth(0).selectOption({ index: 1 });

  // Select Reserved By
  await selects.nth(1).selectOption({ index: 1 });

  // Add remarks
  await modal.locator('textarea').fill('Automation PO Full Flow');

  // Submit reserve
  await modal.getByRole('button', { name: /^reserve$/i }).click();

  // Wait for either redirect OR list refresh
  await page.waitForTimeout(3000);

  console.log('URL AFTER RESERVE =', page.url());

  // =====================================================
  // STEP 4: OPEN LATEST PO FROM LIST (ROBUST)
  // =====================================================
  // Always click first row PO number (newest)

  const firstPoRow = page.locator('table tbody tr').first();

  await firstPoRow.click();

  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/i, { timeout: 15000 });

  const detailUrl = page.url();
  console.log('PO DETAIL URL =', detailUrl);

  // =====================================================
  // STEP 5: CLICK EDIT
  // =====================================================
  await page.getByRole('button', { name: /edit/i }).click();

  await expect(page).toHaveURL(/\/purchase-orders\/edit\/\d+$/i, { timeout: 15000 });

  // =====================================================
  // STEP 6: VERIFY MANDATORY FIELDS PRESENT
  // =====================================================
  // Vendor is mandatory (SearchSelect)
  await expect(page.getByPlaceholder('Search vendor...')).toBeVisible();

  // Ordered By exists (select)
  await expect(page.getByText(/ordered by/i)).toBeVisible();

  // =====================================================
  // STEP 7: ADD ITEM ROW
  // =====================================================
  await page.getByRole('button', { name: /\+ add part/i }).click();

  // =====================================================
  // STEP 8: SELECT PART (SearchSelect - readonly input)
  // =====================================================
  const partSearch = page.getByPlaceholder('Search part...').first();

  await partSearch.click();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // =====================================================
  // STEP 9: ENTER QUANTITY & UNIT PRICE
  // =====================================================
  const numberInputs = page.locator('input[type="number"]');

  // quantity
  await numberInputs.nth(0).fill('2');

  // unit price
  await numberInputs.nth(1).fill('10');

  // =====================================================
  // STEP 10: SAVE AS DRAFT
  // =====================================================
  // Save button text may vary (Save / Update)
  await page.getByRole('button', { name: /save|update/i }).first().click();

  // After save → goes back to list
  await expect(page).toHaveURL(/\/purchase-orders$/i, { timeout: 15000 });

  await expect(page.getByText(/purchase orders/i)).toBeVisible();

  console.log('FINAL URL AFTER SAVE =', page.url());
});