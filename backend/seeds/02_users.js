const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del();

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Insert default admin user
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'admin@psr.com',
      password: hashedPassword,
      role_id: 1 // Admin role
    }
  ]);
};
