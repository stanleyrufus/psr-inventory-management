export function up(knex) {
  return knex.schema.table("po_rfq_emails", (t) => {
    t.specificType("bcc_emails", "text[]").defaultTo("{}");
  });
}

export function down(knex) {
  return knex.schema.table("po_rfq_emails", (t) => {
    t.dropColumn("bcc_emails");
  });
}
