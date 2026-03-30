exports.up = async function (knex) {
  await knex.schema.alterTable('inventory', (table) => {
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });

  await knex.schema.alterTable('sales', (table) => {
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });

  await knex.schema.alterTable('purchase', (table) => {
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('inventory', (table) => {
    table.dropForeign('product_id');
  });

  await knex.schema.alterTable('sales', (table) => {
    table.dropForeign('product_id');
  });

  await knex.schema.alterTable('purchase', (table) => {
    table.dropForeign('product_id');
  });
};