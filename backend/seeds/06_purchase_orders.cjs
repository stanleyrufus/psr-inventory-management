/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Clear existing purchase orders
  await knex("purchase_orders").del();

  await knex("purchase_orders").insert([
    {
      id: 1,
      supplier_id: 101, // Example: reference to supplier table if exists
      created_by: "system_admin",
      status: "Approved",
      payment_method: "Wire Transfer",
      payment_terms: "Net 30",
      currency: "USD",
      remarks: "Initial raw material order",
      tax_percent: 7.5,
      shipping_charges: 50.0,
      subtotal: 5000.0,
      tax_amount: 375.0,
      grand_total: 5425.0,
      order_date: new Date("2025-10-10"),
      expected_delivery_date: new Date("2025-10-20"),
      psr_po_number: "PO-20251010-001",
    },
    {
      id: 2,
      supplier_id: 102,
      created_by: "system_admin",
      status: "Draft",
      payment_method: "Credit Card",
      payment_terms: "Net 15",
      currency: "USD",
      remarks: "Packaging materials for production",
      tax_percent: 8.0,
      shipping_charges: 25.0,
      subtotal: 2000.0,
      tax_amount: 160.0,
      grand_total: 2185.0,
      order_date: new Date("2025-10-15"),
      expected_delivery_date: new Date("2025-10-25"),
      psr_po_number: "PO-20251015-002",
    },
  ]);
};
