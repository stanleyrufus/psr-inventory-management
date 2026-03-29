/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Delete existing rows
  await knex("sales_orders").del();

  // Insert seed data that matches your table schema
  await knex("sales_orders").insert([
    {
      product_id: 1, // F3000 from products table
      customer_name: "Acme Manufacturing Co.",
      quantity: 2,
      total_price: 49990.0,
      sold_at: knex.fn.now(), // sets current timestamp
    },
    {
      product_id: 2, // TO1000 from products table
      customer_name: "Global Bottling Solutions",
      quantity: 1,
      total_price: 19950.0,
      sold_at: knex.fn.now(),
    },
    {
      product_id: 3, // BTH from products table
      customer_name: "Precision Packaging LLC",
      quantity: 4,
      total_price: 8000.0,
      sold_at: knex.fn.now(),
    },
  ]);
};
