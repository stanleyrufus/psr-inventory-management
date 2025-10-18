const express = require("express");
const router = express.Router();
const db = require("../knex");
const { authenticateJWT, authorizeRole } = require("../middleware/auth");

// ===============================
// GET all products (authenticated)
// ===============================
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const products = await db("products").select("*");
    res.json({ message: "Products list", data: products });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products", error: err.message });
  }
});

// ===============================
// Test endpoint (authenticated)
// ===============================
router.get("/test", authenticateJWT, async (req, res) => {
  try {
    const product = await db("products").first();
    if (!product) {
      return res.status(404).json({ message: "No products found" });
    }
    res.json({ message: "Test product fetched successfully", data: product });
  } catch (err) {
    console.error("Error fetching test product:", err);
    res.status(500).json({ message: "Error fetching test product", error: err.message });
  }
});

// ===============================
// Optional: open test route (no auth) for debugging
// ===============================
router.get("/test-open", async (req, res) => {
  try {
    const product = await db("products").first();
    res.json({ message: "Test product (no auth)", data: product });
  } catch (err) {
    res.status(500).json({ message: "Error fetching test product", error: err.message });
  }
});

module.exports = router;
