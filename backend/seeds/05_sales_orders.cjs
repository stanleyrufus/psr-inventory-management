exports.seed = async function (knex) {
  await knex('sales_orders').del();
  await knex('sales_orders').insert([
    {
      sales_order_id: 1,
      customer_name: 'TechMach Industries',
      product_id: 1,
      quantity: 10,
      total_price: 31.7,
      status: 'Delivered',
      order_date: new Date('2025-09-15'),
      delivery_date: new Date('2025-09-20'),
    },
    {
      sales_order_id: 2,
      customer_name: 'MetalPro Ltd.',
      product_id: 2,
      quantity: 5,
      total_price: 27.1,
      status: 'Pending',
      order_date: new Date('2025-09-22'),
    },
  ]);
};
