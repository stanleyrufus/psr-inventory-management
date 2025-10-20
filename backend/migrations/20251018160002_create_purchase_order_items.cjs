// backend/migrations/20251018160002_create_purchase_order_items.js
exports.up = async function (knex) {
  const has = await knex.schema.hasTable('purchase_order_items');
  if (!has) {
    await knex.schema.createTable('purchase_order_items', (t) => {
      t.increments('id').primary();
      t.integer('po_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');

      // Align with your existing "products" used by parts endpoints (id, part_number)
      t.integer('product_id').references('id').inTable('products').onDelete('SET NULL');

      t.string('description');
      t.decimal('quantity', 14, 3).notNullable().defaultTo(0);
      t.string('unit').notNullable().defaultTo('pcs');
      t.decimal('unit_price', 14, 4).notNullable().defaultTo(0);
      t.decimal('total_price', 14, 2).notNullable().defaultTo(0);
      t.integer('line_no').notNullable().defaultTo(1);

      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      t.index(['po_id']);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('purchase_order_items');
};
