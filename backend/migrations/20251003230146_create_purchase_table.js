exports.up = function(knex) {
  return knex.schema.createTable('purchase', table => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products');
    table.integer('quantity').notNullable();
    table.timestamp('purchased_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('purchase');
};
