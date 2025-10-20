// backend/run-seeds.cjs
require("dotenv").config();
const knexConfig = require("./knexfile.cjs");
const knex = require("knex")(knexConfig.development);

async function runSeeds() {
  try {
    console.log("🌱 Running seeds...");
    await knex.seed.run();
    console.log("✅ Seeds completed successfully!");
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await knex.destroy();
  }
}

runSeeds();
