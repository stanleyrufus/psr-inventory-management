exports.seed = async function (knex) {
  await knex('purchase_orders').del();
  await knex('purchase_orders').insert([
    {
      id: 1,
      supplier_name: 'ABC Metals',
      product_id: 1,
      quantity: 100,
      total_price: 317.0,
      purchased_at: new Date('2025-10-14'),
    },
    {
      id: 2,
      supplier_name: 'Global Alloy Suppliers',
      product_id: 2,
      quantity: 50,
      total_price: 271.0,
      purchased_at: new Date('2025-10-10'),
    },
  ]);
};
