exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('username').notNullable();
    table.string('email').notNullable();
    table.integer('role_id').unsigned().references('id').inTable('roles');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
