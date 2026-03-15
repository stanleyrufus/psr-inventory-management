import fs from "fs";
import csv from "csv-parser";
import { db } from "../db.js";

const PRODUCT_ID = 28;
const SECTION = "Mechanical";
const CSV_PATH = "C:/Users/stanl/Downloads/TurnDisk_BOM_20260313B.csv";

function normalizePartNumber(value) {
  return String(value || "").trim();
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

function normalizeQty(value) {
  const n = Number(String(value || "").trim());
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function normalizePrice(value) {
  const n = Number(String(value || "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function loadCsvRows() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            String(header || "")
              .replace(/\uFEFF/g, "")
              .trim(),
        })
      )
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main() {
  console.log(`Reading BOM from: ${CSV_PATH}`);

  const product = await db("products").where({ id: PRODUCT_ID }).first();
  if (!product) {
    throw new Error(`Product ${PRODUCT_ID} not found`);
  }

  const rows = await loadCsvRows();
  console.log(`CSV rows found: ${rows.length}`);
  console.log("Detected CSV headers:", Object.keys(rows[0] || {}));

  let matchedExisting = 0;
  let createdInventory = 0;
  let mapped = 0;
  let skippedExistingMapping = 0;
  let updatedPrices = 0;

  const createdRows = [];
  const updatedRows = [];

  for (const row of rows) {
    const sourcePartNumber = normalizePartNumber(row["Fabricated Part Number"]);
    const sourceDescription = normalizeDescription(row["Part Description"]);
    const qtyRequired = normalizeQty(row["Quantity per Machine"]);
    const unitPrice = normalizePrice(row["Unit Price Per 1"]);

    if (!sourcePartNumber) continue;

    let inventoryPart = await db("inventory")
      .where({ part_number: sourcePartNumber })
      .first();

    if (inventoryPart) {
      matchedExisting++;

      const updateData = {};

      if (unitPrice > 0 && Number(inventoryPart.current_unit_price || 0) !== unitPrice) {
        updateData.current_unit_price = unitPrice;
        updatedPrices++;
      }

      if ((!inventoryPart.description || String(inventoryPart.description).trim() === "") && sourceDescription) {
        updateData.description = sourceDescription;
      }

      if ((!inventoryPart.part_name || String(inventoryPart.part_name).trim() === "") && sourceDescription) {
        updateData.part_name = sourceDescription;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_on = db.fn.now();
        await db("inventory").where({ part_id: inventoryPart.part_id }).update(updateData);
        updatedRows.push({
          part_number: sourcePartNumber,
          updateData,
        });
      }

      inventoryPart = await db("inventory").where({ part_id: inventoryPart.part_id }).first();
    } else {
      const [inserted] = await db("inventory")
        .insert({
          part_number: sourcePartNumber,
          part_name: sourceDescription || sourcePartNumber,
          description: sourceDescription || sourcePartNumber,
          quantity_on_hand: 0,
          minimum_stock_level: 0,
          current_unit_price: unitPrice > 0 ? unitPrice : 0,
          location: "",
          status: "Active",
          category: "BOM Imported",
          uom: "Each",
          material: "",
          remarks: `Created from ${product.product_code} BOM import`,
          machine_name: product.product_name,
          updated_on: db.fn.now(),
        })
        .returning(["part_id"]);

      inventoryPart = await db("inventory").where({ part_id: inserted.part_id }).first();

      createdInventory++;
      createdRows.push({
        part_number: sourcePartNumber,
        description: sourceDescription,
        unit_price: unitPrice,
      });
    }

    const existingMapping = await db("product_parts")
      .where({
        product_id: PRODUCT_ID,
        part_id: inventoryPart.part_id,
        section: SECTION,
      })
      .first();

    if (existingMapping) {
      skippedExistingMapping++;
      continue;
    }

    await db("product_parts").insert({
      product_id: PRODUCT_ID,
      part_id: inventoryPart.part_id,
      section: SECTION,
      qty_required: qtyRequired,
      source_part_number: sourcePartNumber,
      source_description: sourceDescription,
      notes: null,
    });

    mapped++;
  }
  const safeUpdatedRows = updatedRows.map((r) => ({
    part_number: r.part_number,
    updateData: {
      current_unit_price: r.updateData?.current_unit_price ?? null,
      description: r.updateData?.description ?? null,
      part_name: r.updateData?.part_name ?? null,
    },
  }));

  const summary = {
    product_id: PRODUCT_ID,
    section: SECTION,
    csv_rows: rows.length,
    matched_existing_inventory: matchedExisting,
    created_inventory_parts: createdInventory,
    updated_prices: updatedPrices,
    new_mappings_inserted: mapped,
    skipped_existing_mappings: skippedExistingMapping,
    created_rows: createdRows,
    updated_rows: safeUpdatedRows,
  };

  const summaryPath = "C:/Users/stanl/Downloads/td120_bom_import_summary.json";
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("----- IMPORT SUMMARY -----");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary written to: ${summaryPath}`);

  await db.destroy();
}

main().catch(async (err) => {
  console.error("BOM import failed:", err);
  try {
    await db.destroy();
  } catch {}
  process.exit(1);
});