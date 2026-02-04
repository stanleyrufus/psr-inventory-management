// backend/services/poPdfExtractor.js
import fs from "fs/promises";
import { createRequire } from "module";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ocrPdfWithPoppler } from "../utils/pdfOcr.js";

const require = createRequire(import.meta.url);

// pdf-parse fallback (text extraction)
const pdfParsePkg = require("pdf-parse");
const pdfParseFn =
  typeof pdfParsePkg === "function"
    ? pdfParsePkg
    : typeof pdfParsePkg?.default === "function"
    ? pdfParsePkg.default
    : null;

/* =========================================================
   0) Helpers
   ========================================================= */

function pad2(v) {
  return String(v).padStart(2, "0");
}

function normalizeToIsoDate(str) {
  if (!str) return null;
  const s = String(str).trim();

  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;

  // mm/dd/yy or mm/dd/yyyy or mm-dd-yy
  const us = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (us) {
    let y = us[3];
    if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
    return `${y}-${pad2(us[1])}-${pad2(us[2])}`;
  }

  return null;
}

// "Nov 17, 2025" or "November 17 2025" or "Nov 17 25"
function normalizeMonthNameDate(str) {
  if (!str) return null;
  const s = String(str)
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const months = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  const m = s.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{2,4})\b/
  );
  if (!m) return null;

  const monKey = m[1].toLowerCase();
  const mon = months[monKey];
  if (!mon) return null;

  const day = Number(m[2]);
  let year = String(m[3]);
  if (year.length === 2) year = (Number(year) < 50 ? "20" : "19") + year;

  return `${year}-${pad2(mon)}-${pad2(day)}`;
}

function isMoneyToken(s) {
  const v = String(s || "");
  return (
    /^\$?\d{1,3}(,\d{3})*(\.\d{2})$/.test(v) || // 1,234.56
    /^\$?\d+(\.\d{2})$/.test(v) // 1234.56
  );
}

function toMoney(s) {
  if (!s) return null;
  const clean = String(s).replace(/\$/g, "").replace(/,/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function looksLikePartNumber(s) {
  // Must contain a digit, and be mostly alnum/- and length >= 4
  if (!s) return false;
  const v = String(s).trim();
  return /^[A-Z0-9][A-Z0-9-]{3,}$/.test(v) && /\d/.test(v);
}

function isQtyToken(s) {
  return /^\d+(\.\d+)?$/.test(String(s || ""));
}

function cleanPersonName(s) {
  const v = String(s || "")
    .replace(/\b(attn|attention)\b[: ]*/i, "")
    .replace(/\b(phone|ph|fax|email)\b.*$/i, "")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!v) return null;
  if (v.length > 80) return null;
  return v;
}

/* =========================================================
   1) pdf-parse text extraction
   ========================================================= */

async function parsePdfText(buffer) {
  if (!pdfParseFn) return "";
  const r = await pdfParseFn(buffer);
  return String(r?.text || "");
}

/* =========================================================
   2) pdfjs layout extraction (tokens + rows)
   ========================================================= */

async function extractTokensWithPdfJs(buffer) {
  // ✅ pdfjs requires Uint8Array, not Buffer
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  const doc = await pdfjs.getDocument({ data }).promise;
  const tokens = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    for (const item of content.items || []) {
      const text = String(item.str || "").trim();
      if (!text) continue;

      const t = item.transform || [];
      const x = t[4] ?? 0;
      const y = t[5] ?? 0;

      tokens.push({
        page: p,
        text,
        x,
        y,
        w: item.width ?? 0,
        h: item.height ?? 0,
      });
    }
  }

  return tokens;
}

function tokensToRows(tokens, { yTolerance = 2.5 } = {}) {
  const byPage = new Map();
  for (const tok of tokens) {
    if (!byPage.has(tok.page)) byPage.set(tok.page, []);
    byPage.get(tok.page).push(tok);
  }

  const rows = [];

  for (const [page, list] of byPage.entries()) {
    // sort top->bottom, then left->right
    list.sort((a, b) => b.y - a.y || a.x - b.x);

    const pageRows = [];
    for (const tok of list) {
      let row = pageRows.find((r) => Math.abs(r.y - tok.y) <= yTolerance);
      if (!row) {
        row = { page, y: tok.y, toks: [] };
        pageRows.push(row);
      }
      row.toks.push(tok);
    }

    for (const r of pageRows) {
      r.toks.sort((a, b) => a.x - b.x);
      r.text = r.toks.map((t) => t.text).join(" ").replace(/\s+/g, " ").trim();
      rows.push(r);
    }
  }

  // final order: page asc, y desc
  rows.sort((a, b) => a.page - b.page || b.y - a.y);
  return rows;
}

/**
 * ✅ Build a plain "layout text" from pdfjs rows.
 * Useful when pdf-parse returns empty but pdfjs can still read text.
 */
async function extractTextWithPdfJs(buffer) {
  const tokens = await extractTokensWithPdfJs(buffer);
  if (!tokens.length) return "";

  const rows = tokensToRows(tokens, { yTolerance: 2.5 });
  const text = rows.map((r) => r.text).filter(Boolean).join("\n");
  return String(text || "").trim();
}

function isTotalsRow(text) {
  return /^(subtotal|shipping|freight|tax|total|merchandise|grand\s+total)\b/i.test(
    text || ""
  );
}

function extractLineItemsFromRows(rows) {
  const items = [];

  for (const r of rows) {
    const rowText = r.text || "";
    if (!rowText) continue;
    if (isTotalsRow(rowText)) continue;

    const tokens = rowText.split(" ").filter(Boolean);
    if (tokens.length < 5) continue;

    const partIdx = tokens.findIndex((t) => looksLikePartNumber(t));
    if (partIdx === -1) continue;

    const moneyIdxs = [];
    for (let i = 0; i < tokens.length; i++) {
      if (isMoneyToken(tokens[i])) moneyIdxs.push(i);
    }
    if (moneyIdxs.length < 2) continue;

    const totalIdx = moneyIdxs[moneyIdxs.length - 1];
    const unitIdx = moneyIdxs[moneyIdxs.length - 2];

    const unitPrice = toMoney(tokens[unitIdx]);
    const totalPrice = toMoney(tokens[totalIdx]);
    if (unitPrice == null || totalPrice == null) continue;

    // qty is nearest numeric token before unit price
    let qtyIdx = -1;
    for (let i = unitIdx - 1; i >= 0; i--) {
      if (isQtyToken(tokens[i])) {
        qtyIdx = i;
        break;
      }
    }
    if (qtyIdx === -1) continue;

    let lineNo = null;
    if (/^\d+$/.test(tokens[0])) lineNo = Number(tokens[0]);

    const partNumber = tokens[partIdx];
    const quantity = Number(tokens[qtyIdx]);
    const description = tokens.slice(partIdx + 1, qtyIdx).join(" ").trim();

    items.push({
      lineNo,
      partNumber,
      partName: (description || partNumber).slice(0, 60),
      description: description || "",
      quantity,
      unitPrice,
      totalPrice,
      uom: null,
    });
  }

  // de-dup
  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    const key = `${it.partNumber}|${it.quantity}|${it.unitPrice}|${it.totalPrice}|${it.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }
  return deduped;
}

/* =========================================================
   3) TEXT-BASED ITEMS (McMaster + Generic fallback)
   ========================================================= */

function extractMcMasterItemsSingleLine(lines, headerIdx) {
  const items = [];

  const isMoney = (s) =>
    /^\$?\d{1,3}(,\d{3})*(\.\d{2})$/.test(s) || /^\$?\d+(\.\d{2})$/.test(s);
  const moneyVal = (s) => Number(String(s).replace(/\$/g, "").replace(/,/g, ""));

  const months = new Set([
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  ]);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Stop when totals start
    if (/^(merchandise|shipping|total)\b/i.test(line)) break;

    // Expect at least: lineNo, partNumber, ... qty, Mon, dd, unit, total
    const toks = line.split(/\s+/).filter(Boolean);
    if (toks.length < 8) continue;

    if (!/^\d+$/.test(toks[0])) continue;
    const lineNo = Number(toks[0]);

    const partNumber = toks[1];
    if (!/^[A-Z0-9-]{4,}$/.test(partNumber) || !/\d/.test(partNumber)) continue;

    const totalTok = toks[toks.length - 1];
    const unitTok = toks[toks.length - 2];
    if (!isMoney(unitTok) || !isMoney(totalTok)) continue;

    const unitPrice = moneyVal(unitTok);
    const totalPrice = moneyVal(totalTok);

    let monthIdx = -1;
    for (let j = Math.max(2, toks.length - 8); j < toks.length - 2; j++) {
      const m = toks[j].toLowerCase();
      if (months.has(m)) {
        monthIdx = j;
        break;
      }
    }
    if (monthIdx === -1) continue;

    const qtyTok = toks[monthIdx - 1];
    if (!/^\d+(\.\d+)?$/.test(qtyTok)) continue;
    const quantity = Number(qtyTok);

    const description = toks.slice(2, monthIdx - 1).join(" ").trim();

    items.push({
      lineNo,
      partNumber,
      partName: (description || partNumber).slice(0, 60),
      description: description || "",
      quantity,
      unitPrice,
      totalPrice,
      uom: null,
    });
  }

  return items;
}

function extractMcMasterItemsFromLines(lines, headerIdx) {
  const items = [];
  let i = headerIdx + 1;

  const isDateLikeValue = (s) =>
    /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(String(s || "").trim()) ||
    /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());

  const isUnitWord = (s) => /^(each|packs?)$/i.test(s);
  const isTotalsStart = (s) =>
    /^Merchandise\s+\d+\.\d{2}$/i.test(s) ||
    /^Shipping\s+\d+\.\d{2}$/i.test(s) ||
    /^Total\s+\$?\d+\.\d{2}$/i.test(s);

  while (i < lines.length) {
    const line = lines[i];
    if (isTotalsStart(line)) break;

    const start = line.match(/^(\d+)\s+([A-Z0-9-]+)\s+(.+)$/);
    if (!start) {
      i++;
      continue;
    }

    const lineNo = Number(start[1]);
    const partNumber = start[2];
    let descParts = [start[3]];
    i++;

    while (i < lines.length && !/^\d+(\.\d+)?$/.test(lines[i])) {
      if (isTotalsStart(lines[i])) break;
      if (/^\d+\s+[A-Z0-9-]+\s+/.test(lines[i])) break;
      descParts.push(lines[i]);
      i++;
    }

    if (i >= lines.length) break;

    const qtyLine = lines[i];
    if (!/^\d+(\.\d+)?$/.test(qtyLine)) continue;
    const quantity = Number(qtyLine);
    i++;

    if (i < lines.length && isUnitWord(lines[i])) i++;
    if (i < lines.length && isDateLikeValue(lines[i])) i++;

    if (i >= lines.length) break;
    const unitMatch = lines[i].match(/(\d+\.\d{2})/);
    if (!unitMatch) continue;
    const unitPrice = Number(unitMatch[1]);
    i++;

    if (i < lines.length && /^(per\s+pack|each)$/i.test(lines[i])) i++;

    if (i >= lines.length) break;
    const totalMatch = lines[i].match(/(\d+\.\d{2})/);
    if (!totalMatch) continue;
    const totalPrice = Number(totalMatch[1]);
    i++;

    const description = descParts.join(" ").replace(/\s+/g, " ").trim();

    items.push({
      lineNo,
      partNumber,
      partName: description.slice(0, 60),
      description,
      quantity,
      unitPrice,
      totalPrice,
      uom: null,
    });
  }

  return items;
}

function extractLineItemsText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const headerIdx = lines.findIndex((l) =>
    /^Line\s+Product\s+Ordered\s+Delivers\s+Price\s+Total$/i.test(l)
  );

  if (headerIdx !== -1) {
    const single = extractMcMasterItemsSingleLine(lines, headerIdx);
    if (single.length) return single;

    return extractMcMasterItemsFromLines(lines, headerIdx);
  }

  const fakeRows = lines.map((t, idx) => ({
    page: 1,
    y: 999999 - idx,
    text: t,
  }));
  return extractLineItemsFromRows(fakeRows);
}

/* =========================================================
   4) PO#, Order Date, Vendor + OrderedBy (text best-effort)
   ========================================================= */

function extractPoNumberFromText(text) {
  const raw = String(text || "");
  const norm = raw
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const lines = raw
    .replace(/\u00A0/g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const isPhoneLine = (line) =>
    /\b\d{3}[-./]\d{3}[-./]\d{4}\b/.test(line) ||
    /\b\d{3}\.\d{3}\.\d{4}\b/.test(line);

  const isZipLine = (line) => /\b[A-Z]{2}\b.*\b\d{5}(-\d{4})?\b/.test(line);
  const isDateLine = (line) => /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line);

  const looksLikeAddressNumber = (line, num) => {
    const l = (line || "").toUpperCase();
    if (!num) return false;
    return (
      l.includes(num) &&
      /(SKYLINE|CIR|CIRCLE|ST\b|STREET|AVE|AVENUE|RD\b|ROAD|DR\b|DRIVE|BLVD|LANE|LN\b|HWY)/.test(l)
    );
  };

  const validDigits = (v) => /^\d{4,10}$/.test(String(v || "").trim());

  const priority = [
    { re: /\bCust(?:omer)?\s*P\/?O\b\s*[:#]?\s*([0-9]{4,10})\b/i, group: 1 },
    { re: /\bCustP\/?O\s*[:#]?\s*([0-9]{4,10})\b/i, group: 1 },
    { re: /\bYour\s+P\/?O\b\s*[:#]?\s*([0-9]{4,10})\b/i, group: 1 },
    { re: /\bPO\s*(?:Number|No\.?|#)\b\s*[:#]?\s*([0-9]{4,10})\b/i, group: 1 },
    { re: /\bP\.?\s*O\.?\s*(?:Number|No\.?|#)?\b\s*[:#]?\s*([0-9]{4,10})\b/i, group: 1 },
    {
      re: /\bPurchase\s+Order\b[\s\S]{0,80}?\b([0-9]{5,8})\b(?=\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b)/i,
      group: 1,
    },
  ];

  for (const { re, group } of priority) {
    const m = norm.match(re);
    if (m && validDigits(m[group])) return m[group];
  }

  const fuzzyCustPo = norm.match(
    /\bcust\w{0,10}[\s\W_]{0,10}p[\s\W_]{0,10}o[\s\W_]{0,10}[:#]?\s*([0-9]{4,10})\b/i
  );
  if (fuzzyCustPo && validDigits(fuzzyCustPo[1])) return fuzzyCustPo[1];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes("bill to")) continue;

    const hasPoContext =
      l.includes("cust po") ||
      l.includes("customer po") ||
      l.includes("your po") ||
      l.includes("purchase order") ||
      /\bpo\b/.test(l) ||
      /\bp\/o\b/.test(l) ||
      /\bp\.?\s*o\.?\b/.test(l);

    if (!hasPoContext) continue;

    const window = [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(" ");
    const winLower = window.toLowerCase();

    if (winLower.includes("bill to")) continue;
    if (isPhoneLine(window)) continue;
    if (isZipLine(window)) continue;

    const m = window.match(/\b([0-9]{4,10})\b/);
    if (m && validDigits(m[1])) return m[1];
  }

  const candidates = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (lower.includes("bill to")) continue;
    if (isPhoneLine(line)) continue;
    if (isZipLine(line)) continue;

    const nums = line.match(/\b\d{4,10}\b/g) || [];
    for (const n of nums) {
      if (looksLikeAddressNumber(line, n)) continue;
      if (!validDigits(n)) continue;
      if (isDateLine(line)) continue;
      if (/\bsales\s+order\b/i.test(line)) continue;

      let score = 0;
      const ctx = [lines[i - 1] || "", lines[i] || "", lines[i + 1] || ""].join(" ").toLowerCase();

      if (ctx.includes("cust po") || ctx.includes("cust p/o") || ctx.includes("customer po")) score += 80;
      if (ctx.includes("your po")) score += 60;
      if (ctx.includes("po number") || ctx.includes("p.o")) score += 50;
      if (ctx.includes("purchase order")) score += 40;
      if (/^\d{5,7}$/.test(n)) score += 10;

      candidates.push({ n, score });
    }
  }

  if (norm.toLowerCase().includes("quality")) {
    const m = norm.match(/\b(\d{4,10})\b(?=\s+SKYLINE\s+CIR\b)/i);
    if (m && validDigits(m[1])) return m[1];
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0] && candidates[0].score >= 10) return candidates[0].n;

  return null;
}

function extractOrderDateFromText(text) {
  const raw = String(text || "");

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1) Common: "Order Date: 12/4/2025" or "ORDER DATE: 11/17/2025"
  for (const line of lines) {
    if (/\border\s+date\b/i.test(line)) {
      const dm = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/);
      if (dm) return normalizeToIsoDate(dm[1]);

      const nm = line.match(/\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/);
      const nIso = nm ? normalizeMonthNameDate(nm[1]) : null;
      if (nIso) return nIso;
    }
  }

  // 2) McMaster sometimes uses "Order Placed: Nov 17, 2025"
  for (const line of lines) {
    if (/\border\s+placed\b/i.test(line) || /\bplaced\s+on\b/i.test(line)) {
      const m1 = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
      if (m1) return normalizeToIsoDate(m1[1]);

      const m2 = line.match(/\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/);
      const nIso = m2 ? normalizeMonthNameDate(m2[1]) : null;
      if (nIso) return nIso;
    }
  }

  // 3) Your earlier headerIdx logic (keep it)
  const headerIdx = lines.findIndex((l) => /purchase\s+order.*order\s+date/i.test(l));
  if (headerIdx !== -1 && lines[headerIdx + 1]) {
    const m = lines[headerIdx + 1].match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    if (m) return normalizeToIsoDate(m[1]);
  }

  return null;
}

// Ordered-by is NOT the same as vendor contact.
// For McMaster, "Attn: Pam ..." is PSR ordered-by, not vendor.
function extractOrderedByFromText(text, vendorNameHint) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // 1) Strong label: "Ordered By: John"
  for (const l of lines) {
    const m = l.match(/\bOrdered\s+By\b\s*[:\-]\s*(.+)$/i);
    if (m) {
      const name = cleanPersonName(m[1]);
      if (name) return name;
    }
  }

  // 2) "Attn: Pam Ramnarain" -> For McMaster acknowledgements this is the PSR requester
  const isMcMaster = (vendorNameHint || "").toLowerCase().includes("mcmaster") || lower.includes("mcmaster");
  if (isMcMaster) {
    for (const l of lines) {
      const m = l.match(/\bAttn\b\s*[:\-]\s*(.+)$/i);
      if (m) {
        const name = cleanPersonName(m[1]);
        if (name) return name;
      }
    }
  }

  // 3) Sometimes: "Attention: Pam ..."
  if (isMcMaster) {
    for (const l of lines) {
      const m = l.match(/\bAttention\b\s*[:\-]\s*(.+)$/i);
      if (m) {
        const name = cleanPersonName(m[1]);
        if (name) return name;
      }
    }
  }

  return null;
}

function extractVendorAndOrderedBy(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const cleanCompanyLine = (s) =>
    String(s || "")
      .replace(/\b(acknowledgement|order confirmation|sales order|invoice|packing slip)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const looksLikeCompany = (s) => {
    const v = cleanCompanyLine(s);
    if (!v) return false;
    if (v.length < 3) return false;
    if (/^bill to:|^ship to:|^sold to:|^purchase order\b/i.test(v)) return false;
    if (/\b(inc\.?|llc|l\.l\.c|corp\.?|corporation|company|co\.?|ltd\.?|industries|systems|stainless)\b/i.test(v))
      return true;
    if (v.length <= 40 && /^[A-Z0-9&.,'()\- ]+$/.test(v) && /[A-Z]{3,}/.test(v)) return true;
    return false;
  };

  const extractCityState = () => {
    for (const l of lines) {
      const m = l.match(/\b([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\b/);
      if (m) return { city: m[1].trim(), state: m[2].trim() };
    }
    return { city: null, state: null };
  };

  // email / fax / phone
  const email =
    raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;

  const fax =
    raw.match(/\b(\d{3}[-./]\d{3}[-./]\d{4})\b\s*\(fax\)/i)?.[1] ||
    raw.match(/\bfax\b[: ]*\(?\s*(\d{3}[-./]\d{3}[-./]\d{4})\s*\)?/i)?.[1] ||
    null;

  let phone = null;
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const l = lines[i];
    if (/\bfax\b/i.test(l)) continue;
    const m =
      l.match(/\b(\d{3}[-./]\d{3}[-./]\d{4})\b/) ||
      l.match(/\b(\d{3}\.\d{3}\.\d{4})\b/) ||
      l.match(/\b(\d{3}\/\d{3}-\d{4})\b/);
    if (m) {
      phone = m[1];
      break;
    }
  }

  // ordered by is extracted separately now
  let vendorContactName = null;
  let accountNumber = null;

  // Keep your original “Ordered By” block but treat it as vendor-side contact only
  // (Some vendors have their own “Ordered By” which is NOT PSR; we won't use this for created_by.)
  const obIdx = lines.findIndex((l) => /^ordered\s+by\b/i.test(l));
  if (obIdx !== -1 && lines[obIdx + 1]) {
    const next = lines[obIdx + 1].replace(/order\s+confirmation.*/i, "").trim();
    const m = next.match(/^(.+?)\s+(\d{4,})$/);
    if (m) {
      vendorContactName = m[1].trim();
      accountNumber = m[2].trim();
    } else if (next) {
      vendorContactName = next;
    }
  }

  // vendor name detection
  let name = "Unknown Vendor";

  if (lower.includes("mcmaster")) name = "McMaster-Carr";
  else if (lower.includes("fastenal")) name = "Fastenal";
  else if (lower.includes("jhfoster") || lower.includes("jh foster")) name = "JH Foster";
  else if (lower.includes("quality")) {
    const qLine = lines.find((l) => /quality/i.test(l) && looksLikeCompany(l));
    name = qLine ? cleanCompanyLine(qLine) : "Quality";
  } else {
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (looksLikeCompany(lines[i])) {
        name = cleanCompanyLine(lines[i]);
        break;
      }
    }
  }

  // ✅ CRITICAL FIX:
  // McMaster "Attn: Pam ..." is PSR requester; do NOT save it into vendor contact name.
  if (String(name).toLowerCase().includes("mcmaster")) {
    // if vendorContactName was accidentally set to "Attn ..." style, wipe it
    if (vendorContactName && /\b(attn|attention)\b/i.test(vendorContactName)) {
      vendorContactName = null;
    }
  }

  const { city, state } = extractCityState();

  // orderedBy extracted separately
  const orderedBy = extractOrderedByFromText(raw, name);

  return {
    vendor: {
      name,
      contactName: vendorContactName,
      accountNumber,
      phone,
      fax,
      email,
      city,
      state,
      country: city || state ? "USA" : null,
    },
    orderedBy,
  };
}

/* =========================================================
   5) Totals (best-effort from text + items fallback)
   ========================================================= */

function extractTotalsBestEffort(text, items) {
  let subtotal = null;
  let shipping = null;
  let grandTotal = null;

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  function pickMoney(line) {
    const m = line.replace(/,/g, "").match(/\b([0-9]+\.[0-9]{2})\b/);
    return m ? Number(m[1]) : null;
  }

  for (const line of lines) {
    const v = pickMoney(line);
    if (v == null) continue;

    if (/^\s*(subtotal|merchandise)\b/i.test(line)) subtotal = v;
    else if (/^\s*(shipping|freight)\b/i.test(line)) shipping = v;
    else if (/^\s*(grand\s*total|total)\b/i.test(line) && !/subtotal|merchandise/i.test(line))
      grandTotal = v;
  }

  if (subtotal == null && items?.length) {
    subtotal = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  }

  if (shipping == null) shipping = 0;

  if (grandTotal == null) {
    grandTotal = (subtotal || 0) + (shipping || 0);
  }

  if (grandTotal != null && subtotal != null && grandTotal < subtotal) {
    grandTotal = subtotal + (shipping || 0);
  }

  return {
    subtotal: subtotal ?? 0,
    shipping: shipping ?? 0,
    grandTotal: grandTotal ?? 0,
    taxPercent: 0,
    taxAmount: 0,
  };
}

/* =========================================================
   6) MAIN EXPORT
   ========================================================= */

export async function extractPoFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);

  // -------- 1) pdf-parse text
  let rawText = "";
  try {
    rawText = await parsePdfText(buffer);
  } catch {
    rawText = "";
  }

  let text = String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const dbg = process.env.DEBUG_PDF_IMPORT === "1";
  let usedOcr = false;
  let ocrTextHead = "";
  let ocrTextLen = 0;

  async function runOcr(pages = 2) {
    try {
      const ocrText = await ocrPdfWithPoppler(filePath, pages);
      const t = String(ocrText || "").trim();
      if (t.length > 20) {
        usedOcr = true;
        ocrTextLen = t.length;
        ocrTextHead = t.slice(0, 300);
        return t;
      }
    } catch {}
    return "";
  }

  async function runPdfJsText() {
    try {
      const pdfJsText = await extractTextWithPdfJs(buffer);
      return String(pdfJsText || "").trim();
    } catch {
      return "";
    }
  }

  // -------- 2) First pass extract (from pdf-parse)
  let psrPoNumber = extractPoNumberFromText(text);
  let orderDate = extractOrderDateFromText(text);

  const { vendor, orderedBy } = extractVendorAndOrderedBy(text);

  // -------- 3) If PO missing, FORCE OCR
  if (!psrPoNumber) {
    let ocrText = await runOcr(2);
    if (ocrText) {
      text = ocrText;
      psrPoNumber = extractPoNumberFromText(text);
      orderDate = extractOrderDateFromText(text) || orderDate;
    }

    if (!psrPoNumber) {
      ocrText = await runOcr(3);
      if (ocrText) {
        text = ocrText;
        psrPoNumber = extractPoNumberFromText(text);
        orderDate = extractOrderDateFromText(text) || orderDate;
      }
    }

    if (!psrPoNumber) {
      const pdfJsText = await runPdfJsText();
      if (pdfJsText && pdfJsText.length > text.length) {
        text = pdfJsText;
        psrPoNumber = extractPoNumberFromText(text);
        orderDate = extractOrderDateFromText(text) || orderDate;
      }
    }
  }

  // -------- 4) Items: pdfjs layout items first
  let items = [];
  let pdfJsRowsCount = 0;

  try {
    const tokens = await extractTokensWithPdfJs(buffer);
    const rows = tokensToRows(tokens, { yTolerance: 2.5 });
    pdfJsRowsCount = rows.length;
    items = extractLineItemsFromRows(rows);
  } catch {
    items = [];
  }

  // -------- 5) If pdfjs found no items, use text-based parser
  if (!items.length) {
    items = extractLineItemsText(text);
  }

  const totals = extractTotalsBestEffort(text, items);

  if (dbg) {
    console.log("📄 PDF DEBUG:");
    console.log("  filePath:", filePath);
    console.log("  textLen:", text.length);
    console.log("  textHead:", text.slice(0, 300));
    console.log("  usedOcr:", usedOcr);
    if (usedOcr) {
      console.log("  ocrTextLen:", ocrTextLen);
      console.log("  ocrTextHead:", ocrTextHead);
    }
    console.log("  pdfJsRows:", pdfJsRowsCount);
    console.log("  itemsCount:", items.length);
    console.log("  psrPoNumber:", psrPoNumber);
    console.log("  orderDate:", orderDate);
    console.log("  vendor:", vendor);
    console.log("  orderedBy:", orderedBy);
    console.log("  totals:", totals);
  }

  return {
    vendor,
    orderedBy: orderedBy || null, // ✅ now real PSR person if available (e.g., McMaster Attn)
    psrPoNumber,
    orderDate,
    expectedDeliveryDate: null,
    items,
    currency: text.includes("€") ? "EUR" : text.includes("£") ? "GBP" : "USD",
    ...totals,
    remarks: "",
  };
}
