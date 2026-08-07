exports.up = async function (knex) {
  await knex.schema.alterTable("inventory", (table) => {
    table.text("product_url").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("inventory", (table) => {
    table.dropColumn("product_url");
  });
};