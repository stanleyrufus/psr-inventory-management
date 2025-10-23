// backend/routes/products.js
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
    const { category, status } = req.query;
    let query = db("products").select("*").orderBy("id", "desc");

    if (category) query = query.whereILike("category", `%${category}%`);
    if (status) query = query.where("status", status);

    const products = await query;

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching products", data: [] });
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

    // ✅ Basic validation
    if (!product_name || !product_code || !category) {
      return res.status(400).json({
        success: false,
        message: "Category, Product name and code are required",
      });
    }

    // ✅ Duplicate check
    const existing = await db("products")
      .where({ product_code })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        field: "product_code", // 🔹 So frontend knows which field caused it
        message: `Product code '${product_code}' already exists.`,
      });
    }

    // ✅ Insert record
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
