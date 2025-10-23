// frontend/src/components/forms/ProductForm.jsx
import React, { useState } from "react";
import api from "../../utils/api";

export default function ProductForm({ initial = {}, onSaved, onCancel }) {
  const [form, setForm] = useState({
    category: initial.category || "",
    subcategory: initial.subcategory || "",
    product_code: initial.product_code || "",
    product_name: initial.product_name || "",
    short_description: initial.short_description || "",
    full_description: initial.full_description || "",
    machine_type: initial.machine_type || "",
    frame_series: initial.frame_series || "",
    nozzle_count: initial.nozzle_count || "",
    status: initial.status || "Active",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!form.category || !form.product_name || !form.product_code || !form.status) {
        setError("All fields marked * are required.");
        setLoading(false);
        return;
      }

      let res;
      if (initial.id) {
        res = await api.updateProduct(initial.id, form);
      } else {
        res = await api.createProduct(form);
      }

      if (res?.success) {
        onSaved?.();
      } else {
        setError(res?.message || "Failed to save product");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? "Product code already exists — please use a unique value."
          : "Unexpected error occurred");
      setError(msg);
      console.error("Error saving product:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold mb-2">
        {initial.id ? "Edit Product" : "Add Product"}
      </h2>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Subcategory</label>
          <input
            name="subcategory"
            value={form.subcategory}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Product Code <span className="text-red-500">*</span>
          </label>
          <input
            name="product_code"
            value={form.product_code}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium">Short Description</label>
          <textarea
            name="short_description"
            value={form.short_description}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium">Full Description</label>
          <textarea
            name="full_description"
            value={form.full_description}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Machine Type</label>
          <input
            name="machine_type"
            value={form.machine_type}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Frame Series</label>
          <input
            name="frame_series"
            value={form.frame_series}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Nozzle Count</label>
          <input
            name="nozzle_count"
            value={form.nozzle_count}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-psr-accent text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}
