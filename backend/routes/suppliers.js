import express from "express";
import { db } from "../db.js";

const router = express.Router();

/** ✅ GET all suppliers */
router.get("/", async (req, res) => {
  try {
    const rows = await db("suppliers").select("*").orderBy("id", "asc");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ success: 0, message: "Error fetching suppliers", error: err.message });
  }
});

/** ✅ POST create new supplier */
router.post("/", async (req, res) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: 0, message: "Supplier name is required" });
    }

    const [newSupplier] = await db("suppliers")
      .insert({
        name,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    res.json({ success: 1, id: newSupplier.id, supplier: newSupplier });
  } catch (err) {
    console.error("Error creating supplier:", err);
    res.status(500).json({ success: 0, message: "Error creating supplier", error: err.message });
  }
});

export default router;
