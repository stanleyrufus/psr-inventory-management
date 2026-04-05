exports.up = async function (knex) {
  const permissions = [
    {
      name: "delete_purchase_orders",
      description: "Can delete purchase orders",
    },
    {
      name: "mark_po_paid",
      description: "Can mark purchase orders as paid",
    },
    {
      name: "mark_po_unpaid",
      description: "Can mark purchase orders as unpaid",
    },
    {
      name: "view_reports",
      description: "Can view reports",
    },
    {
      name: "manage_settings",
      description: "Can manage settings",
    },
  ];

  for (const perm of permissions) {
    const exists = await knex("permissions").where({ name: perm.name }).first();
    if (!exists) {
      await knex("permissions").insert(perm);
    }
  }
};

exports.down = async function (knex) {
  await knex("permissions")
    .whereIn("name", [
      "delete_purchase_orders",
      "mark_po_paid",
      "mark_po_unpaid",
      "view_reports",
      "manage_settings",
    ])
    .del();
};