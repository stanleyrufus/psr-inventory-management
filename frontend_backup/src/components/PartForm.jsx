import { useState } from "react";
import axios from "axios";

export default function PartForm({ existingPart, onSave }) {
  const [formData, setFormData] = useState({
    part_number: existingPart?.part_number || "",
    part_name: existingPart?.part_name || "",
    category: existingPart?.category || "",
    description: existingPart?.description || "",
    uom: existingPart?.uom || "",
    quantity_on_hand: existingPart?.quantity_on_hand || 0,
    minimum_stock_level: existingPart?.minimum_stock_level || 0,
    location: existingPart?.location || "",
    status: existingPart?.status || "Active",
    supplier_name: existingPart?.supplier_name || "",
    remarks: existingPart?.remarks || "",
    lead_time_days: existingPart?.lead_time_days || 0,
    weight_kg: existingPart?.weight_kg || 0,
    material: existingPart?.material || "",
    machine_compatibility: existingPart?.machine_compatibility || ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (existingPart) {
        await axios.put(`/api/inventory/${existingPart.part_id}`, formData);
      } else {
        await axios.post("/api/inventory", formData);
      }
      alert("Part saved!");
      onSave();
    } catch (err) {
      console.error(err);
      alert("Failed to save part");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="part_number" placeholder="Part Number" value={formData.part_number} onChange={handleChange} required />
      <input name="part_name" placeholder="Part Name" value={formData.part_name} onChange={handleChange} required />
      <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
      <input name="uom" placeholder="UOM" value={formData.uom} onChange={handleChange} />
      <input name="quantity_on_hand" type="number" placeholder="Quantity" value={formData.quantity_on_hand} onChange={handleChange} />
      <input name="minimum_stock_level" type="number" placeholder="Min Stock Level" value={formData.minimum_stock_level} onChange={handleChange} />
      <input name="location" placeholder="Location" value={formData.location} onChange={handleChange} />
      <select name="status" value={formData.status} onChange={handleChange}>
        <option>Active</option>
        <option>Inactive</option>
      </select>
      <input name="supplier_name" placeholder="Supplier Name" value={formData.supplier_name} onChange={handleChange} />
      <textarea name="remarks" placeholder="Remarks" value={formData.remarks} onChange={handleChange} />
      <button type="submit">Save Part</button>
    </form>
  );
}
