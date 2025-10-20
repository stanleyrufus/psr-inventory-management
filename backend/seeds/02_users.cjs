const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // Delete existing users
  await knex('users').del();

  // Hash default admin password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Insert default admin user
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'admin@psr.com',
      password: hashedPassword,
      role: 'admin' // must match JWT payload
    }
  ]);
};
