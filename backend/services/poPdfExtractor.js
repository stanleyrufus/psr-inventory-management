// backend/services/poPdfExtractor.js
import fs from "fs/promises";
import pdfParse from "pdf-parse";

/**
 * Main entry: given a PDF path, return structured PO data.
 * All dates are returned as YYYY-MM-DD strings where possible.
 */
export async function extractPoFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  const text = (data.text || "").replace(/\r/g, "\n");

  const vendor = extractVendor(text);
  const psrPoNumber = extractPoNumber(text);
  const orderDate = extractOrderDate(text);
  const expectedDeliveryDate = extractExpectedDeliveryDate(text);
  const items = extractLineItems(text);
  const currency = extractCurrency(text);
  const totals = extractTotals(text, items);

  if (!psrPoNumber) {
    throw new Error("Could not detect PO number from PDF");
  }

  return {
    vendor, // { name, contactName, email, phone, city, state, country }
    psrPoNumber,
    orderDate,
    expectedDeliveryDate,
    items, // [{ partNumber, partName, description, quantity, unitPrice, totalPrice }]
    currency,
    ...totals, // { subtotal, taxPercent, taxAmount, shipping, grandTotal }
    remarks: "", // user can update on edit screen
  };
}

/* ---------------- Vendor detection (simple, tweak per vendor) --------------- */

function extractVendor(text) {
  const lower = text.toLowerCase();

  // EXAMPLES – customize as you discover your real vendor names
  if (lower.includes("mcmaster") || lower.includes("mcmaster-carr")) {
    return { name: "McMaster-Carr" };
  }
  if (lower.includes("fastenal")) {
    return { name: "Fastenal" };
  }
  if (lower.includes("quality stainless")) {
    return { name: "Quality Stainless" };
  }

  // Fallback: look for a line starting with something like "Sold To:" or "Bill To:"
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let guessed = null;
  for (const line of lines) {
    if (/^(sold to:|bill to:|ship to:)/i.test(line)) {
      const parts = line.split(":");
      if (parts[1]) {
        guessed = parts[1].trim();
        break;
      }
    }
  }

  return {
    name: guessed || "Unknown Vendor",
  };
}

/* ---------------- PO number ---------------- */

function extractPoNumber(text) {
  // Try patterns like:
  //   Purchase Order 105538
  //   PO #105543
  //   PO 105543
  const poMatch =
    text.match(/Purchase\s+Order\s+([A-Z0-9\-]+)/i) ||
    text.match(/PO\s*#\s*([A-Z0-9\-]+)/i) ||
    text.match(/PO\s+([A-Z0-9\-]+)/i);

  return poMatch ? poMatch[1].trim() : null;
}

/* ---------------- Date helpers ---------------- */

function normalizeToIsoDate(str) {
  if (!str) return null;
  str = str.trim();

  // 2025-12-11 style
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // mm/dd/yyyy or mm-dd-yyyy
  const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usMatch) {
    let [_, m, d, y] = usMatch;
    if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  return null;
}

function pad2(v) {
  return String(v).padStart(2, "0");
}

function extractOrderDate(text) {
  // Look for a line containing "Order Date"
  const lines = text.split("\n");
  for (const line of lines) {
    if (/order date/i.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) return normalizeToIsoDate(dateMatch[1]);
    }
  }

  // Fallback: first date-looking thing
  const anyMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/);
  if (anyMatch) return normalizeToIsoDate(anyMatch[1]);

  return null;
}

function extractExpectedDeliveryDate(text) {
  // Try: "Expected Delivery", "Ship Date", "Delivery Date"
  const lines = text.split("\n");
  for (const line of lines) {
    if (/expected delivery|ship date|delivery date/i.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) return normalizeToIsoDate(dateMatch[1]);
    }
  }
  return null;
}

/* ---------------- Currency & totals (simple) ---------------- */

function extractCurrency(text) {
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  return "USD";
}

function extractTotals(text, items) {
  const lower = text.toLowerCase();
  let subtotal = null;
  let shipping = null;
  let grandTotal = null;

  // Try to catch lines like:
  // Subtotal 366.82
  // Shipping 23.00
  // Total $389.82
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const numMatch = line.replace(/,/g, "").match(/([0-9]+\.[0-9]{2})/);
    if (!numMatch) continue;
    const value = Number(numMatch[1]);

    if (/subtotal/i.test(line)) subtotal = value;
    else if (/shipping/i.test(line)) shipping = value;
    else if (/total/i.test(line) && !/subtotal/i.test(line)) {
      grandTotal = value;
    }
  }

  // Fallback: compute subtotal from line items if not found
  if (subtotal == null && items?.length) {
    subtotal = items.reduce(
      (sum, li) =>
        sum +
        (Number(li.totalPrice) ||
          (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)),
      0
    );
  }

  return {
    subtotal: subtotal ?? 0,
    shipping: shipping ?? 0,
    grandTotal: grandTotal ?? (subtotal ?? 0) + (shipping ?? 0),
    taxPercent: 0,
    taxAmount: 0,
  };
}

/* ---------------- Line items (very generic, tune per vendor) ---------------- */

function extractLineItems(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Find starting index of table header: line that contains Qty & Price
  let startIdx = lines.findIndex((l) =>
    /qty/i.test(l) && (/unit price|price each|each/i.test(l))
  );
  if (startIdx === -1) startIdx = 0; // fallback: try everything

  const itemLines = lines.slice(startIdx + 1);

  const items = [];

  for (const line of itemLines) {
    // Very generic pattern: 
    // PARTNUMBER [spaces] DESCRIPTION ... QTY ... PRICE ... TOTAL
    const numLine = line.replace(/,/g, "");
    const match = numLine.match(
      /^([A-Z0-9\-\._\/]+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/
    );

    if (match) {
      const [, partNumber, description, qtyStr, unitPriceStr, totalStr] = match;
      items.push({
        partNumber: partNumber.trim(),
        partName: description.slice(0, 60),
        description: description.trim(),
        quantity: Number(qtyStr),
        unitPrice: Number(unitPriceStr),
        totalPrice: Number(totalStr),
      });
    }
  }

  // If nothing matched, just return empty list → user will add manually
  return items;
}
