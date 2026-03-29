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

const PRODUCT_IDS_TO_MARK_INACTIVE = [
  34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
];

async function main() {
  console.log("Checking products to mark Inactive...");

  const beforeRows = await db("products")
    .select("id", "product_code", "product_name", "status")
    .whereIn("id", PRODUCT_IDS_TO_MARK_INACTIVE)
    .orderBy("id");

  console.log("Rows found:");
  console.table(beforeRows);

  const updatedCount = await db("products")
    .whereIn("id", PRODUCT_IDS_TO_MARK_INACTIVE)
    .whereNot("status", "Inactive")
    .update({
      status: "Inactive",
      updated_at: db.fn.now(),
    });

  console.log(`Rows updated to Inactive: ${updatedCount}`);

  const afterRows = await db("products")
    .select("id", "product_code", "product_name", "status")
    .whereIn("id", PRODUCT_IDS_TO_MARK_INACTIVE)
    .orderBy("id");

  console.log("Final state:");
  console.table(afterRows);

  await db.destroy();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("cleanup_products_set_inactive failed:", err);
  try {
    await db.destroy();
  } catch {}
  process.exit(1);
});