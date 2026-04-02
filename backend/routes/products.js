import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * GET /api/products
 * Optional filters:
 *   ?category=Filling Machines
 *   ?status=Active
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    let query = db("products")
      .select("*")
      .where("status", "Active")
      .whereNotNull("image_url")
      .whereRaw("trim(coalesce(image_url, '')) <> ''")
      .orderBy("id", "asc");

    if (category) {
      query = query.whereILike("category", `%${category}%`);
    }

    const products = await query;

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching products",
      data: [],
    });
  }
});

router.get("/:id/bom", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await db("products").where({ id: productId }).first();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    const rows = await db("product_parts as pp")
      .join("inventory as i", "pp.part_id", "i.part_id")
      .where("pp.product_id", productId)
      .select(
        "pp.id",
        "pp.product_id",
        "pp.part_id",
        "pp.section",
        "pp.qty_required",
        "pp.source_part_number",
        "pp.source_description",
        "pp.notes",
        "i.part_number",
        "i.part_name",
        "i.description",
        "i.current_unit_price",
        "i.last_unit_price",
        "i.quantity_on_hand",
        "i.minimum_stock_level",
        "i.uom",
        "i.status",
        "i.last_vendor_name",
        "i.image_url"
      )
      .orderBy("pp.section", "asc")
      .orderBy("i.part_number", "asc");

    const items = rows.map((row) => {
      const unitPrice = Number(row.current_unit_price || row.last_unit_price || 0);
      const qtyRequired = Number(row.qty_required || 0);
      const extendedCost = Number((unitPrice * qtyRequired).toFixed(2));

      return {
        ...row,
        unit_price_for_budget: unitPrice,
        extended_cost: extendedCost,
      };
    });

    const grouped = {
      mechanical: items.filter((x) => (x.section || "").toLowerCase() === "mechanical"),
      electrical: items.filter((x) => (x.section || "").toLowerCase() === "electrical"),
      other: items.filter(
        (x) =>
          !["mechanical", "electrical"].includes((x.section || "").toLowerCase())
      ),
    };

    const mechanicalTotal = Number(
      grouped.mechanical.reduce((sum, x) => sum + Number(x.extended_cost || 0), 0).toFixed(2)
    );
    const electricalTotal = Number(
      grouped.electrical.reduce((sum, x) => sum + Number(x.extended_cost || 0), 0).toFixed(2)
    );
    const otherTotal = Number(
      grouped.other.reduce((sum, x) => sum + Number(x.extended_cost || 0), 0).toFixed(2)
    );
    const grandTotal = Number((mechanicalTotal + electricalTotal + otherTotal).toFixed(2));

    return res.json({
      success: true,
      data: {
        product_id: productId,
        grouped,
        totals: {
          mechanical: mechanicalTotal,
          electrical: electricalTotal,
          other: otherTotal,
          grand: grandTotal,
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching product BOM:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching product BOM",
      data: null,
    });
  }
});

/**
 * DELETE /api/products/:id/bom/rows/:rowId
 */
router.delete("/:id/bom/rows/:rowId", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const rowId = Number(req.params.rowId);

    const existing = await db("product_parts")
      .where({ id: rowId, product_id: productId })
      .first();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "BOM row not found",
      });
    }

    await db("product_parts")
      .where({ id: rowId, product_id: productId })
      .del();

    return res.json({
      success: true,
      message: "BOM row deleted successfully",
      deletedRowId: rowId,
    });
  } catch (err) {
    console.error("❌ Error deleting BOM row:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete BOM row",
    });
  }
});

/**
 * DELETE /api/products/:id/bom/section/:section
 */
router.delete("/:id/bom/section/:section", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const section = String(req.params.section || "").trim().toLowerCase();

    if (!["mechanical", "electrical", "other"].includes(section)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOM section",
      });
    }

    const deletedCount = await db("product_parts")
      .where({ product_id: productId, section })
      .del();

    return res.json({
      success: true,
      message: `${section} BOM rows deleted successfully`,
      deletedCount,
    });
  } catch (err) {
    console.error("❌ Error deleting BOM section:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete BOM section",
    });
  }
});

/**
 * POST /api/products/:id/bom/import
 * TEMP DISABLED
 */
router.post("/:id/bom/import", async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Temporary import disabled",
  });
});

/**
 * POST /api/products/:id/bom/rows
 */
router.post("/:id/bom/rows", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const {
      part_number,
      part_name,
      qty_required,
      section,
      unit_price,
      source_description,
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    if (!String(part_number || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Part number is required",
      });
    }

    if (!String(part_name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Part name is required",
      });
    }

    const normalizedSection = String(section || "").trim().toLowerCase();
    if (!["mechanical", "electrical", "other"].includes(normalizedSection)) {
      return res.status(400).json({
        success: false,
        message: "Valid section is required",
      });
    }

    const qty = Number(qty_required || 0);
    if (!qty || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const cleanPartNumber = String(part_number).trim();
    const cleanPartName = String(part_name).trim();
    const cleanDescription = String(source_description || part_name || "").trim();
    const price = Number(unit_price || 0);

    let part = await db("inventory")
      .whereRaw("trim(part_number) = ?", [cleanPartNumber])
      .first();

    let inventoryCreated = false;
    let inventoryUpdated = false;

    if (!part) {
      const [newPart] = await db("inventory")
        .insert({
          part_number: cleanPartNumber,
          part_name: cleanPartName,
          description: cleanDescription,
          current_unit_price: price || 0,
          last_unit_price: price || 0,
          uom: "EA",
          status: "Active",
        })
        .returning("*");

      part = newPart;
      inventoryCreated = true;
    } else {
      const updatePayload = {};
      const existingCurrent = Number(part.current_unit_price || 0);

      if (price > 0 && price !== existingCurrent) {
        updatePayload.last_unit_price = existingCurrent;
        updatePayload.current_unit_price = price;
      }

      if (!String(part.part_name || "").trim() && cleanPartName) {
        updatePayload.part_name = cleanPartName;
      }

      if (!String(part.description || "").trim() && cleanDescription) {
        updatePayload.description = cleanDescription;
      }

      if (Object.keys(updatePayload).length > 0) {
        const [updatedPart] = await db("inventory")
          .where({ part_id: part.part_id })
          .update(updatePayload)
          .returning("*");

        part = updatedPart || part;
        inventoryUpdated = true;
      }
    }

    const existingBom = await db("product_parts")
      .where({
        product_id: productId,
        part_id: part.part_id,
      })
      .first();

    const bomPayload = {
      product_id: productId,
      part_id: part.part_id,
      section: normalizedSection,
      qty_required: qty,
      source_part_number: cleanPartNumber,
      source_description: cleanDescription,
    };

    if (existingBom) {
      await db("product_parts")
        .where({ id: existingBom.id })
        .update(bomPayload);

      return res.json({
        success: true,
        message: "BOM row updated successfully",
        action: "updated",
        inventoryCreated,
        inventoryUpdated,
        data: {
          bomRowId: existingBom.id,
          part_id: part.part_id,
        },
      });
    }

    const [createdBomRow] = await db("product_parts")
      .insert(bomPayload)
      .returning("*");

    return res.json({
      success: true,
      message: "BOM row added successfully",
      action: "inserted",
      inventoryCreated,
      inventoryUpdated,
      data: createdBomRow,
    });
  } catch (err) {
    console.error("❌ Error adding BOM row:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to add BOM row",
    });
  }
});


/**
 * GET /api/products/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await db("products").where({ id: req.params.id }).first();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching product", data: null });
  }
});

/**
 * POST /api/products
 */
router.post("/", async (req, res) => {
  try {
    const {
      category,
      subcategory,
      product_code,
      product_name,
      short_description,
      full_description,
      key_features,
      applications,
      machine_type,
      frame_series,
      nozzle_count,
      image_url,
      pdf_brochure_url,
      demo_available,
      contact_email,
      contact_phone,
      status,
    } = req.body;

    if (!product_name || !product_code || !category) {
      return res.status(400).json({
        success: false,
        message: "Category, Product name and code are required",
      });
    }

    const existing = await db("products")
      .where({ product_code })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        field: "product_code",
        message: `Product code '${product_code}' already exists.`,
      });
    }

    const [created] = await db("products")
      .insert({
        category,
        subcategory,
        product_code,
        product_name,
        short_description,
        full_description,
        key_features: key_features ? JSON.stringify(key_features) : null,
        applications: applications ? JSON.stringify(applications) : null,
        machine_type,
        frame_series,
        nozzle_count,
        image_url,
        pdf_brochure_url,
        demo_available,
        contact_email,
        contact_phone,
        status,
      })
      .returning("*");

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: created,
    });
  } catch (err) {
    console.error("❌ Error creating product:", err);
    const duplicate =
      err.code === "23505" && err.constraint === "products_product_code_unique";

    res.status(duplicate ? 409 : 500).json({
      success: false,
      field: duplicate ? "product_code" : undefined,
      message: duplicate
        ? "Duplicate product code — please use a unique value."
        : "Error creating product",
    });
  }
});

/**
 * PUT /api/products/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = { ...req.body };

    if (updates.key_features && typeof updates.key_features !== "string") {
      updates.key_features = JSON.stringify(updates.key_features);
    }
    if (updates.applications && typeof updates.applications !== "string") {
      updates.applications = JSON.stringify(updates.applications);
    }

    const [updated] = await db("products")
      .where({ id })
      .update({ ...updates, updated_at: db.fn.now() })
      .returning("*");

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res
      .status(500)
      .json({ success: false, message: "Error updating product", data: null });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const count = await db("products").where({ id: req.params.id }).del();

    if (!count) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      deletedId: req.params.id,
    });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res
      .status(500)
      .json({ success: false, message: "Error deleting product" });
  }
});

export default router;
