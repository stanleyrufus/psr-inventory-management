const path = require("path");
const knex = require("knex");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL || {
    host: process.env.PG_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.PG_PORT || process.env.DB_PORT || 5432),
    user: process.env.PG_USER || process.env.DB_USER || "postgres",
    password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.PG_DATABASE || process.env.DB_NAME || "psr_inventory",
  },
});

const TARGETS = [
  { table: "products", pk: "id" },
  { table: "inventory", pk: "part_id" },
  { table: "purchase_orders", pk: "id" },
  { table: "purchase_order_items", pk: "id" },
  { table: "purchase_order_files", pk: "id" },
  { table: "roles", pk: "id" },
  { table: "users", pk: "id" },
  { table: "sales_orders", pk: "id" },
  { table: "product_parts", pk: "id" },
{ table: "vendors", pk: "vendor_id" },
];

async function syncOne(table, pk) {
  const sql = `
    SELECT
      pg_get_serial_sequence('${table}', '${pk}') AS seq_name,
      COALESCE((SELECT MAX(${pk}) FROM ${table}), 0) AS max_id
  `;
  const seqInfo = await db.raw(sql);
  const row = seqInfo.rows[0];

  if (!row || !row.seq_name) {
    return {
      table,
      pk,
      skipped: true,
      reason: "no serial sequence found",
    };
  }

  const setvalSql = `
    SELECT setval('${row.seq_name}', GREATEST(${Number(row.max_id)}, 1), true) AS new_value
  `;
  const result = await db.raw(setvalSql);

  return {
    table,
    pk,
    sequence: row.seq_name,
    max_id: Number(row.max_id),
    new_value: result.rows[0]?.new_value ?? null,
    skipped: false,
  };
}

async function main() {
  console.log("Syncing sequences...");
  const summary = [];

  for (const t of TARGETS) {
    try {
      const result = await syncOne(t.table, t.pk);
      summary.push(result);
    } catch (err) {
      summary.push({
        table: t.table,
        pk: t.pk,
        skipped: true,
        reason: err.message,
      });
    }
  }

  console.table(summary);
  await db.destroy();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("sync_sequences failed:", err);
  try {
    await db.destroy();
  } catch {}
  process.exit(1);
});