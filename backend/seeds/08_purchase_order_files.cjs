exports.seed = async function (knex) {
  await knex('purchase_order_files').del();
  await knex('purchase_order_files').insert([
    {
      id: 1,
      po_id: 1,
      original_filename: 'PO_ABCMetals_2025.pdf',
      stored_filename: 'po_1_ABCMetals.pdf',
      mime_type: 'application/pdf',
      size_bytes: 23456,
      filepath: '/uploads/po_1_ABCMetals.pdf',
    },
    {
      id: 2,
      po_id: 2,
      original_filename: 'PO_GlobalAlloy_2025.pdf',
      stored_filename: 'po_2_GlobalAlloy.pdf',
      mime_type: 'application/pdf',
      size_bytes: 28340,
      filepath: '/uploads/po_2_GlobalAlloy.pdf',
    },
  ]);
};
