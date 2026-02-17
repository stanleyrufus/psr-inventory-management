// backend/services/poHybridExtractor.js

import { extractPoFromPdf as extractClassic } from "./poPdfExtractor.js";
import { extractPoWithAzureAi as extractAi } from "./poAzureAiExtractor.js";

/* ---------------- helpers ---------------- */

function s(v) {
  return String(v ?? "").trim();
}

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function isPersonLikeName(v) {
  const t = s(v);
  if (!t) return false;
  if (t.length > 80) return false;
  if (t.split(/\s+/).length < 2) return false;
  return /^[A-Za-z .'-]+$/.test(t);
}

// Move "Attn: Pam ..." out of vendor contact and into orderedBy
function sanitizeAttn(result) {
  if (!result || !result.vendor) return result;

  const vendorName = s(result.vendor.name).toLowerCase();
  const contact = s(result.vendor.contactName);

  // If contact contains Attn: X, that is PSR person, not vendor
  const m = contact.match(/\battn\b[:\-]?\s*(.+)$/i);
  if (m?.[1]) {
    const name = s(m[1]);
    if (!s(result.orderedBy) && name) result.orderedBy = name;
    result.vendor.contactName = null;
  }

  // McMaster: if vendor contact looks like a human name, move it
  if (vendorName.includes("mcmaster")) {
    if (contact && isPersonLikeName(contact)) {
      if (!s(result.orderedBy)) result.orderedBy = contact;
      result.vendor.contactName = null;
    }
  }

  return result;
}

function normalizeTotals(result) {
  if (!result) return result;

  result.subtotal = n(result.subtotal, 0);
  result.shipping = n(result.shipping, 0);
  result.taxAmount = n(result.taxAmount, 0);
  result.taxPercent = n(result.taxPercent, 0);
  result.grandTotal = n(result.grandTotal, 0);

  // If grandTotal missing, compute
  if (!result.grandTotal || result.grandTotal <= 0) {
    result.grandTotal = result.subtotal + result.shipping + result.taxAmount;
  }

  // If grandTotal < subtotal, fix
  if (result.grandTotal < result.subtotal) {
    result.grandTotal = result.subtotal + result.shipping + result.taxAmount;
  }

  return result;
}

function looksValid(r) {
  if (!r) return false;
  if (!s(r.psrPoNumber)) return false;
  if (!s(r.vendor?.name)) return false;
  if (!Array.isArray(r.items) || r.items.length === 0) return false;
  return true;
}

/* ---------------- AI-FIRST extractor ---------------- */

export async function extractPoHybrid(filePath) {
  // ✅ Always use AI first
  try {
const MAX_PAGES = Number(process.env.PO_IMPORT_MAX_PAGES || 3);

const ai = await extractAi(filePath, {
  pages: MAX_PAGES,
  debug: false
});

    sanitizeAttn(ai);
    normalizeTotals(ai);

    // If AI is valid, return it
    if (looksValid(ai)) {
      ai.extractionSource = "azure-ai";
      ai.remarks = ai.remarks || "";
      return ai;
    }
    // If AI returns weak output, fall through to classic
  } catch (e) {
    // AI failed -> fall back to classic
  }

  // ✅ Classic fallback only if AI fails
  const classic = await extractClassic(filePath);

  sanitizeAttn(classic);
  normalizeTotals(classic);

  classic.extractionSource = classic.extractionSource || "classic";
  classic.remarks = classic.remarks || "";
  return classic;
}
