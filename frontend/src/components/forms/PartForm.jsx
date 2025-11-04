import React, { useState, useEffect } from "react";
import api from "../../utils/api";

export default function PartForm({ initial = {}, onSaved, onCancel }) {
  const safeInitial = initial || {};
  const [formData, setFormData] = useState({
    part_number: "",
    part_name: "",
    category: "",
    description: "",
    uom: "",
    quantity_on_hand: "",
    minimum_stock_level: "",
    current_unit_price: "",
    supplier_name: "",
    location: "",
    status: "Active",
    lead_time_days: "",
    weight_kg: "",
    material: "",
    last_po_date: "",
    remarks: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (safeInitial && Object.keys(safeInitial).length > 0) {
      setFormData((prev) => ({
        ...prev,
        part_number: safeInitial.part_number ?? prev.part_number,
        part_name: safeInitial.part_name ?? prev.part_name,
        category: safeInitial.category ?? prev.category,
        description: safeInitial.description ?? prev.description,
        uom: safeInitial.uom ?? prev.uom,
        quantity_on_hand: safeInitial.quantity_on_hand ?? prev.quantity_on_hand,
        minimum_stock_level:
          safeInitial.minimum_stock_level ?? prev.minimum_stock_level,
        current_unit_price:
          safeInitial.current_unit_price ?? prev.current_unit_price,
        supplier_name: safeInitial.supplier_name ?? prev.supplier_name,
        location: safeInitial.location ?? prev.location,
        status: safeInitial.status ?? prev.status,
        lead_time_days: safeInitial.lead_time_days ?? prev.lead_time_days,
        weight_kg: safeInitial.weight_kg ?? prev.weight_kg,
        material: safeInitial.material ?? prev.material,
        last_po_date: safeInitial.last_po_date ?? prev.last_po_date,
        remarks: safeInitial.remarks ?? prev.remarks,
      }));
    }
  }, [safeInitial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.part_number.trim()) newErrors.part_number = "Required";
    if (!formData.part_name.trim()) newErrors.part_name = "Required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      alert("⚠️ Please fill all required fields.");
      return;
    }

    try {
      const payload = { ...formData };
      delete payload.unit_price;

      if (safeInitial && (safeInitial.part_id || safeInitial.id)) {
        const id = safeInitial.part_id ?? safeInitial.id;
        await api.updatePart(id, payload);
      } else {
        await api.createPart(payload);
      }

      alert("✅ Part saved successfully!");
      onSaved && onSaved();
    } catch (err) {
      console.error("❌ Error saving part:", err);
      alert(`Failed to save part: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 relative">
      {/* ✅ Added close (X) button */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✖
      </button>

      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        {safeInitial && (safeInitial.part_id || safeInitial.id)
          ? "Edit Part"
          : "Add New Part"}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Part Number <span className="text-red-500">*</span>
          </span>
          <input
            required
            name="part_number"
            value={formData.part_number}
            onChange={handleChange}
            className={`border p-2 rounded ${
              errors.part_number ? "border-red-500 animate-pulse" : ""
            }`}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Part Name <span className="text-red-500">*</span>
          </span>
          <input
            required
            name="part_name"
            value={formData.part_name}
            onChange={handleChange}
            className={`border p-2 rounded ${
              errors.part_name ? "border-red-500 animate-pulse" : ""
            }`}
          />
        </label>

        <input
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="Category"
          className="border p-2 rounded"
        />
        <input
          name="uom"
          value={formData.uom}
          onChange={handleChange}
          placeholder="UOM"
          className="border p-2 rounded"
        />
        <input
          name="quantity_on_hand"
          type="number"
          value={formData.quantity_on_hand}
          onChange={handleChange}
          placeholder="Quantity on Hand"
          className="border p-2 rounded"
        />
        <input
          name="minimum_stock_level"
          type="number"
          value={formData.minimum_stock_level}
          onChange={handleChange}
          placeholder="Minimum Stock"
          className="border p-2 rounded"
        />
        <input
          name="current_unit_price"
          type="number"
          step="0.01"
          value={formData.current_unit_price}
          onChange={handleChange}
          placeholder="Unit Price"
          className="border p-2 rounded"
        />
        <input
          name="supplier_name"
          value={formData.supplier_name}
          onChange={handleChange}
          placeholder="Supplier Name"
          className="border p-2 rounded"
        />
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Location"
          className="border p-2 rounded"
        />
        <input
          name="lead_time_days"
          type="number"
          value={formData.lead_time_days}
          onChange={handleChange}
          placeholder="Lead Time (days)"
          className="border p-2 rounded"
        />
        <input
          name="weight_kg"
          type="number"
          step="0.01"
          value={formData.weight_kg}
          onChange={handleChange}
          placeholder="Weight (kg)"
          className="border p-2 rounded"
        />
        <input
          name="material"
          value={formData.material}
          onChange={handleChange}
          placeholder="Material"
          className="border p-2 rounded"
        />
        <input
          name="last_po_date"
          type="date"
          value={formData.last_po_date}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Description"
        className="border p-2 rounded w-full"
      />
      <textarea
        name="remarks"
        value={formData.remarks}
        onChange={handleChange}
        placeholder="Remarks"
        className="border p-2 rounded w-full"
      />

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          {safeInitial && (safeInitial.part_id || safeInitial.id)
            ? "Update"
            : "Add Part"}
        </button>
      </div>
    </form>
  );
}
