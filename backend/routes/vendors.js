// backend/routes/vendors.js
import express from "express";
import { db } from "../db.js";

const router = express.Router();

/** ✅ Normalize vendor object to match DB column names */
function normalizeVendor(vendor) {
  const v = { ...vendor };

  // Trim all string fields
  Object.keys(v).forEach((k) => {
    if (typeof v[k] === "string") v[k] = v[k].trim();
  });

  // ✅ Handle CSV / Excel headers and align with new DB schema
  v.vendor_name =
    v.vendor_name ||
    v.VendorName ||
    v["Vendor Name"] ||
    v["vendor name"] ||
    v.VENDORNAME ||
    "";

  v.contact_name = v.contact_name || v.ContactName || "";
  v.phone = v.phone || v.Phone || "";
  v.email = v.email || v.Email || "";
  v.address1 = v.address1 || v.Address1 || "";
  v.address2 = v.address2 || v.Address2 || "";
  v.city = v.city || v.City || "";
  v.state = v.state || v.State || "";
  v.country = v.country || v.Country || "";
  v.postal_code = v.postal_code || v.PostalCode || "";
  v.fax = v.fax || v.Fax || "";
  v.website = v.website || v.Website || "";
  v.address_remarks = v.address_remarks || v.addressremarks || v.AddressRemarks || "";
  v.address_type = v.address_type || v.addresstype || v.AddressType || "";
  v.discount = v.discount ? Number(v.discount) : 0;
  v.payment_terms = v.payment_terms || v.PaymentTerms || "";
  v.taxing_scheme = v.taxing_scheme || v.taxingscheme || v.TaxingScheme || "";
  v.preferred_carrier = v.preferred_carrier || v.preferredcarrier || v.PreferredCarrier || "";
  v.payment_method = v.payment_method || v.PaymentMethod || "";
  v.currency_code = v.currency_code || v.currencycode || v.CurrencyCode || "USD";
  v.remarks = v.remarks || v.Remarks || "";
  v.acknowledgement_no = v.acknowledgement_no || v.Acknowlegdement || "";

  // ✅ Boolean handling
  const toBool = (val, def = false) => {
    if (val === true || val === false) return val;
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (["true", "yes", "y", "1"].includes(lower)) return true;
      if (["false", "no", "n", "0"].includes(lower)) return false;
    }
    return def;
  };

  v.is_tax_inclusive_pricing = toBool(
    v.is_tax_inclusive_pricing ??
    v.istaxinclusivepricing ??
    v.IsTaxInclusivePricing,
    false
  );

  v.is_active = toBool(
    v.is_active ?? v.isactive ?? v.IsActive,
    true
  );

  // ✅ Remove legacy keys
  const removeKeys = [
    "addressremarks", "addresstype", "taxingscheme",
    "istaxinclusivepricing", "preferredcarrier", "currencycode",
    "isactive", "AddressRemarks", "AddressType", "TaxingScheme",
    "IsTaxInclusivePricing", "PreferredCarrier", "CurrencyCode",
    "IsActive", "VendorName", "Vendor Name", "vendor name",
    "ContactName", "Phone", "Email", "Address1", "Address2",
    "City", "State", "Country", "PostalCode", "Fax", "Website",
    "Remarks", "Acknowlegdement", "PaymentTerms", "PaymentMethod"
  ];
  removeKeys.forEach((key) => delete v[key]);

  return v;
}

/** ✅ Vendor Count (MUST COME FIRST — before /:id) */
router.get("/count", async (req, res) => {
  try {
    const result = await db("vendors").count("vendor_id as count").first();
    res.json({ count: Number(result.count) });
  } catch (err) {
    console.error("❌ Vendor count error:", err);
    res.status(500).json({ success: 0, message: "Error counting vendors" });
  }
});

/** ✅ Get all vendors */
router.get("/", async (req, res) => {
  try {
    const vendors = await db("vendors").select("*").orderBy("vendor_name", "asc");
    res.json(vendors);
  } catch (err) {
    console.error("❌ Error fetching vendors:", err);
    res.status(500).json({ success: 0, message: "Error fetching vendors" });
  }
});

/** ✅ Get single vendor */
router.get("/:id", async (req, res) => {
  try {
    const vendor = await db("vendors").where({ vendor_id: req.params.id }).first();
    if (!vendor)
      return res.status(404).json({ success: 0, message: "Vendor not found" });
    res.json({ success: 1, data: vendor });
  } catch (err) {
    console.error("❌ Error fetching vendor:", err);
    res.status(500).json({ success: 0, message: "Error fetching vendor" });
  }
});

/** ✅ Add vendor */
router.post("/", async (req, res) => {
  try {
    const { vendor_name } = req.body;
    if (!vendor_name)
      return res.status(400).json({ success: 0, message: "Vendor name is required." });

    const existing = await db("vendors")
      .whereRaw("LOWER(vendor_name) = ?", vendor_name.toLowerCase())
      .first();

    if (existing) {
      return res.status(200).json({
        success: 0,
        message: `⚠️ Vendor '${vendor_name}' already exists.`,
      });
    }

    const normalized = normalizeVendor(req.body);
    const [inserted] = await db("vendors").insert(normalized).returning("*");
    res.json({
      success: 1,
      data: inserted,
      message: `✅ Vendor '${inserted.vendor_name}' added successfully.`,
    });
  } catch (err) {
    console.error("❌ Error adding vendor:", err);
    res.status(500).json({
      success: 0, message: "Error adding vendor", error: err.message
    });
  }
});

/** ✅ Update vendor */
router.put("/:id", async (req, res) => {
  try {
    const normalized = normalizeVendor(req.body);
    const [updated] = await db("vendors")
      .where({ vendor_id: req.params.id })
      .update(normalized)
      .returning("*");

    if (!updated)
      return res.status(404).json({ success: 0, message: "Vendor not found" });

    res.json({ success: 1, data: updated, message: "✅ Vendor updated successfully" });
  } catch (err) {
    console.error("❌ Error updating vendor:", err);
    res.status(500).json({
      success: 0, message: "Error updating vendor", error: err.message
    });
  }
});

/** ✅ Delete vendor */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await db("vendors").where({ vendor_id: req.params.id }).del();
    if (!deleted)
      return res.status(404).json({ success: 0, message: "Vendor not found" });

    res.json({ success: 1, message: "✅ Vendor deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting vendor:", err);
    res.status(500).json({
      success: 0, message: "Error deleting vendor", error: err.message
    });
  }
});

/** ✅ Bulk upload vendors */
router.post("/bulk-upload", async (req, res) => {
  try {
    const vendors = req.body.vendors || req.body;
    if (!Array.isArray(vendors) || vendors.length === 0)
      return res.status(400).json({ success: 0, message: "No vendor data provided." });

    const normalized = vendors.map((v) => normalizeVendor(v));
    const missing = normalized.filter((v) => !v.vendor_name);

    if (missing.length === normalized.length) {
      return res.status(400).json({
        success: 0,
        message: "Missing vendor_name column",
      });
    }

    const inserted = [];
    const duplicates = [];

    for (const v of normalized) {
      if (!v.vendor_name) continue;
      const exists = await db("vendors")
        .whereRaw("LOWER(vendor_name) = ?", v.vendor_name.toLowerCase())
        .first();

      if (exists) {
        duplicates.push(v.vendor_name);
        continue;
      }

      const [added] = await db("vendors").insert(v).returning("*");
      inserted.push(added);
    }

    let message = "";
    if (inserted.length && duplicates.length)
      message = `✅ ${inserted.length} inserted, ⚠️ ${duplicates.length} skipped`;
    else if (duplicates.length)
      message = `⚠️ ${duplicates.length} skipped`;
    else
      message = `✅ ${inserted.length} vendor(s) inserted`;

    res.json({ success: 1, inserted, duplicates, message });
  } catch (err) {
    console.error("❌ Error bulk-uploading vendors:", err);
    res.status(500).json({
      success: 0,
      message: "Error in vendor bulk upload",
      error: err.message,
    });
  }
});

export default router;
