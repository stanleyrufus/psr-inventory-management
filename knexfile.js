// knexfile.js

module.exports = {
  development: {
    client: "pg", // using PostgreSQL
    connection: {
      host: "127.0.0.1",    // or "localhost" (depends if running from host machine)
      port: 5432,           // default Postgres port
      user: "postgres",     // user you set in docker-compose.yml
      password: "password", // same as POSTGRES_PASSWORD in docker-compose
      database: "psr_inventory"       // DB name
    },
    migrations: {
      directory: "./backend/migrations" // where your .js migration files are stored
    }
  }
};
