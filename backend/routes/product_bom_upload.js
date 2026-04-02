import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import path from "path";
import { db } from "../db.js";

const router = express.Router({ mergeParams: true });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function clean(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function deriveSectionFromCategory(categoryValue, fallback = "other") {
  const v = normalizeText(categoryValue);
  if (!v) return fallback;
  if (v.includes("elect")) return "electrical";
  if (v.includes("mech")) return "mechanical";
  return fallback;
}

function parseBoolean(value) {
  return String(value || "").toLowerCase() === "true";
}

function getProductComparisonText(product) {
  return [
    product?.product_name,
    product?.name,
    product?.product_number,
    product?.machine_type,
    product?.category,
  ]
    .map(clean)
    .filter(Boolean)
    .join(" | ");
}

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const confirmMachineMismatch = parseBoolean(req.body.confirmMachineMismatch);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const product = await db("products").where({ id: productId }).first();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const ext = path.extname(req.file.originalname || "").toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      return res.status(400).json({
        success: false,
        message: "Only .xlsx, .xls, and .csv files are allowed",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    let rows = [];

    if (ext === ".csv" && clean(req.file.originalname).includes("TurnDisk")) {
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "", range: 1 });
    } else {
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    let normalizedRows = [];

    if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], "part_number")) {
      normalizedRows = rows
        .filter((r) => clean(r.part_number))
        .map((r) => ({
          part_number: clean(r.part_number),
          part_name: clean(r.part_name),
          qty_required: 1,
          unit_price: Number(r.current_unit_price || 0),
          section: deriveSectionFromCategory(r.category, "electrical"),
          source_description: clean(r.part_name),
          source_category: clean(r.category),
          source_machine_name: clean(r.machine_name),
        }));
    } else if (
      rows.length &&
      Object.prototype.hasOwnProperty.call(rows[0], "Fabricated Part Number")
    ) {
      normalizedRows = rows
        .filter((r) => clean(r["Fabricated Part Number"]))
        .map((r) => ({
          part_number: clean(r["Fabricated Part Number"]),
          part_name: clean(r["Part Description "]),
          qty_required: Number(r["Quantity per Machine "] || 0) || 1,
          unit_price: Number(r["Unit Price Per 1 "] || 0),
          section: "mechanical",
          source_description: clean(r["Part Description "]),
          source_category: "Mechanical",
          source_machine_name: "",
        }));
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported BOM file format",
      });
    }

    if (!normalizedRows.length) {
      return res.status(400).json({
        success: false,
        message: "No usable BOM rows found in file",
      });
    }

    // Duplicate validation first
    const duplicateMap = new Map();

    for (const row of normalizedRows) {
      const key = normalizeText(row.part_number);
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key).push(row);
    }

    const duplicateErrors = [];

    for (const [, group] of duplicateMap.entries()) {
      if (group.length > 1) {
        const partNumber = group[0].part_number;
        const sections = [...new Set(group.map((x) => clean(x.section)))];
        duplicateErrors.push({
          part_number: partNumber,
          count: group.length,
          sections,
          message:
            sections.length > 1
              ? `Duplicate part_number '${partNumber}' found with conflicting sections: ${sections.join(", ")}`
              : `Duplicate part_number '${partNumber}' found ${group.length} times in upload sheet`,
        });
      }
    }

    if (duplicateErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Duplicate part numbers found in upload sheet. Please fix the sheet and try again.",
        duplicateErrors,
      });
    }

    // Machine validation
    const machineNamesInFile = [
      ...new Set(
        normalizedRows
          .map((r) => clean(r.source_machine_name))
          .filter(Boolean)
      ),
    ];

    const normalizedProductText = normalizeText(getProductComparisonText(product));
    const mismatchedMachineNames = machineNamesInFile.filter((machineName) => {
      const normalizedMachine = normalizeText(machineName);
      return normalizedMachine && !normalizedProductText.includes(normalizedMachine);
    });

    if (mismatchedMachineNames.length > 0 && !confirmMachineMismatch) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        message:
          `This BOM file appears to belong to machine name(s): ${mismatchedMachineNames.join(", ")} ` +
          `but you are uploading to product '${product.product_name || product.name || productId}'. ` +
          `Please confirm to continue.`,
        machineValidation: {
          productId,
          productName: product.product_name || product.name || "",
          productComparisonText: getProductComparisonText(product),
          sheetMachineNames: machineNamesInFile,
          mismatchedMachineNames,
        },
        fileName: req.file.originalname,
        sheetName: firstSheetName,
        rowCount: normalizedRows.length,
      });
    }

    // Save flow
    let inventoryCreated = 0;
    let inventoryMatched = 0;
    let inventoryUpdated = 0;
    let inserted = 0;
    let updated = 0;

    for (const row of normalizedRows) {
      let part = await db("inventory")
        .whereRaw("trim(part_number) = ?", [row.part_number])
        .first();

      if (!part) {
        const [newPart] = await db("inventory")
          .insert({
            part_number: row.part_number,
            part_name: row.part_name || row.part_number,
            description: row.source_description || row.part_name || row.part_number,
            current_unit_price: row.unit_price || 0,
            last_unit_price: row.unit_price || 0,
            uom: "EA",
            status: "Active",
          })
          .returning("*");

        part = newPart;
        inventoryCreated++;
      } else {
        inventoryMatched++;

        const updatePayload = {};
        const existingCurrent = Number(part.current_unit_price || 0);
        const uploadedPrice = Number(row.unit_price || 0);

        if (uploadedPrice > 0 && uploadedPrice !== existingCurrent) {
          updatePayload.last_unit_price = existingCurrent;
          updatePayload.current_unit_price = uploadedPrice;
        }

        if (!clean(part.part_name) && clean(row.part_name)) {
          updatePayload.part_name = row.part_name;
        }

        if (!clean(part.description) && clean(row.source_description)) {
          updatePayload.description = row.source_description;
        }

        if (Object.keys(updatePayload).length > 0) {
          const [updatedPart] = await db("inventory")
            .where({ part_id: part.part_id })
            .update(updatePayload)
            .returning("*");

          part = updatedPart || part;
          inventoryUpdated++;
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
        section: row.section,
        qty_required: row.qty_required,
        source_part_number: row.part_number,
        source_description: row.source_description,
      };

      if (existingBom) {
        const needsUpdate =
          Number(existingBom.qty_required || 0) !== Number(row.qty_required || 0) ||
          clean(existingBom.section) !== clean(row.section) ||
          clean(existingBom.source_part_number) !== clean(row.part_number) ||
          clean(existingBom.source_description) !== clean(row.source_description);

        if (needsUpdate) {
          await db("product_parts")
            .where({ id: existingBom.id })
            .update(bomPayload);
          updated++;
        }
      } else {
        await db("product_parts").insert(bomPayload);
        inserted++;
      }
    }

    return res.json({
      success: true,
      message: "BOM uploaded successfully",
      productId,
      productName: product.product_name || product.name || "",
      inventoryCreated,
      inventoryMatched,
      inventoryUpdated,
      inserted,
      updated,
      totalProcessed: normalizedRows.length,
      warnings:
        machineNamesInFile.length > 0
          ? [`File machine_name values detected: ${machineNamesInFile.join(", ")}`]
          : [],
      fileName: req.file.originalname,
      sheetName: firstSheetName,
    });
  } catch (err) {
    console.error("❌ BOM upload failed:", err);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

export default router;