import { useState } from "react";
import axios from "axios";

export default function ProductForm({ existingProduct, onSave }) {
  const [formData, setFormData] = useState({
    machine_id: existingProduct?.machine_id || "",
    name: existingProduct?.name || "",
    description: existingProduct?.description || "",
    category: existingProduct?.category || "",
    status: existingProduct?.status || "Active",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (existingProduct) {
        await axios.put(`/api/products/${existingProduct.machine_id}`, formData);
      } else {
        await axios.post("/api/products", formData);
      }
      alert("Product saved!");
      onSave();
    } catch (err) {
      console.error(err);
      alert("Failed to save product.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="machine_id" placeholder="Machine ID" value={formData.machine_id} onChange={handleChange} required />
      <input name="name" placeholder="Machine Name" value={formData.name} onChange={handleChange} required />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
      <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
      <select name="status" value={formData.status} onChange={handleChange}>
        <option>Active</option>
        <option>Inactive</option>
      </select>
      <button type="submit">Save Product</button>
    </form>
  );
}
