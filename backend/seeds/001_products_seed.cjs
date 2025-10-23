/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // Clear table
  await knex("products").del();

  // Helper to safely insert JSON arrays for jsonb columns
  const toJSON = (arr) => knex.raw(`?::jsonb`, [JSON.stringify(arr)]);

  // Insert rows
  await knex("products").insert([
    {
      category: "Filling Machines",
      product_code: "F3000",
      product_name: "8 Head Servo Filler",
      short_description:
        "Versatile 8-head volumetric servo filler designed for precision across industries. Demo available.",
      full_description:
        "The PSR Automation Inc. F3000 Servo Filler is a state-of-the-art solution for filling applications ranging from 2oz to 2.5 gallons. Offered in 2, 4, 6, or 8 head configurations, this machine delivers high precision and reliability for diverse industries.",
      key_features: toJSON([
        "Volumetric design using USA-made Positive Displacement Lobe Pumps",
        "Each nozzle has its own pump",
        "Quick change-over within 15 minutes",
        "Utilizes industrial AC servo motors",
      ]),
      applications: toJSON([
        "Pharmaceuticals",
        "Cosmetics",
        "Food and Beverage",
        "Chemicals",
      ]),
      machine_type: "Servo Filler",
      frame_series: "3000-Series",
      nozzle_count: "2, 4, 6, or 8",
      image_url: "/images/f3000.jpg",
      pdf_brochure_url: "/pdfs/f3000.pdf",
      demo_available: true,
      contact_email: "info@psrautomation.com",
      contact_phone: "952-233-1441",
      status: "Active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      category: "Capping Machines",
      product_code: "TO1000",
      product_name: "Torquing Machine",
      short_description:
        "Compact and portable inline torquer, ideal for moderate runs or re-torquing applications.",
      full_description:
        "The PSR Automation Inc. TO1000 Torquer is designed for flexibility and efficiency. It can handle a wide variety of bottle and cap sizes quickly and economically, making it perfect for re-torquing or moderate production runs.",
      key_features: toJSON([
        "Inline Capper 4-disks (2 pairs)",
        "Quick change features for different cap sizes",
        "Portable and compact design",
        "Economical solution for moderate runs",
      ]),
      applications: toJSON([
        "Pharmaceuticals",
        "Cosmetics",
        "Food and Beverage",
        "Chemicals",
      ]),
      machine_type: "Torquing Machine",
      frame_series: "1000-Series",
      image_url: "/images/to1000.jpg",
      pdf_brochure_url: "/pdfs/to1000.pdf",
      demo_available: false,
      contact_email: "info@psrautomation.com",
      contact_phone: "952-233-1441",
      status: "Active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      category: "Material Handling",
      product_code: "BTH",
      product_name: "Bottle Hopper",
      short_description:
        "High-grade stainless steel bottle hopper designed for efficient bottle storage and dispensing.",
      full_description:
        "The PSR Automation Inc. Bottle Hopper efficiently stores and dispenses bottles to keep your line running smoothly. Its stainless steel design ensures durability and hygiene, ideal for food, beverage, and pharmaceutical applications.",
      key_features: toJSON([
        "Constructed from 304 stainless steel",
        "Adjustable feed rate",
        "Seamless integration with automation systems",
      ]),
      applications: toJSON([
        "Beverage Production",
        "Pharmaceutical Packaging",
        "Cosmetic Manufacturing",
      ]),
      machine_type: "Bottle Hopper",
      frame_series: null,
      image_url: "/images/bth.jpg",
      pdf_brochure_url: "/pdfs/bth.pdf",
      demo_available: false,
      contact_email: "info@psrautomation.com",
      contact_phone: "952-233-1441",
      status: "Active",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
};
