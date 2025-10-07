module.exports = {
  development: {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "password", // match docker-compose
      database: "psr_inventory"
    },
   migrations: {
  directory: __dirname + '/migrations'
}
  }
};
