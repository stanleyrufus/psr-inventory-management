exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("po_rfq_emails");
  if (exists) return;

  await knex.schema.createTable("po_rfq_emails", (table) => {
    table.increments("id").primary();
    table
      .integer("po_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("purchase_orders")
      .onDelete("CASCADE");

    table.text("to_emails");
    table.text("cc_emails");
    table.text("subject");
    table.text("body_html");
    table.timestamp("sent_at");
    table.string("status");
    table.text("last_error");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("po_rfq_emails");
};