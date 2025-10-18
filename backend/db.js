// backend/db.js
import knex from "knex";
import dotenv from "dotenv";
dotenv.config();

export const db = knex({
  client: "pg",
  connection: {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres",
    database: process.env.PG_DATABASE || "psr_inventory",
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 10000,
    afterCreate: (conn, done) => {
      conn.query("SET timezone='UTC';", (err) => done(err, conn));
    },
  },
});

export async function connectDB() {
  try {
    await db.raw("SELECT 1");
    console.log("✅ Connected to PostgreSQL");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
}
