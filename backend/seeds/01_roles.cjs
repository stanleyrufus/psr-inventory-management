exports.seed = async function(knex) {
  // Optional: If you have a roles table
  await knex('roles').del();

  await knex('roles').insert([
    { id: 1, name: 'admin' },
    { id: 2, name: 'user' },
  ]);
};
