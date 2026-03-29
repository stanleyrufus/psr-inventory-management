/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Clear existing items
  await knex("purchase_order_items").del();

  // 🔍 Dynamically fetch existing inventory part IDs
  const parts = await knex("inventory").select("part_id").orderBy("part_id");
  if (parts.length < 2) {
    throw new Error("Need at least 2 inventory parts for seeding PO items.");
  }

  await knex("purchase_order_items").insert([
    {
      po_id: 1,
      line_no: 1,
      part_id: parts[0].part_id, // use first available part
      quantity: 100.0,
      unit_price: 3.17,
      total_price: 317.0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      po_id: 2,
      line_no: 1,
      part_id: parts[1].part_id, // use second available part
      quantity: 50.0,
      unit_price: 5.42,
      total_price: 271.0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
};
