import db from './db/knex.js';

db.raw('SELECT 1')
  .then(() => {
    console.log('Database connected successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
