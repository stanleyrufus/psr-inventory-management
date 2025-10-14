import React, { useState, useEffect } from "react";
import api from "../../utils/api";

export default function ProductForm({ initial = {}, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    product_name: "",
    product_code: "",
    description: "",
    category: "",
    model_number: "",
    dimensions: "",
    weight_kg: "",
    price: "",
    status: "Active",
  });

  useEffect(() => {
    if (initial && Object.keys(initial).length > 0) {
      setFormData({
        product_name: initial.product_name || "",
        product_code: initial.product_code || "",
        description: initial.description || "",
        category: initial.category || "",
        model_number: initial.model_number || "",
        dimensions: initial.dimensions || "",
        weight_kg: initial.weight_kg || "",
        price: initial.price || "",
        status: initial.status || "Active",
      });
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (initial.product_id) {
        await api.updateProduct(initial.product_id, formData);
      } else {
        await api.createProduct(formData);
      }
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Failed to save product");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          name="product_name"
          placeholder="Name"
          className="border p-2 rounded"
          value={formData.product_name}
          onChange={handleChange}
          required
        />
        <input
          name="product_code"
          placeholder="SKU"
          className="border p-2 rounded"
          value={formData.product_code}
          onChange={handleChange}
          required
        />
        <input
          name="category"
          placeholder="Category"
          className="border p-2 rounded"
          value={formData.category}
          onChange={handleChange}
        />
        <input
          name="model_number"
          placeholder="Model"
          className="border p-2 rounded"
          value={formData.model_number}
          onChange={handleChange}
        />
        <input
          name="dimensions"
          placeholder="Dimensions"
          className="border p-2 rounded"
          value={formData.dimensions}
          onChange={handleChange}
        />
        <input
          name="weight_kg"
          type="number"
          step="0.01"
          placeholder="Weight (kg)"
          className="border p-2 rounded"
          value={formData.weight_kg}
          onChange={handleChange}
        />
        <input
          name="price"
          type="number"
          step="0.01"
          placeholder="Price"
          className="border p-2 rounded"
          value={formData.price}
          onChange={handleChange}
        />
        <select
          name="status"
          className="border p-2 rounded"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <textarea
        name="description"
        placeholder="Description"
        className="border p-2 rounded w-full"
        value={formData.description}
        onChange={handleChange}
      />

      {/* Display system fields (Created At / Updated At) if editing */}
      {initial.product_id && (
        <div className="text-sm text-gray-500 space-y-1">
          <div>Created At: {initial.created_at}</div>
          <div>Updated At: {initial.updated_at}</div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-psr-primary text-white hover:bg-blue-700"
        >
          {initial.product_id ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
