// backend/migrations/20251018160003_create_purchase_order_files.cjs
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("purchase_order_files");
  if (!exists) {
    await knex.schema.createTable("purchase_order_files", (t) => {
      t.increments("id").primary();
      t
        .integer("po_id")
        .unsigned()
        .notNullable()
        .references("id") // ✅ match actual PK column in purchase_orders
        .inTable("purchase_orders")
        .onDelete("CASCADE");
      t.string("original_filename").notNullable();
      t.string("stored_filename").notNullable();
      t.string("mime_type").notNullable();
      t.bigInteger("size_bytes").notNullable().defaultTo(0);
      t.string("filepath").notNullable();
      t.timestamp("uploaded_at").defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("purchase_order_files");
};
