const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'psr_inventory'
  }
});

knex.raw('SELECT 1+1 AS result')
  .then((res) => {
    console.log('Knex connected! Result:', res.rows[0].result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Knex connection failed:', err);
    process.exit(1);
  });
