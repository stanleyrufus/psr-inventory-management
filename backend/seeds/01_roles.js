exports.seed = async function(knex) {
  // delete dependent users first
  await knex('users').del();   

  // delete roles
  await knex('roles').del();   

  // insert new roles
  await knex('roles').insert([
    { id: 1, name: 'Admin' },
    { id: 2, name: 'User' },
  ]);
};
