export async function up(knex) {
  const tableExists = await knex.schema.hasTable("po_rfq_emails");
  if (!tableExists) return;

  const hasColumn = await knex.schema.hasColumn("po_rfq_emails", "bcc_emails");
  if (hasColumn) return;

  await knex.schema.table("po_rfq_emails", (t) => {
    t.specificType("bcc_emails", "text[]").defaultTo("{}");
  });
}

export async function down(knex) {
  const tableExists = await knex.schema.hasTable("po_rfq_emails");
  if (!tableExists) return;

  const hasColumn = await knex.schema.hasColumn("po_rfq_emails", "bcc_emails");
  if (!hasColumn) return;

  await knex.schema.table("po_rfq_emails", (t) => {
    t.dropColumn("bcc_emails");
  });
}