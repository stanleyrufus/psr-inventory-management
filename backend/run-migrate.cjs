// backend/run-migrate.cjs
const knexConfig = require("./knexfile.cjs");
const knex = require("knex")(knexConfig.development);

(async () => {
  try {
    console.log("Running migrations...");
    const result = await knex.migrate.latest();
    console.log("✅ Migration complete:", result);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await knex.destroy();
  }
})();
