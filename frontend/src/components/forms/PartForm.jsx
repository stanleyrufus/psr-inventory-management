// frontend/src/components/forms/PartForm.jsx
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

import React, { useState, useEffect } from "react";
import api, { apiRaw } from "../../utils/api";

export default function PartForm({ initial = {}, onSaved, onCancel }) {
  const safeInitial = initial || {};

  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState({
    part_number: "",
    part_name: safeInitial.part_name || "", // 👉 REMOVED from UI but kept for backend
    category: "",
    description: "",
    quantity_on_hand: "",
    minimum_stock_level: "",
    current_unit_price: "",
    supplier_name: "",
    location: "",
    status: "Active",
    lead_time_days: "",
    material: "",
    last_po_date: "",
    remarks: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(safeInitial.image_url || null);
  const [errors, setErrors] = useState({});

  // ----------------------------
  // Load Vendors
  // ----------------------------
  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await apiRaw.get("/vendors");
        setVendors(res.data || []);
      } catch (err) {
        console.error("Vendor load error:", err);
      }
    }
    loadVendors();
  }, []);

  // ----------------------------------------------------
  // Load initial data into form
  // ----------------------------------------------------
  useEffect(() => {
    if (safeInitial && Object.keys(safeInitial).length > 0) {
      setFormData((prev) => ({
        ...prev,
        part_number: safeInitial.part_number ?? prev.part_number,
        part_name: safeInitial.part_name ?? prev.part_name,
        category: safeInitial.category ?? prev.category,
        description: safeInitial.description ?? prev.description,
        quantity_on_hand: safeInitial.quantity_on_hand ?? prev.quantity_on_hand,
        minimum_stock_level:
          safeInitial.minimum_stock_level ?? prev.minimum_stock_level,
        current_unit_price:
          safeInitial.current_unit_price ?? prev.current_unit_price,
        supplier_name: safeInitial.supplier_name ?? prev.supplier_name,
        location: safeInitial.location ?? prev.location,
        status: safeInitial.status ?? prev.status,
        lead_time_days: safeInitial.lead_time_days ?? prev.lead_time_days,
        material: safeInitial.material ?? prev.material,
        last_po_date: safeInitial.last_po_date ?? prev.last_po_date,
        remarks: safeInitial.remarks ?? prev.remarks,
      }));

      const img = safeInitial.image_url;
      if (img) {
        const base = BASE.replace(/\/$/, "");
        const normalized = img.startsWith("/")
          ? `${base}${img}`
          : `${base}/${img}`;
        setPreviewUrl(normalized);
      } else {
        setPreviewUrl(null);
      }
    }
  }, [safeInitial]);

  // ----------------------------------------------------
  // Preview image
  // ----------------------------------------------------
  useEffect(() => {
    if (imageFile) setPreviewUrl(URL.createObjectURL(imageFile));
  }, [imageFile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ----------------------------------------------------
  // Submit handler
  // ----------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.part_number.trim()) newErrors.part_number = "Required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      alert("⚠️ Please fill all required fields.");
      return;
    }

    try {
      const cleanData = { ...formData };

      const numericFields = [
        "quantity_on_hand",
        "minimum_stock_level",
        "current_unit_price",
        "lead_time_days",
      ];

      numericFields.forEach((key) => {
        if (cleanData[key] === "" || cleanData[key] === undefined) {
          cleanData[key] = null;
        } else {
          cleanData[key] = Number(cleanData[key]);
        }
      });

      let res;

      if (imageFile) {
        const fd = new FormData();
        Object.entries(cleanData).forEach(([key, value]) =>
          fd.append(key, value ?? "")
        );
        fd.append("image", imageFile);

        if (safeInitial?.part_id) {
          res = await apiRaw.put(`/parts/${safeInitial.part_id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          res = await apiRaw.post(`/parts`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      } else {
        const payload = { ...cleanData };
        delete payload.unit_price;

        if (safeInitial?.part_id) {
          res = await api.updatePart(safeInitial.part_id, payload);
        } else {
          res = await api.createPart(payload);
        }
      }

      alert("✅ Part saved successfully!");
      onSaved && onSaved();
    } catch (err) {
      console.error("❌ Error saving part:", err);

      const rawMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "";

      // -------------------------
      // DUPLICATE HANDLING
      // -------------------------
      if (
        rawMsg.toLowerCase().includes("duplicate") ||
        rawMsg.toLowerCase().includes("unique") ||
        rawMsg.toLowerCase().includes("violates")
      ) {
        alert("❌ Part number already exists.");
        return;
      }

      alert(`❌ ${rawMsg}`);
    }
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 relative overflow-y-auto max-h-[80vh] p-2"
    >
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✖
      </button>

      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        {safeInitial?.part_id ? "Edit Part" : "Add New Part"}
      </h2>

      {/* Image Upload */}
      <div className="flex flex-col mb-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Part Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="border p-2 rounded"
        />

        {previewUrl && (
          <img
            src={previewUrl}
            alt="preview"
            className="mt-2 w-24 h-24 object-cover rounded border"
          />
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-3">

        {/* Part Number */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Part Number <span className="text-red-500">*</span>
          </span>
          <input
            name="part_number"
            value={formData.part_number}
            onChange={handleChange}
            className={`border p-2 rounded ${
              errors.part_number ? "border-red-500" : ""
            }`}
            required
          />
        </label>

        {/* Category Dropdown */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Category
          </span>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            <option value="">Select Category</option>
            <option value="Electrical">Electrical</option>
            <option value="Mechanical">Mechanical</option>
          </select>
        </label>

        {/* Supplier Dropdown */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Supplier (Vendor)
          </span>
          <select
            name="supplier_name"
            value={formData.supplier_name}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            <option value="">Select Vendor</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_name}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </label>

        {/* Quantity */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Quantity on Hand</span>
          <input
            name="quantity_on_hand"
            type="number"
            value={formData.quantity_on_hand}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Minimum Stock */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</span>
          <input
            name="minimum_stock_level"
            type="number"
            value={formData.minimum_stock_level}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Price */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Unit Price</span>
          <input
            name="current_unit_price"
            type="number"
            step="0.01"
            value={formData.current_unit_price}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Location */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Location</span>
          <input
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Lead Time */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Lead Time (days)</span>
          <input
            name="lead_time_days"
            type="number"
            value={formData.lead_time_days}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Material */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Material</span>
          <input
            name="material"
            value={formData.material}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Last PO */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Last PO Date</span>
          <input
            name="last_po_date"
            type="date"
            value={formData.last_po_date}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </label>

        {/* Status */}
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Status</span>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>
      </div>

      {/* Description */}
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700 mb-1">Description</span>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </label>

      {/* Remarks */}
      <label className="flex flex-col">
        <span className="text-sm font-medium text-gray-700 mb-1">Remarks</span>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </label>

      {/* Buttons */}
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
          {safeInitial?.part_id ? "Update" : "Add Part"}
        </button>
      </div>
    </form>
  );
}
