exports.up = function (knex) {
  return knex.schema.alterTable('products', (table) => {
    table.text('description').defaultTo('');
    table.string('unit', 50).defaultTo('pcs');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('products', (table) => {
    table.dropColumn('description');
    table.dropColumn('unit');
  });
};
