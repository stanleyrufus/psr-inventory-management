exports.up = async function (knex) {
  return knex.schema.alterTable("purchase_orders", function (table) {
    table.integer("opened_by").nullable();
    table.integer("approved_by").nullable();
    table.integer("supplier_id").nullable();
  });
};

exports.down = async function (knex) {
  return knex.schema.alterTable("purchase_orders", function (table) {
    table.dropColumn("opened_by");
    table.dropColumn("approved_by");
    table.dropColumn("supplier_id");
  });
};
