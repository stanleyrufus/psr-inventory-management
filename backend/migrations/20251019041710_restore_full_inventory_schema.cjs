// backend/migrations/20251019041710_restore_full_inventory_schema.cjs

exports.up = async function (knex) {
  // Drop the old minimal table if it exists
  const hasOld = await knex.schema.hasTable("inventory");
  if (hasOld) {
    await knex.schema.dropTable("inventory");
  }

  // Recreate your full working schema
  await knex.schema.createTable("inventory", (table) => {
    table.increments("part_id").primary();
    table.string("part_number").notNullable().unique();
    table.string("description");
    table.integer("quantity_on_hand").defaultTo(0);
    table.integer("minimum_stock_level").defaultTo(0);
    table.decimal("unit_price", 10, 2);
    table.decimal("weight_kg", 10, 3);
    table.integer("lead_time_days");
    table.date("last_order_date");
    table.string("location").defaultTo("");
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("inventory");
};
