// backend/migrations/20251019_update_po_openedby_text.cjs

exports.up = async function (knex) {
  // Change integer columns to text for opened_by and approved_by
  await knex.schema.alterTable("purchase_orders", function (table) {
    table.text("opened_by").alter();
    table.text("approved_by").alter();
  });
};

exports.down = async function (knex) {
  // Revert text columns back to integer (only if needed)
  await knex.schema.alterTable("purchase_orders", function (table) {
    table.integer("opened_by").alter();
    table.integer("approved_by").alter();
  });
};
