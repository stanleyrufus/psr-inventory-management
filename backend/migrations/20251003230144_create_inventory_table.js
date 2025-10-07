exports.up = function(knex) {
  return knex.schema.createTable('inventory', table => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products');
    table.integer('quantity').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('inventory');
};
