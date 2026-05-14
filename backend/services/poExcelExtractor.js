// backend/services/poExcelExtractor.js
import fs from "fs";
import XLSX from "xlsx";

/* ---------------- small helpers ---------------- */

function s(v) {
  return String(v ?? "").trim();
}

function normKey(v) {
  return s(v)
    .toLowerCase()
    .replace(/[\s\r\n\t]+/g, " ")
    .replace(/[^a-z0-9 #.%/()-]/g, "")
    .trim();
}

function toNumber(v, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;
  const raw = String(v).replace(/[,]/g, "");
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function toYmd(v) {
  if (!v) return null;

  // Date object
  if (v instanceof Date && !isNaN(v)) {
    return v.toISOString().slice(0, 10);
  }

  // Excel date serial number
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d?.y && d?.m && d?.d) {
      const yyyy = String(d.y).padStart(4, "0");
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const t = s(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const dt = new Date(t);
  if (!isNaN(dt)) return dt.toISOString().slice(0, 10);

  return null;
}

function sheetToMatrix(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

/* ---------------- PO number detection ---------------- */

function findPoNumber(matrix) {
  const scorePo = (val) => {
    const t = s(val).replace(/\s+/g, "").toUpperCase();

    if (/^PO\d{6}-\d{2}$/.test(t)) return 120;
    if (/^PO\d{8}-\d{4}$/.test(t)) return 110;
    if (/^PSR-?\d{8}-\d{4}$/.test(t)) return 100;
    if (/^105\d{3,6}$/.test(t)) return 70;
    if (/^\d{5,7}$/.test(t)) return 5;

    return 0;
  };

  let best = null;

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < (matrix[r] || []).length; c++) {
      const v = s(matrix[r][c]);
      if (!v) continue;

      const sc = scorePo(v);
      if (sc <= 0) continue;

      if (!best || sc > best.sc) {
        best = { v: v.replace(/\s+/g, ""), sc };
      }
    }
  }

  return best?.v || null;
}
/* ---------------- Vendor detection ---------------- */

function looksLikeVendorName(val) {
  const t = s(val);
  if (!t) return false;
  if (t.length < 2) return false;
  if (t.length > 80) return false;

  const low = t.toLowerCase();

  const bad = [
    "quantity",
    "quantity ordered",
    "quantity shipped",
    "qty",
    "unit price",
    "total price",
    "price",
    "description",
    "ship to",
    "bill to",
    "date ordered",
    "date shipped",
    "purchase order",
    "po",
    "stock",
    "tax",
    "total",
    "subtotal",
    "amount due",
    "freight",
    "shipping",
    "vendor",
  ];

  if (bad.some((b) => low === b || low.includes(b))) return false;

 // reject address-looking rows like "1225 12th Ave. NW"
if (/^\d+\s+/.test(t) && /\b(ave|avenue|st|street|rd|road|dr|drive|cir|circle|ln|lane|nw|ne|sw|se)\b/i.test(t)) {
  return false;
}

// reject phone/contact rows
if (/phone\s*:/i.test(t)) return false;
if (/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(t)) {
  return false;
}

if (!/[A-Za-z]/.test(t)) return false;

  return true;
}
function findVendorName(matrix) {
  // label-based (best)
  const vendorLabels = ["vendor", "supplier", "sold by", "from"];

  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    for (let c = 0; c < (matrix[r] || []).length; c++) {
      const cell = normKey(matrix[r][c]);
      if (!cell) continue;

      if (vendorLabels.includes(cell)) {
        const v = s(matrix[r][c + 1]);
        if (looksLikeVendorName(v)) return v;
      }
    }
  }

  // heuristic scan top-left area for a vendor-like string
  // (most of your shipping/order templates have vendor name near top)
  for (let r = 0; r < Math.min(matrix.length, 18); r++) {
    for (let c = 0; c < Math.min((matrix[r] || []).length, 10); c++) {
      const v = s(matrix[r][c]);
      if (looksLikeVendorName(v)) return v;
    }
  }

  return null;
}

/* ---------------- Table detection ---------------- */

function findHeaderRowIndex(matrix) {
  // We score rows based on presence of common item-table headers
  const tokens = [
    "stock #",
    "stock#",
    "part",
    "part #",
    "part#",
    "description",
    "qty",
    "quantity",
    "quantity ordered",
    "quantity shipped",
    "unit price",
    "price",
    "total price",
    "extended",
    "amount",
  ];

  let best = { idx: -1, score: 0 };

  for (let r = 0; r < matrix.length; r++) {
    const row = (matrix[r] || []).map((x) => normKey(x)).filter(Boolean);
    if (!row.length) continue;

    let sc = 0;
    for (const t of tokens) {
      if (row.includes(t)) sc += 1;
    }

    // require at least 3 hits to be a header row
    if (sc >= 3 && sc > best.score) best = { idx: r, score: sc };
  }

  return best.idx;
}

function mapRowByHeader(row, headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = normKey(headerRow[i]);
    if (!key) continue;
    if (map[key] === undefined) map[key] = row[i];
  }
  return map;
}

function isProbablyHeaderRow(m) {
  // prevents rows like "Quantity Ordered / Unit Price / Total Price" from being treated as items
  const text = Object.values(m || {}).map((x) => s(x).toLowerCase()).join(" ");
  return /quantity|unit price|total price|description|stock #|part #/.test(text) && !/\d/.test(text);
}

function pickColumn(m, keys) {
  for (const k of keys) {
    if (m[k] !== undefined) return m[k];
  }
  return undefined;
}

function derivePartNumberFromDescription(desc) {
  const text = s(desc);
  if (!text) return "";

  const match = text.match(/\b([A-Z0-9]+(?:[-+][A-Z0-9]+)*|\d{6,})\b/i);
  return match?.[1] ? match[1].trim().toUpperCase() : "";
}

function isWeakPartNumber(value) {
  const t = s(value).toUpperCase();
  return !t || t.length < 3 || ["FD", "EA", "PCS", "PC"].includes(t);
}

/* ---------------- main extractor ---------------- */

export async function extractPoFromExcel(filePath) {
  if (!fs.existsSync(filePath)) throw new Error("Excel file not found");

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) throw new Error("Excel has no sheets");

  const ws = wb.Sheets[sheetName];
  const matrix = sheetToMatrix(ws);

  // ✅ PO number (robust)
  const psrPoNumber = findPoNumber(matrix);
  if (!psrPoNumber) {
    throw new Error("Could not detect PO number from Excel");
  }

  // ✅ Vendor (robust)
  const vendorName = findVendorName(matrix) || "Unknown Vendor";

  // optional order date (many shipping templates may not have it)
  const orderDate = null;

  // ✅ Item table
  const headerRowIdx = findHeaderRowIndex(matrix);
  if (headerRowIdx < 0) {
    throw new Error("Could not find item table header row in Excel");
  }

  const headerRow = matrix[headerRowIdx].map((x) => s(x));
  const items = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    if (row.every((x) => s(x) === "")) continue;

    const m = mapRowByHeader(row, headerRow);
    if (isProbablyHeaderRow(m)) continue;

    const desc = s(
      pickColumn(m, ["description", "item description", "part description"]) ?? ""
    );

    const qty = toNumber(
      pickColumn(m, ["quantity ordered", "quantity shipped", "quantity", "qty"]) ?? 0,
      0
    );

    const unitPrice = toNumber(
      pickColumn(m, ["unit price", "price", "unit cost"]) ?? 0,
      0
    );

    let totalPrice = toNumber(
      pickColumn(m, ["total price", "extended", "amount", "ext price"]) ?? 0,
      0
    );

    // skip junk / spacer rows
    const looksEmpty = !desc && qty === 0 && unitPrice === 0 && totalPrice === 0;
    if (looksEmpty) continue;

    // If total is missing or Excel formula results are blank/error -> compute
    if (!totalPrice || totalPrice <= 0) {
      totalPrice = (qty || 0) * (unitPrice || 0);
    }

    const stock = s(
      pickColumn(m, ["stock #", "stock#", "stock", "part #", "part#", "part"]) ?? ""
    );

    // ensurePart() requires partNumber, so we must produce one
    let partNumber = stock;

if (isWeakPartNumber(partNumber)) {
  partNumber = derivePartNumberFromDescription(desc);
}

if (!partNumber) {
  partNumber = desc
    ? desc.slice(0, 60).replace(/\s+/g, " ").toUpperCase()
    : null;
}
    

    items.push({
      partNumber,
      partName: desc,
      description: desc,
      quantity: qty || 0,
      unitPrice: unitPrice || 0,
      totalPrice: totalPrice || 0,
    });
  }

  if (!items.length) {
    throw new Error("Could not extract line items from Excel");
  }

  const subtotal = items.reduce((a, x) => a + toNumber(x.totalPrice, 0), 0);

  return {
    psrPoNumber: String(psrPoNumber).trim(),
    orderDate,
    expectedDeliveryDate: null,
    orderedBy: "Excel Import",
    vendor: {
      name: vendorName,
      contactName: null,
      email: null,
      phone: null,
      fax: null,
      city: null,
      state: null,
      country: null,
    },
    items,
    paymentTerms: null,
    currency: "USD",
    remarks: "Imported from Excel",
    taxPercent: 0,
    shipping: 0,
    subtotal,
    taxAmount: 0,
    grandTotal: subtotal,
    extractionSource: "excel",
  };
}
