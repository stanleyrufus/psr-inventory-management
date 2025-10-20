/**
 * Add business-related columns to purchase_orders table
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("purchase_orders", (table) => {
    table.string("status", 50).defaultTo("Draft");
    table.string("payment_method", 100).nullable();
    table.string("payment_terms", 100).nullable();
    table.string("currency", 10).defaultTo("USD");
    table.text("remarks").nullable();

    table.decimal("tax_percent", 5, 2).defaultTo(0);
    table.decimal("shipping_charges", 12, 2).defaultTo(0);
    table.decimal("subtotal", 12, 2).defaultTo(0);
    table.decimal("tax_amount", 12, 2).defaultTo(0);
    table.decimal("grand_total", 12, 2).defaultTo(0);

    table.timestamp("order_date").defaultTo(knex.fn.now());
    table.timestamp("expected_delivery_date").nullable();
    table.string("psr_po_number", 100).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("purchase_orders", (table) => {
    table.dropColumn("status");
    table.dropColumn("payment_method");
    table.dropColumn("payment_terms");
    table.dropColumn("currency");
    table.dropColumn("remarks");
    table.dropColumn("tax_percent");
    table.dropColumn("shipping_charges");
    table.dropColumn("subtotal");
    table.dropColumn("tax_amount");
    table.dropColumn("grand_total");
    table.dropColumn("order_date");
    table.dropColumn("expected_delivery_date");
    table.dropColumn("psr_po_number");
  });
};
