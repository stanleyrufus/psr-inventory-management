// backend/knexfile.cjs
require("dotenv").config();
const path = require("path");

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "psr_inventory",
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
      extension: "cjs",
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
  },
};
