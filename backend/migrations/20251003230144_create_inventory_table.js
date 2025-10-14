exports.up = function(knex) {
  return knex.schema.createTable('inventory', table => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE');
    table.integer('quantity').notNullable();
    table.string('location').defaultTo(''); // added for frontend
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('inventory');
};
