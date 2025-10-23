/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Clear table before seeding
  await knex("inventory").del();

  // Insert demo inventory records
  await knex("inventory").insert([
    {
      part_number: "AL-6061-2x6x72",
      part_name: "6061 Aluminum Bar",
      category: "Metals",
      description: "6061 Aluminum Bar 2x6x72",
      uom: "Piece",
      quantity_on_hand: 15,
      minimum_stock_level: 3,
      unit_price: 24.95,
      supplier_name: "ABC Metals",
      supplier_part_number: "ABC-ALB2",
      location: "Aisle 4 - Rack C",
      status: "Active",
      lead_time_days: 5,
      weight_kg: 9.4,
      material: "Aluminum",
      remarks: "Initial stock batch",
    },
    {
      part_number: "ST-1018-1x2x36",
      part_name: "1018 Steel Bar",
      category: "Metals",
      description: "1018 Cold Rolled Steel Bar 1x2x36",
      uom: "Piece",
      quantity_on_hand: 25,
      minimum_stock_level: 5,
      unit_price: 18.5,
      supplier_name: "SteelWorks Inc.",
      supplier_part_number: "SW-1018",
      location: "Aisle 2 - Rack A",
      status: "Active",
      lead_time_days: 7,
      weight_kg: 5.2,
      material: "Steel",
      remarks: "Regular stock item",
    },
    {
      part_number: "PL-ABS-0.25x24x48",
      part_name: "ABS Plastic Sheet",
      category: "Plastics",
      description: "ABS Plastic Sheet 0.25in x 24in x 48in",
      uom: "Sheet",
      quantity_on_hand: 50,
      minimum_stock_level: 10,
      unit_price: 12.0,
      supplier_name: "PolyTech Supplies",
      supplier_part_number: "PT-ABS-025",
      location: "Aisle 6 - Rack F",
      status: "Active",
      lead_time_days: 10,
      weight_kg: 2.1,
      material: "ABS Plastic",
      remarks: "Used for custom enclosures",
    },
  ]);
};
