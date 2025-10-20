exports.seed = async function (knex) {
  await knex('inventory').del();
  await knex('inventory').insert([
    { id: 1, product_id: 1, quantity: 60, location: 'Warehouse A' },
    { id: 2, product_id: 2, quantity: 25, location: 'Warehouse B' },
    { id: 3, product_id: 3, quantity: 12, location: 'Warehouse C' },
  ]);
};
