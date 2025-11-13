// backend/routes/purchase_orders_rfq.js
import express from "express";
import nodemailer from "nodemailer";
import { db } from "../db.js";

const router = express.Router();

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Company details
const company = {
  name: process.env.RFQ_COMPANY_NAME || "PSR AUTOMATION INC",
  addr1: process.env.RFQ_COMPANY_ADDR1 || "13318 SKYLINE CIRCLE",
  city: process.env.RFQ_COMPANY_CITY || "SHAKOPEE, MN, 55379",
  phone: process.env.RFQ_PHONE || "",
};

/* ======================================================
   ✅ BUILD RFQ EMAIL HTML (Improved with Vendor details)
   ====================================================== */
function buildRFQHtml({ po, items }) {
  const expected = po.expected_delivery_date
    ? new Date(po.expected_delivery_date).toISOString().split("T")[0]
    : "—";

  const vendorBlock = `
    <div style="margin-top: 6px; font-size: 14px;">
      <div style="font-weight: 600;">To:</div>
      <div>${po.vendor_name || ""}</div>
      <div>${po.vendor_email || ""}</div>
    </div>
  `;

  const rows = items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding:6px;border:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:6px;border:1px solid #e5e7eb;">${it.part_number || ""}</td>
        <td style="padding:6px;border:1px solid #e5e7eb;">${it.part_name || it.description || ""}</td>
        <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">${Number(it.quantity || 0)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827">

      <h2 style="margin:0 0 4px 0;">Request for Quote (RFQ)</h2>

      <!-- FROM Block -->
      <div style="color:#6b7280;font-size:14px;margin-bottom:12px;">
        <div><strong>${company.name}</strong></div>
        <div>${company.addr1}</div>
        <div>${company.city}</div>
        ${company.phone ? `<div>${company.phone}</div>` : ""}
      </div>

      <!-- ✅ Vendor Block (TO) -->
      ${vendorBlock}

      <p style="margin-top:16px;">Dear Vendor,</p>
      <p>We are requesting a quote for the following Purchase Order:</p>

      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 8px;color:#6b7280;">PSR PO Number:</td><td><strong>${po.psr_po_number}</strong></td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Expected Delivery:</td><td>${expected}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Remarks:</td><td>${po.remarks || "—"}</td></tr>
      </table>

      <table style="border-collapse:collapse;width:100%;margin-top:8px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">#</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Part #</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Qty</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="margin-top:16px;">
        Please respond with unit prices, taxes, freight, lead times, and terms.
        If possible, include availability and alternative suggestions.
      </p>

      <p>Thank you,<br/>${company.name} Purchasing</p>
    </div>
  `;
}

/* ======================================================
   ✅ LOAD PO + ITEMS
   ====================================================== */
async function loadPOWithItems(poId) {
  const po = await db("purchase_orders as po")
    .leftJoin("vendors as v", "v.vendor_id", "po.vendor_id")
    .select("po.*", "v.vendor_name", "v.email as vendor_email")
    .where("po.id", poId)
    .first();

  if (!po) return null;

  const items = await db("purchase_order_items as i")
    .leftJoin("inventory as inv", "inv.part_id", "i.part_id")
    .select("i.line_no", "i.quantity", "inv.part_number", "inv.part_name", "inv.description")
    .where("i.po_id", poId)
    .orderBy("i.line_no");

  return { po, items };
}

/* ======================================================
   ✅ RFQ PREVIEW (Vendor details included)
   ====================================================== */
router.get("/:id/rfq/preview", async (req, res) => {
  const { id } = req.params;
  const data = await loadPOWithItems(id);
  if (!data) return res.status(404).json({ success: 0, message: "PO not found" });

  const html = buildRFQHtml(data);

  res.json({
    success: 1,
    subject: `RFQ: ${data.po.psr_po_number}`,
    html,
    vendor_email: data.po.vendor_email || "",
    vendor_name: data.po.vendor_name || "",
  });
});

/* ======================================================
   ✅ RFQ SEND (Correct CC handling)
   ====================================================== */
router.post("/:id/rfq/send", async (req, res) => {
  const { id } = req.params;
  const { to = [], cc = [] } = req.body || {};

  // ✅ Add default CC from .env
  const defaultCC = String(process.env.RFQ_CC_DEFAULT || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  // ✅ Merge & dedupe
  const ccAll = Array.from(new Set([...defaultCC, ...cc]));

  if (!to.length)
    return res.status(400).json({ success: 0, message: "No recipient emails" });

  const data = await loadPOWithItems(id);
  if (!data)
    return res.status(404).json({ success: 0, message: "PO not found" });

  const subject = `RFQ: ${data.po.psr_po_number}`;
  const html = buildRFQHtml(data);

  try {
    const info = await transporter.sendMail({
      from: process.env.RFQ_FROM_EMAIL,
      to,
      cc: ccAll, // ✅ fixed
      subject,
      html,
    });

    await db("po_rfq_emails").insert({
      po_id: id,
      to_emails: to,
      cc_emails: ccAll, // ✅ store cc
      subject,
      body_html: html,
      sent_at: db.fn.now(),
      status: "sent",
    });

    res.json({
      success: 1,
      messageId: info.messageId,
      cc_used: ccAll, // ✅ return CC used
    });
  } catch (err) {
    console.error("RFQ send error:", err);
    res.status(500).json({ success: 0, error: err.message });
  }
});

// 🔹 RFQ Status API (for dashboard)
router.get("/rfq/status", async (req, res) => {
  try {
    const ids = req.query.po_ids?.split(",").filter(Boolean);
    if (!ids || ids.length === 0)
      return res.json({ success: 1, data: {} });

    // Fetch latest RFQ email info for all given POs
    const rows = await db("po_rfq_emails")
      .select("po_id")
      .count("* as sentCount")
      .max("sent_at as lastSentAt")
      .whereIn("po_id", ids)
      .andWhere("status", "sent")
      .groupBy("po_id");

    // Convert rows into lookup object
    const map = {};
    for (const r of rows) {
      map[r.po_id] = {
        sentCount: Number(r.sentCount || 0),
        lastSentAt: r.lastSentAt,
      };
    }

    res.json({ success: 1, data: map });
  } catch (err) {
    console.error("❌ RFQ status route error:", err);
    res.status(500).json({ success: 0, message: "Failed to fetch RFQ status" });
  }
});

export default router;
