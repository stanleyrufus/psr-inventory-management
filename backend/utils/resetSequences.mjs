// backend/utils/resetSequences.cjs
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "psr_inventory",
});

async function resetSequences() {
  try {
    await client.connect();

    console.log("🔄 Resetting all sequences in database...");

    const tables = await client.query(`
      SELECT table_name, column_name, column_default
      FROM information_schema.columns
      WHERE column_default LIKE 'nextval%' AND table_schema='public';
    `);

    for (const row of tables.rows) {
      const match = row.column_default.match(/'(.*?)'/);
      if (!match) continue;
      const seqName = match[1];

      const res = await client.query(`SELECT MAX(${row.column_name}) AS max FROM ${row.table_name}`);
      const nextVal = (res.rows[0].max || 0) + 1;

      await client.query(`ALTER SEQUENCE ${seqName} RESTART WITH ${nextVal}`);
      console.log(`✅ Reset sequence for ${row.table_name} → ${nextVal}`);
    }

    console.log("🎯 All sequences reset successfully!");
  } catch (err) {
    console.error("❌ Error resetting sequences:", err);
  } finally {
    await client.end();
  }
}

resetSequences();
