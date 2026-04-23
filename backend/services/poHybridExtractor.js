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

function sanitizeAttn(result) {
  if (!result || !result.vendor) return result;

  const vendorName = s(result.vendor.name).toLowerCase();
  const contact = s(result.vendor.contactName);

  const m = contact.match(/\battn\b[:\-]?\s*(.+)$/i);
  if (m?.[1]) {
    const name = s(m[1]);
    if (!s(result.orderedBy) && name) result.orderedBy = name;
    result.vendor.contactName = null;
  }

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

  if (!result.grandTotal || result.grandTotal <= 0) {
    result.grandTotal = result.subtotal + result.shipping + result.taxAmount;
  }

  if (result.grandTotal < result.subtotal) {
    result.grandTotal = result.subtotal + result.shipping + result.taxAmount;
  }

  return result;
}

function hasTooManyDuplicateItems(items = []) {
  if (!Array.isArray(items) || items.length < 2) return false;

  const keys = items.map((x) =>
    [
      s(x.partNumber),
      s(x.description),
      n(x.quantity, 0),
      n(x.unitPrice, 0),
      n(x.totalPrice, 0),
    ].join("|")
  );

  const unique = new Set(keys);
  return unique.size <= Math.ceil(items.length / 2);
}

function looksValid(r) {
  if (!r) return false;
  if (!s(r.psrPoNumber)) return false;
  if (!s(r.vendor?.name)) return false;
  if (!Array.isArray(r.items) || r.items.length === 0) return false;
  return true;
}

function isRateLimitError(err) {
  const status =
    err?.response?.status ||
    err?.status ||
    err?.cause?.status ||
    null;

  const msg = String(err?.message || "").toLowerCase();

  return status === 429 || msg.includes("429");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------- AI-FIRST extractor ---------------- */

export async function extractPoHybrid(filePath) {
  const MAX_PAGES = Number(process.env.PO_IMPORT_MAX_PAGES || 4);
  const MAX_AI_RETRIES = Number(process.env.PO_IMPORT_AI_RETRIES || 3);

  let lastAiError = null;

  for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt++) {
    try {
      const ai = await extractAi(filePath, {
        pages: MAX_PAGES,
        debug: false,
      });

      console.log("🟦 AI pages used:", MAX_PAGES);
      console.log("🟦 AI PO:", ai?.psrPoNumber);
      console.log("🟦 AI vendor:", ai?.vendor?.name);
      console.log("🟦 AI item count before sanitize:", ai?.items?.length || 0);

      sanitizeAttn(ai);
      normalizeTotals(ai);

      console.log("🟦 AI item count after sanitize:", ai?.items?.length || 0);
      console.log(
        "🟦 AI items preview:",
        (ai?.items || []).map((x, i) => ({
          line: i + 1,
          partNumber: x.partNumber,
          description: x.description,
          quantity: x.quantity,
          unitPrice: x.unitPrice,
          totalPrice: x.totalPrice,
        }))
      );

      if (looksValid(ai) && !hasTooManyDuplicateItems(ai.items || [])) {
        ai.extractionSource = "azure-ai";
        ai.remarks = ai.remarks || "";
        return ai;
      }

      console.log("🟨 AI output invalid or suspicious, falling back to classic");
      break;
    } catch (e) {
      lastAiError = e;

      if (isRateLimitError(e) && attempt < MAX_AI_RETRIES) {
        const delayMs = attempt * 2000;
        console.log(
          `🟧 AI rate-limited (attempt ${attempt}/${MAX_AI_RETRIES}). Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      console.log("🟥 AI extractor failed, falling back to classic:", e.message);
      break;
    }
  }

  const classic = await extractClassic(filePath);

  console.log("🟪 Classic PO:", classic?.psrPoNumber);
  console.log("🟪 Classic vendor:", classic?.vendor?.name);
  console.log("🟪 Classic item count before sanitize:", classic?.items?.length || 0);

  sanitizeAttn(classic);
  normalizeTotals(classic);

  console.log("🟪 Classic item count after sanitize:", classic?.items?.length || 0);
  console.log(
    "🟪 Classic items preview:",
    (classic?.items || []).map((x, i) => ({
      line: i + 1,
      partNumber: x.partNumber,
      description: x.description,
      quantity: x.quantity,
      unitPrice: x.unitPrice,
      totalPrice: x.totalPrice,
    }))
  );

  classic.extractionSource = classic.extractionSource || "classic";
  classic.remarks = classic.remarks || "";

  if (lastAiError) {
    classic.remarks = [
      classic.remarks,
      `AI fallback reason: ${lastAiError.message || "Unknown AI error"}`,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return classic;
}