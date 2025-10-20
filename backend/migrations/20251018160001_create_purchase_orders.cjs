// backend/migrations/20251018160001_create_purchase_orders.cjs

exports.up = async function (knex) {
  // 🧹 Clean up legacy tables if they existed with older names
  const legacy = await knex.schema.hasTable("purchase_table");
  if (legacy) {
    await knex.schema.dropTable("purchase_table");
  }

  const hasTable = await knex.schema.hasTable("purchase_orders");
  if (!hasTable) {
    await knex.schema.createTable("purchase_orders", (t) => {
      t.increments("id").primary();

      // Basic PO details
      t.string("psr_po_number").notNullable().unique(); // User-entered PSR PO number (key used with supplier)
      t.date("order_date").notNullable().defaultTo(knex.fn.now());
      t.date("expected_delivery_date");

      // Metadata
      t.string("opened_by");
      t.string("approved_by");
      t.integer("supplier_id"); // FK optional (suppliers table WIP)

      // Status
      t
        .enu(
          "status",
          ["Draft", "Submitted", "Approved", "Partially Received", "Received", "Cancelled"],
          { useNative: true, enumName: "po_status" }
        )
        .notNullable()
        .defaultTo("Draft");

      // Payment info
      t.string("payment_method"); // Bank Transfer, Credit Card, etc.
      t.string("payment_terms"); // Net 30, etc.
      t.string("currency").notNullable().defaultTo("USD");

      // Remarks / notes
      t.text("remarks");

      // Financial totals
      t.decimal("subtotal", 14, 2).notNullable().defaultTo(0);
      t.decimal("tax_percent", 5, 2).notNullable().defaultTo(0);
      t.decimal("tax_amount", 14, 2).notNullable().defaultTo(0);
      t.decimal("shipping_charges", 14, 2).notNullable().defaultTo(0);
      t.decimal("grand_total", 14, 2).notNullable().defaultTo(0);

      // Audit fields
      t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("purchase_orders");

  // Drop enum if PostgreSQL requires cleanup
  try {
    await knex.raw("DROP TYPE IF EXISTS po_status");
  } catch (e) {
    console.warn("Enum cleanup skipped:", e.message);
  }
};
