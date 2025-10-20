/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.table('users', function (table) {
    table.string('password').notNullable().defaultTo('');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('users', function (table) {
    table.dropColumn('password');
  });
};
