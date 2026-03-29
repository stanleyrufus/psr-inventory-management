const fs = require("fs");
const path = require("path");
const knex = require("knex");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

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

function mapProduct(p) {
  const technicalSpecs = Array.isArray(p.technical_specs) ? p.technical_specs : [];

  const getSpec = (label) =>
    technicalSpecs.find((x) => String(x.label || "").toLowerCase() === label.toLowerCase())?.value || null;

  return {
    id: p.id,
    category: p.category || null,
    subcategory: p.subcategory || null,
    product_code: p.product_code || null,
    product_name: p.product_name || null,
    short_description: p.short_description || null,
    full_description: p.long_description || null,
    key_features: Array.isArray(p.key_features) ? JSON.stringify(p.key_features) : null,
    applications: Array.isArray(p.applications) ? JSON.stringify(p.applications) : null,
    machine_type: null,
    frame_series: getSpec("Frame Series"),
    nozzle_count: getSpec("Nozzles") || getSpec("Nozzle Options"),
    image_url: p.image_url || null,
    pdf_brochure_url: p.pdf_brochure_url || null,
    demo_available: p.demo_available ?? null,
    contact_email: p.contact_info?.email || null,
    contact_phone: p.contact_info?.phone || null,
    status: "Active",
    updated_at: db.fn.now(),
  };
}

async function main() {
  const jsonPath = path.join(__dirname, "..", "..", "frontend", "src", "data", "products.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const products = JSON.parse(raw);

  console.log(`Loaded ${products.length} products from JSON`);

  for (const p of products) {
    const row = mapProduct(p);

    const existingById = await db("products").where({ id: row.id }).first();
    const existingByCode = row.product_code
      ? await db("products").where({ product_code: row.product_code }).first()
      : null;

    if (existingById) {
      await db("products")
        .where({ id: row.id })
        .update(row);
      console.log(`UPDATED by id: ${row.id} ${row.product_code}`);
    } else if (existingByCode) {
      await db("products")
        .where({ product_code: row.product_code })
        .update({ ...row, id: existingByCode.id });
      console.log(`UPDATED by code: ${existingByCode.id} ${row.product_code}`);
    } else {
      await db("products").insert({
        ...row,
        created_at: db.fn.now(),
      });
      console.log(`INSERTED: ${row.id} ${row.product_code}`);
    }
  }

  const seqSql = `
    SELECT setval(
      pg_get_serial_sequence('products','id'),
      COALESCE((SELECT MAX(id) FROM products), 1),
      true
    );
  `;
  const seq = await db.raw(seqSql);
  console.log("Sequence synced:", seq.rows?.[0] || seq);

  await db.destroy();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error(err);
  await db.destroy();
  process.exit(1);
});