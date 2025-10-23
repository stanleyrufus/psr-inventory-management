/**
 * Migration: Update purchase_orders and suppliers schema
 * Compatible with CommonJS (for .cjs Knex environment)
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // --- PURCHASE_ORDERS table ---
  const hasPurchasedAt = await knex.schema.hasColumn("purchase_orders", "purchased_at");
  if (hasPurchasedAt) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.renameColumn("purchased_at", "purchased_on");
    });
  }

  const hasCreatedBy = await knex.schema.hasColumn("purchase_orders", "created_by");
  if (!hasCreatedBy) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.string("created_by", 100);
    });
  }

  const hasStatus = await knex.schema.hasColumn("purchase_orders", "status");
  if (!hasStatus) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.string("status", 50).defaultTo("Draft");
    });
  }

  // Backfill missing status
  await knex("purchase_orders").whereNull("status").update({ status: "Draft" });

  // --- SUPPLIERS table ---
  const supplierCols = await knex("information_schema.columns")
    .select("column_name")
    .where({ table_name: "suppliers" });
  const supplierColNames = supplierCols.map((c) => c.column_name);

  await knex.schema.alterTable("suppliers", (table) => {
    if (!supplierColNames.includes("contact_person")) table.string("contact_person", 150);
    if (!supplierColNames.includes("email")) table.string("email", 150);
    if (!supplierColNames.includes("phone")) table.string("phone", 50);
    if (!supplierColNames.includes("address")) table.text("address");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  // --- PURCHASE_ORDERS rollback ---
  const hasPurchasedOn = await knex.schema.hasColumn("purchase_orders", "purchased_on");
  if (hasPurchasedOn) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.renameColumn("purchased_on", "purchased_at");
    });
  }

  const hasCreatedBy = await knex.schema.hasColumn("purchase_orders", "created_by");
  if (hasCreatedBy) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.dropColumn("created_by");
    });
  }

  const hasStatus = await knex.schema.hasColumn("purchase_orders", "status");
  if (hasStatus) {
    await knex.schema.alterTable("purchase_orders", (table) => {
      table.dropColumn("status");
    });
  }

  // --- SUPPLIERS rollback ---
  const supplierCols = await knex("information_schema.columns")
    .select("column_name")
    .where({ table_name: "suppliers" });
  const supplierColNames = supplierCols.map((c) => c.column_name);

  await knex.schema.alterTable("suppliers", (table) => {
    if (supplierColNames.includes("contact_person")) table.dropColumn("contact_person");
    if (supplierColNames.includes("email")) table.dropColumn("email");
    if (supplierColNames.includes("phone")) table.dropColumn("phone");
    if (supplierColNames.includes("address")) table.dropColumn("address");
  });
};
