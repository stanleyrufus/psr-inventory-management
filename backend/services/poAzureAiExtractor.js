// backend/services/poAzureAiExtractor.js
import "dotenv/config";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { pdfToPngPages } from "../utils/pdfToPng.js";

const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";

function toBase64(buffer) {
  return buffer.toString("base64");
}

function stripCodeFences(s) {
  if (!s) return s;
  return String(s).replace(/```json/gi, "").replace(/```/g, "").trim();
}

function safeJsonParse(s) {
  try {
    return JSON.parse(stripCodeFences(s));
  } catch {
    return null;
  }
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNullNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNullStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizePhone(v) {
  const s = toNullStr(v);
  return s ? s.replace(/\s+/g, " ").trim() : null;
}

function isPersonLikeName(v) {
  const s = String(v || "").trim();
  if (!s) return false;
  if (s.length > 80) return false;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  return /^[A-Za-z .'-]+$/.test(s);
}

function sanitizeAttnAndOrderedBy(result) {
  if (!result || !result.vendor) return result;

  const vendorName = String(result.vendor.name || "").toLowerCase();
  const contact = String(result.vendor.contactName || "").trim();

  const m = contact.match(/\battn\b[:\-]?\s*(.+)$/i);
  if (m?.[1]) {
    const name = String(m[1]).trim();
    if (!result.orderedBy && name) result.orderedBy = name;
    result.vendor.contactName = null;
  }

  if (vendorName.includes("mcmaster")) {
    const cn = String(result.vendor.contactName || "").trim();
    if (cn && isPersonLikeName(cn)) {
      if (!result.orderedBy) result.orderedBy = cn;
      result.vendor.contactName = null;
    }
  }

  return result;
}

/**
 * ✅ STRONG totals normalization:
 * - force numeric
 * - if subtotal/grandTotal are missing or 0 but items have totals, compute from items
 * - infer tax when possible
 */
function normalizeTotals(result) {
  if (!result) return result;

  // normalize numeric first
  result.subtotal = toNum(result.subtotal);
  result.shipping = toNum(result.shipping);
  result.taxAmount = toNum(result.taxAmount);
  result.taxPercent = toNum(result.taxPercent);
  result.grandTotal = toNum(result.grandTotal);

  // sum line totals from items (robust)
  const items = Array.isArray(result.items) ? result.items : [];
  const itemsSum = items.reduce((sum, it) => {
    const lt = toNum(it?.totalPrice);
    return sum + (lt > 0 ? lt : 0);
  }, 0);

  // If PDF totals are blank/0 but line totals exist, compute subtotal from line totals
  if ((result.subtotal <= 0 || !Number.isFinite(result.subtotal)) && itemsSum > 0) {
    result.subtotal = Number(itemsSum.toFixed(2));
  }

  // If grandTotal missing/0, compute from subtotal + shipping + tax
  if ((result.grandTotal <= 0 || !Number.isFinite(result.grandTotal)) && result.subtotal > 0) {
    result.grandTotal = Number(
      (result.subtotal + (result.shipping || 0) + (result.taxAmount || 0)).toFixed(2)
    );
  }

  // If tax is 0 but grandTotal and subtotal imply tax, infer it
  if (
    (result.taxAmount === 0 || result.taxAmount === null) &&
    result.grandTotal > 0 &&
    result.subtotal > 0
  ) {
    const inferred = result.grandTotal - result.subtotal - (result.shipping || 0);
    if (inferred > 0 && inferred < result.grandTotal) {
      result.taxAmount = Number(inferred.toFixed(2));
    }
  }

  // Safety: if grandTotal < subtotal, recompute
  if (result.grandTotal < result.subtotal) {
    result.grandTotal = Number(
      (result.subtotal + (result.shipping || 0) + (result.taxAmount || 0)).toFixed(2)
    );
  }

  return result;
}

/**
 * Extract PO data using Azure OpenAI Vision.
 */
export async function extractPoWithAzureAi(pdfPath, { pages = 1, debug = false } = {}) {
  if (!endpoint || !deployment || !apiKey) {
    throw new Error("Azure OpenAI config missing");
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const { tmpDir, pngs } = await pdfToPngPages(pdfPath, pages, 300);
  if (!pngs.length) throw new Error("No PNG pages produced from PDF");

  const imageParts = [];
  for (const p of pngs) {
    const buf = await fs.readFile(p);
    const b64 = toBase64(buf);
    imageParts.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${b64}` },
    });
  }

  const system = `
You are a purchasing document extractor.
Return ONLY valid JSON (no markdown, no code fences).

CRITICAL RULES (avoid wrong PO numbers):
- PO number must be the customer's purchase order number (PSR's PO).
- DO NOT use address numbers, ship-to codes, customer IDs, invoice numbers, sales order numbers.
- If document is a SALES ORDER / ACKNOWLEDGEMENT and the customer PO is NOT present, return poNumber as null.
- If multiple numbers exist, choose ONLY the number explicitly labeled as "PO", "P.O.", "Purchase Order", or "Customer PO".

ORDERED BY (PSR person):
- orderedBy is the PSR person who placed/requested the order.
- Look for labels like: "Attn:", "Attention:", "Requested by", "Placed by", "Ordered by", "Buyer".
- IMPORTANT: "Attn: <PSR name>" is PSR orderedBy, NOT vendor contact.

DATES:
- orderDate must be ISO format YYYY-MM-DD if found, else null.

TOTALS:
- totals must be numbers (no currency symbols).
- If tax is not explicitly labeled but grandTotal and subtotal are present:
  tax = grandTotal - subtotal - shipping (assume shipping 0 if missing).
- Return best numeric extraction; do NOT default tax to 0 if totals show a difference.

ITEMS:
- Extract: partNumber (if present), description, qty, unitPrice, lineTotal.
- If uncertain, set field null instead of guessing.

VENDOR:
- vendor.name is the supplier company name.
- vendor.contactName should be a VENDOR rep (not PSR buyer). If you only see "Attn: <PSR name>", put that into orderedBy and set vendor.contactName null.

Return JSON with this exact shape:
{
  "vendor": {
    "name": string|null,
    "contactName": string|null,
    "accountNumber": string|null,
    "phone": string|null,
    "fax": string|null,
    "email": string|null,
    "city": string|null,
    "state": string|null,
    "country": string|null
  },
  "orderedBy": string|null,
  "poNumber": string|null,
  "orderDate": string|null,
  "totals": { "subtotal": number, "shipping": number, "tax": number, "grandTotal": number },
  "items": [ { "partNumber": string|null, "description": string|null, "qty": number|null, "unitPrice": number|null, "lineTotal": number|null } ]
}
`.trim();

  const payload = {
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [{ type: "text", text: "Extract the purchase order data from these pages." }, ...imageParts],
      },
    ],
    temperature: 0,
    max_tokens: 1800,
  };

  if (debug) console.log("AI calling pages:", pngs);

  try {
    const resp = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      timeout: 90000,
    });

    const raw = resp.data?.choices?.[0]?.message?.content?.trim() || "";
    const ai = safeJsonParse(raw);

    if (!ai) {
      if (debug) console.log("AI raw response:", raw);
      throw new Error("AI returned non-JSON output");
    }

    const v = ai.vendor || {};
    const vendorName = toNullStr(v.name) || "Unknown Vendor";

    const vendor = {
      name: vendorName,
      contactName: toNullStr(v.contactName),
      accountNumber: toNullStr(v.accountNumber),
      phone: normalizePhone(v.phone),
      fax: normalizePhone(v.fax),
      email: toNullStr(v.email),
      city: toNullStr(v.city),
      state: toNullStr(v.state),
      country: toNullStr(v.country),
    };

    const orderedBy = toNullStr(ai.orderedBy);

    const items = Array.isArray(ai.items) ? ai.items : [];
    const normItems = items
      .map((it, idx) => ({
        lineNo: idx + 1,
        partNumber: (toNullStr(it?.partNumber) || "").trim(),
        partName: String(it?.description || it?.partNumber || "").slice(0, 60),
        description: (toNullStr(it?.description) || "").trim(),
        quantity: toNullNum(it?.qty) ?? 0,
        unitPrice: toNullNum(it?.unitPrice) ?? 0,
        totalPrice: toNullNum(it?.lineTotal) ?? 0,
        uom: null,
      }))
      .filter((x) => x.partNumber || x.description);

    let subtotal = toNum(ai?.totals?.subtotal);
    let shipping = toNum(ai?.totals?.shipping);
    let taxAmount = toNum(ai?.totals?.tax);
    let grandTotal = toNum(ai?.totals?.grandTotal);

    if ((taxAmount === 0 || taxAmount === null) && grandTotal > 0 && subtotal > 0) {
      const inferred = grandTotal - subtotal - (shipping || 0);
      if (inferred > 0 && inferred < grandTotal) taxAmount = Number(inferred.toFixed(2));
    }

    const poNumber = toNullStr(ai.poNumber);

    const result = {
      extractionSource: "azure-ai",
      vendor,
      orderedBy: orderedBy || null,
      psrPoNumber: poNumber ? String(poNumber).trim() : null,
      orderDate: toNullStr(ai.orderDate),
      expectedDeliveryDate: null,
      items: normItems,
      currency: "USD",
      subtotal,
      shipping,
      grandTotal,
      taxPercent: 0,
      taxAmount,
      remarks: "",
    };

    sanitizeAttnAndOrderedBy(result);
    normalizeTotals(result);

    return result;
  } finally {
    try {
      const files = await fs.readdir(tmpDir);
      await Promise.all(files.map((f) => fs.unlink(path.join(tmpDir, f))));
      await fs.rmdir(tmpDir);
    } catch {
      // ignore
    }
  }
}
