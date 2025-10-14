// src/components/InventoryForm.jsx
import React, { useState } from "react";

const initialForm = {
  "Product Id": "",
  "Quantity": "",
  "Item ID": "",
  "Description": "",
  "Width": "",
  "Length": "",
  "Weight": "",
  "Price": "",
  "UM": "",
  "Extension": "",
  "Tax": ""
};

export default function InventoryForm({ onAdd }) {
  const [form, setForm] = useState(initialForm);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // basic required check: Product Id and Item ID (you can change)
    if (!form["Product Id"] || !form["Item ID"]) {
      alert("Please fill Product Id and Item ID.");
      return;
    }
    onAdd({ ...form });
    setForm(initialForm);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded bg-white">
      <h3 className="font-semibold mb-2">Add New Part (Manual)</h3>

      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Product Id"
          value={form["Product Id"]}
          onChange={(e) => handleChange("Product Id", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Quantity"
          type="number"
          value={form["Quantity"]}
          onChange={(e) => handleChange("Quantity", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Item ID"
          value={form["Item ID"]}
          onChange={(e) => handleChange("Item ID", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Description"
          value={form["Description"]}
          onChange={(e) => handleChange("Description", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Width"
          value={form["Width"]}
          onChange={(e) => handleChange("Width", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Length"
          value={form["Length"]}
          onChange={(e) => handleChange("Length", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Weight"
          value={form["Weight"]}
          onChange={(e) => handleChange("Weight", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Price"
          value={form["Price"]}
          onChange={(e) => handleChange("Price", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="UM"
          value={form["UM"]}
          onChange={(e) => handleChange("UM", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Extension"
          value={form["Extension"]}
          onChange={(e) => handleChange("Extension", e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          placeholder="Tax"
          value={form["Tax"]}
          onChange={(e) => handleChange("Tax", e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="mt-3">
        <button type="submit" className="bg-psr-primary text-white px-4 py-2 rounded">
          Add Part
        </button>
      </div>
    </form>
  );
}
