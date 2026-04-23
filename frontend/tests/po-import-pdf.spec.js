import { test, expect } from '@playwright/test';

test('PO Import PDF flow - import, open detail, verify attachment link', async ({ page, context }) => {

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
  // STEP 3: OPEN IMPORT PDF PAGE
  // =====================================================
  await page.getByRole('button', { name: /import pdf/i }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/import-from-pdf$/i);

  // =====================================================
  // STEP 4: UPLOAD PDF
  // =====================================================
  const pdfPath = 'C:/Users/stanl/Documents/psr-test-files/po-ack-sample.pdf';
  await page.locator('input[type="file"]').setInputFiles(pdfPath);

  // =====================================================
  // STEP 5: START IMPORT
  // =====================================================
  await page.getByRole('button', { name: /import from pdf/i }).click();

  // Import takes time — wait longer
  await page.waitForTimeout(15000);

  console.log('URL AFTER IMPORT =', page.url());
  console.log('BODY AFTER IMPORT =', (await page.locator('body').innerText()).slice(0, 5000));

  // =====================================================
  // STEP 6: GO TO PO LIST
  // =====================================================
  await page.goto('http://psrinventory.local/purchase-orders');
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();

  // Let list load
  await page.waitForTimeout(3000);

  console.log('PO LIST BODY =', (await page.locator('body').innerText()).slice(0, 5000));

  // =====================================================
  // STEP 7: OPEN FIRST PO USING PO NUMBER TEXT
  // =====================================================
  const poNumberCell = page.getByText(/^PO\d/i).first();
  await expect(poNumberCell).toBeVisible({ timeout: 15000 });
  await poNumberCell.click();

  // =====================================================
  // STEP 8: VERIFY DETAIL PAGE LOADS
  // =====================================================
  await expect(page).toHaveURL(/\/purchase-orders\/\d+$/i, { timeout: 15000 });

  console.log('DETAIL URL =', page.url());
  console.log('DETAIL BODY =', (await page.locator('body').innerText()).slice(0, 5000));

  // =====================================================
  // STEP 9: VERIFY ATTACHMENT SECTION EXISTS
  // =====================================================
  await expect(page.getByText(/attachments/i)).toBeVisible();

  // =====================================================
  // STEP 10: VERIFY ATTACHMENT LINK EXISTS AND OPENS
  // =====================================================
  const attachmentLinks = page.locator('a[target="_blank"], a[href*="upload"], a[href*="uploads"]');
  const attachmentCount = await attachmentLinks.count();

  if (attachmentCount === 0) {
    throw new Error('No attachment link found on PO detail page after PDF import.');
  }

  const href = await attachmentLinks.first().getAttribute('href');
  console.log('ATTACHMENT HREF =', href);

  const newPagePromise = context.waitForEvent('page').catch(() => null);
  await attachmentLinks.first().click();

  const newPage = await newPagePromise;
  if (newPage) {
    await newPage.waitForLoadState('domcontentloaded');
    console.log('ATTACHMENT OPENED URL =', newPage.url());
  }
});