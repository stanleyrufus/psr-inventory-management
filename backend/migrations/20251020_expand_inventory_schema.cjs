// backend/migrations/20251020_expand_inventory_schema.cjs

/**
 * This migration is ADDITIVE ONLY.
 * It keeps existing columns (part_id, part_number, description, quantity_on_hand, minimum_stock_level,
 * unit_price, weight_kg, lead_time_days, last_order_date, location, created_at, updated_at)
 * and adds the string/meta fields your frontend bulk upload & add-part forms expect.
 *
 * New columns (all default to '' or sensible defaults to avoid NULL-related UI issues):
 * - part_name
 * - category
 * - uom
 * - supplier_name
 * - supplier_part_number
 * - status (default 'Active')
 * - material
 * - remarks (TEXT)
 */

async function addColumnIfMissing(knex, tableName, colName, builderFn) {
  const exists = await knex.schema.hasColumn(tableName, colName);
  if (!exists) {
    await knex.schema.alterTable(tableName, builderFn);
  }
}

exports.up = async function (knex) {
  const t = "inventory";

  // Strings default to empty string so your UI doesn’t need to special-case nulls.
  await addColumnIfMissing(knex, t, "part_name", (table) => {
    table.string("part_name", 255).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "category", (table) => {
    table.string("category", 255).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "uom", (table) => {
    table.string("uom", 100).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "supplier_name", (table) => {
    table.string("supplier_name", 255).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "supplier_part_number", (table) => {
    table.string("supplier_part_number", 255).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "status", (table) => {
    table.string("status", 50).defaultTo("Active").index();
  });

  await addColumnIfMissing(knex, t, "material", (table) => {
    table.string("material", 255).defaultTo("");
  });

  await addColumnIfMissing(knex, t, "remarks", (table) => {
    table.text("remarks").defaultTo("");
  });

  // Optional helpful indexes (safe even if table is small)
  // Guard with try/catch in case they already exist from a previous manual change.
  try { await knex.schema.alterTable(t, (table) => table.index(["category"], "inventory_category_idx")); } catch (_) {}
  try { await knex.schema.alterTable(t, (table) => table.index(["status"], "inventory_status_idx")); } catch (_) {}
};

exports.down = async function (knex) {
  const t = "inventory";

  async function dropIfExists(col) {
    const exists = await knex.schema.hasColumn(t, col);
    if (exists) {
      await knex.schema.alterTable(t, (table) => table.dropColumn(col));
    }
  }

  // Drop the additive columns only
  await dropIfExists("part_name");
  await dropIfExists("category");
  await dropIfExists("uom");
  await dropIfExists("supplier_name");
  await dropIfExists("supplier_part_number");
  await dropIfExists("status");
  await dropIfExists("material");
  await dropIfExists("remarks");

  // Drop indexes if present (ignore errors if they don’t exist)
  try { await knex.schema.alterTable(t, (table) => table.dropIndex([], "inventory_category_idx")); } catch (_) {}
  try { await knex.schema.alterTable(t, (table) => table.dropIndex([], "inventory_status_idx")); } catch (_) {}
};
