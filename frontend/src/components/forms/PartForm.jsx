import React, { useState, useEffect } from "react";
import api from "../../utils/api";

export default function PartForm({ initial, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    part_number: "",
    part_name: "",
    category: "",
    description: "",
    uom: "",
    quantity_on_hand: 0,
    minimum_stock_level: 0,
    unit_price: 0.0,
    supplier_name: "",
    supplier_part_number: "",
    location: "",
    status: "Active",
    used_in_products: [],
    part_image_url: "",
    lead_time_days: 0,
    weight_kg: 0.0,
    material: "",
    machine_compatibility: "",
    last_order_date: "",
    remarks: "",
  });

  useEffect(() => {
    if (initial) setFormData({ ...formData, ...initial });
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e) => {
    setFormData((prev) => ({ ...prev, used_in_products: e.target.value.split(",") }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.part_id) {
        await api.updatePart(formData.part_id, formData);
      } else {
        await api.createPart(formData);
      }
      onSaved();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      {[
        ["part_number", "Part Number"],
        ["part_name", "Part Name"],
        ["category", "Category"],
        ["description", "Description"],
        ["uom", "Unit of Measure"],
        ["quantity_on_hand", "Quantity On Hand"],
        ["minimum_stock_level", "Minimum Stock Level"],
        ["unit_price", "Unit Price"],
        ["supplier_name", "Supplier Name"],
        ["supplier_part_number", "Supplier Part Number"],
        ["location", "Location"],
        ["status", "Status"],
        ["used_in_products", "Used in Products (comma-separated)"],
        ["part_image_url", "Image URL"],
        ["lead_time_days", "Lead Time (days)"],
        ["weight_kg", "Weight (kg)"],
        ["material", "Material"],
        ["machine_compatibility", "Machine Compatibility"],
        ["last_order_date", "Last Order Date"],
        ["remarks", "Remarks"],
      ].map(([name, label]) => (
        <div key={name} className="flex flex-col">
          {name === "description" || name === "remarks" ? (
            <textarea
              name={name}
              placeholder={label}
              className="border p-2 rounded h-20"
              value={formData[name] || ""}
              onChange={handleChange}
            />
          ) : name === "used_in_products" ? (
            <input
              type="text"
              name={name}
              placeholder={label}
              className="border p-2 rounded"
              value={formData[name].join(",")}
              onChange={handleArrayChange}
            />
          ) : name === "last_order_date" ? (
            <input
              type="date"
              name={name}
              placeholder={label}
              className="border p-2 rounded"
              value={formData[name] ? formData[name].slice(0, 10) : ""}
              onChange={handleChange}
            />
          ) : (
            <input
              type={["unit_price","weight_kg","quantity_on_hand","minimum_stock_level","lead_time_days"].includes(name) ? "number" : "text"}
              name={name}
              placeholder={label}
              className="border p-2 rounded"
              value={formData[name] || ""}
              onChange={handleChange}
            />
          )}
        </div>
      ))}

      <div className="col-span-2 flex justify-end gap-4 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-psr-accent text-white rounded hover:bg-psr-accent/80"
        >
          {formData.part_id ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}
