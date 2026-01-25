// backend/db.js
import knex from "knex";
import dotenv from "dotenv";
dotenv.config();

// ✅ Force IPv4 when host is localhost to avoid ::1 ECONNRESET on Windows
const rawHost = process.env.PG_HOST || "127.0.0.1";
const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;

export const db = knex({
  client: "pg",
  connection: {
    host,
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "password",
    database: process.env.PG_DATABASE || "psr_inventory",

    // ✅ explicitly disable SSL for local docker postgres
    ssl: false,

    // ✅ helps stability on Windows + docker networking
    keepAlive: true,
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
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}
