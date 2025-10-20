exports.seed = async function (knex) {
  await knex('products').del();
  await knex('products').insert([
    {
      id: 1,
      name: '6061 T6511 Aluminum Flat Bar',
      description: '1/2 x 5 x 144" – lightweight corrosion-resistant alloy',
      price: 3.17,
      unit: 'P',
    },
    {
      id: 2,
      name: '304 Stainless Steel Rod',
      description: '3/4" x 10ft – high strength stainless rod',
      price: 5.42,
      unit: 'P',
    },
    {
      id: 3,
      name: 'Brass Sheet',
      description: '0.25 x 48" x 96" – good machinability and corrosion resistance',
      price: 8.35,
      unit: 'Sheet',
    },
  ]);
};
