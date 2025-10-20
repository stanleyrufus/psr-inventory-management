exports.seed = async function (knex) {
  await knex('purchase_order_items').del();
  await knex('purchase_order_items').insert([
    {
      id: 1,
      po_id: 1,
      product_id: 1,
      description: '6061 Aluminum Flat Bar 1/2 x 5',
      quantity: 100,
      unit: 'pcs',
      unit_price: 3.17,
      total_price: 317.0,
      line_no: 1,
    },
    {
      id: 2,
      po_id: 2,
      product_id: 2,
      description: '304 Stainless Rod 3/4"',
      quantity: 50,
      unit: 'pcs',
      unit_price: 5.42,
      total_price: 271.0,
      line_no: 1,
    },
  ]);
};
