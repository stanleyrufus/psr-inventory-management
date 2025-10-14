exports.up = function(knex) {
  return knex.schema.createTable('sales_orders', table => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE');
    table.string('customer_name').notNullable();
    table.integer('quantity').notNullable();
    table.float('total_price').notNullable();
    table.timestamp('sold_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sales_orders');
};
