/**
 * @param {import('knex')} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_parts", (table) => {
    table.increments("id").primary();

    table
      .integer("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");

    table
      .integer("part_id")
      .notNullable()
      .references("part_id")
      .inTable("inventory")
      .onDelete("RESTRICT");

    table.string("section", 50).notNullable().defaultTo("Mechanical");
    table.decimal("qty_required", 12, 3).notNullable().defaultTo(1);

    table.string("source_part_number", 255);
    table.text("source_description");
    table.text("notes");

    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());

    table.unique(["product_id", "part_id", "section"], {
      indexName: "product_parts_unique_product_part_section",
    });

    table.index(["product_id"], "product_parts_product_id_idx");
    table.index(["part_id"], "product_parts_part_id_idx");
    table.index(["section"], "product_parts_section_idx");
  });
};

/**
 * @param {import('knex')} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_parts");
};