const bcrypt = require('bcrypt');
const knex = require('./knex'); // your knex connection

(async () => {
  const hashed = await bcrypt.hash('admin', 10); // new password = 'admin'
  await knex('users')
    .where({ username: 'admin' })
    .update({ password: hashed });
  console.log('Admin password reset!');
  process.exit(0);
})();
