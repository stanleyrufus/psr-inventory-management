exports.up = async function (knex) {
  await knex.schema.alterTable("purchase_order_items", (table) => {
    table.decimal("received_quantity", 12, 2).notNullable().defaultTo(0);
    table.decimal("backorder_quantity", 12, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("purchase_order_items", (table) => {
    table.dropColumn("received_quantity");
    table.dropColumn("backorder_quantity");
  });
};