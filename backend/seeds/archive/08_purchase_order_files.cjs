/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Delete existing file records
  await knex("purchase_order_files").del();

  // Insert new seed data matching your schema
  await knex("purchase_order_files").insert([
    {
      po_id: 1, // References purchase_orders.id
      original_filename: "PO_ABCMetals_2025.pdf",
      stored_filename: "po_1_ABCMetals.pdf",
      mime_type: "application/pdf",
      size_bytes: 23456,
      filepath: "/uploads/po_1_ABCMetals.pdf",
      uploaded_at: knex.fn.now(),
    },
    {
      po_id: 2,
      original_filename: "PO_GlobalAlloy_2025.pdf",
      stored_filename: "po_2_GlobalAlloy.pdf",
      mime_type: "application/pdf",
      size_bytes: 28340,
      filepath: "/uploads/po_2_GlobalAlloy.pdf",
      uploaded_at: knex.fn.now(),
    },
  ]);
};
