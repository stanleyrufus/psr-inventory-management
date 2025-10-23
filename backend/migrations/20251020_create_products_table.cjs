/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.string("category").notNullable(); // e.g. Filling Machines
    table.string("subcategory"); // optional future use
    table.string("product_code").unique().notNullable(); // e.g. F3000
    table.string("product_name").notNullable(); // e.g. 8 Head Servo Filler
    table.text("short_description");
    table.text("full_description");
    table.jsonb("key_features"); // array of bullet points
    table.jsonb("applications"); // array of applications
    table.string("machine_type");
    table.string("frame_series");
    table.string("nozzle_count");
    table.text("image_url");
    table.text("pdf_brochure_url");
    table.boolean("demo_available").defaultTo(false);
    table.string("contact_email").defaultTo("info@psrautomation.com");
    table.string("contact_phone").defaultTo("952-233-1441");
    table.string("status").defaultTo("Active");
    table.timestamps(true, true); // created_at, updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("products");
};
