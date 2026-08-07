exports.up = async function up(knex) {
  await knex.schema.alterTable("inventory", (table) => {
    table
      .string("enrichment_status", 50)
      .notNullable()
      .defaultTo("not_started");

    table
      .string("image_review_status", 30)
      .notNullable()
      .defaultTo("not_reviewed");

    table.text("image_source_url").nullable();

    table.string("enrichment_provider", 100).nullable();
    table.string("enrichment_strategy", 150).nullable();

    table.decimal("enrichment_confidence", 5, 4).nullable();

    table.text("enrichment_evidence").nullable();
    table.text("enrichment_error").nullable();

    table.timestamp("enrichment_attempted_at", {
      useTz: true,
    }).nullable();

    table.timestamp("enriched_at", {
      useTz: true,
    }).nullable();

    table.timestamp("image_reviewed_at", {
      useTz: true,
    }).nullable();

    table.integer("image_reviewed_by").nullable();
  });

  await knex.schema.raw(`
    ALTER TABLE inventory
    ADD CONSTRAINT inventory_enrichment_status_check
    CHECK (
      enrichment_status IN (
        'not_started',
        'processing',
        'completed',
        'product_found_no_image',
        'failed'
      )
    )
  `);

  await knex.schema.raw(`
    ALTER TABLE inventory
    ADD CONSTRAINT inventory_image_review_status_check
    CHECK (
      image_review_status IN (
        'not_reviewed',
        'pending_review',
        'approved',
        'rejected'
      )
    )
  `);

  await knex.schema.raw(`
    CREATE INDEX inventory_enrichment_status_idx
    ON inventory(enrichment_status)
  `);

  await knex.schema.raw(`
    CREATE INDEX inventory_image_review_status_idx
    ON inventory(image_review_status)
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE inventory
    DROP CONSTRAINT IF EXISTS inventory_enrichment_status_check
  `);

  await knex.schema.raw(`
    ALTER TABLE inventory
    DROP CONSTRAINT IF EXISTS inventory_image_review_status_check
  `);

  await knex.schema.alterTable("inventory", (table) => {
    table.dropColumn("image_reviewed_by");
    table.dropColumn("image_reviewed_at");
    table.dropColumn("enriched_at");
    table.dropColumn("enrichment_attempted_at");
    table.dropColumn("enrichment_error");
    table.dropColumn("enrichment_evidence");
    table.dropColumn("enrichment_confidence");
    table.dropColumn("enrichment_strategy");
    table.dropColumn("enrichment_provider");
    table.dropColumn("image_source_url");
    table.dropColumn("image_review_status");
    table.dropColumn("enrichment_status");
  });
};