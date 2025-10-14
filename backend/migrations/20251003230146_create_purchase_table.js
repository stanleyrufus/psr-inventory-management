exports.up = function(knex) {
  return knex.schema.createTable('purchase_orders', table => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE');
    table.integer('quantity').notNullable();
    table.float('total_price').notNullable();
    table.string('supplier_name').notNullable();
    table.timestamp('purchased_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('purchase_orders');
};
