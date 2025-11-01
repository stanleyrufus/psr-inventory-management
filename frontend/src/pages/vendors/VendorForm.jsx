import React, { useState, useEffect, useRef } from "react";
import api from "../../utils/api";

export default function VendorForm({ initial = {}, onCancel, onSaved }) {
  const safeInitial = initial || {};
  const topRef = useRef(null);

  const [formData, setFormData] = useState({
    vendor_name: "",
    contact_name: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    website: "",
    remarks: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false); // ✅ for animation control

  // ✅ preload existing vendor for edit
  useEffect(() => {
    if (safeInitial && Object.keys(safeInitial).length > 0) {
      setFormData((prev) => ({
        ...prev,
        vendor_name: safeInitial.vendor_name ?? prev.vendor_name,
        contact_name: safeInitial.contact_name ?? prev.contact_name,
        phone: safeInitial.phone ?? prev.phone,
        email: safeInitial.email ?? prev.email,
        address1: safeInitial.address1 ?? prev.address1,
        address2: safeInitial.address2 ?? prev.address2,
        city: safeInitial.city ?? prev.city,
        state: safeInitial.state ?? prev.state,
        country: safeInitial.country ?? prev.country,
        postal_code: safeInitial.postal_code ?? prev.postal_code,
        website: safeInitial.website ?? prev.website,
        remarks: safeInitial.remarks ?? prev.remarks,
        is_active:
          safeInitial.is_active !== undefined ? safeInitial.is_active : true,
      }));
    }
  }, [safeInitial]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage("");
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.vendor_name.trim()) newErrors.vendor_name = "Required";
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Invalid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollTop = () => {
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setMessage("⚠️ Please fix the highlighted fields.");
      scrollTop();
      return;
    }

    try {
      let res;
      if (safeInitial && safeInitial.vendor_id) {
        res = await api.updateVendor(safeInitial.vendor_id, formData);
      } else {
        res = await api.createVendor(formData);
      }

      if (res.success === 1) {
        setMessage(res.message || "✅ Vendor saved successfully.");
        setIsSubmitted(true);
        setFadeOut(false);

        // ✅ trigger fade-out after 3 seconds only for success messages
        setTimeout(() => setFadeOut(true), 3000);
      } else {
        setMessage(res.message || "⚠️ Vendor already exists or not saved.");
        setFadeOut(false);
      }
      scrollTop();
    } catch (err) {
      console.error("❌ Error saving vendor:", err);
      setMessage(
        err.response?.data?.message ||
          "❌ Error saving vendor. Please try again."
      );
      setFadeOut(false);
      scrollTop();
    }
  };

  // ✅ manual close triggers refresh + modal close
  const handleClose = () => {
    if (typeof onSaved === "function") onSaved();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-white p-4 rounded-lg shadow-md max-h-[80vh] overflow-y-auto relative"
    >
      {/* top-right close icon */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✖
      </button>

      <div ref={topRef} />

      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        {safeInitial.vendor_id ? "Edit Vendor" : "Add New Vendor"}
      </h2>

      {message && (
        <div
          className={`p-2 text-sm rounded transition-opacity duration-1000 ${
            fadeOut ? "opacity-0" : "opacity-100"
          } ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-700 border border-green-300"
              : message.startsWith("⚠️")
              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Vendor Name <span className="text-red-500">*</span>
          </span>
          <input
            name="vendor_name"
            value={formData.vendor_name}
            onChange={handleChange}
            placeholder="Vendor Name"
            className={`border p-2 rounded ${
              errors.vendor_name ? "border-red-500 animate-pulse" : ""
            }`}
          />
          {errors.vendor_name && (
            <span className="text-xs text-red-500">{errors.vendor_name}</span>
          )}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </span>
          <input
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            placeholder="Contact Person"
            className="border p-2 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Phone</span>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            className="border p-2 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 mb-1">Email</span>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address"
            className={`border p-2 rounded ${
              errors.email ? "border-red-500 animate-pulse" : ""
            }`}
          />
          {errors.email && (
            <span className="text-xs text-red-500">{errors.email}</span>
          )}
        </label>

        <input
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="City"
          className="border p-2 rounded"
        />
        <input
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="State"
          className="border p-2 rounded"
        />
        <input
          name="country"
          value={formData.country}
          onChange={handleChange}
          placeholder="Country"
          className="border p-2 rounded"
        />
        <input
          name="postal_code"
          value={formData.postal_code}
          onChange={handleChange}
          placeholder="Postal Code"
          className="border p-2 rounded"
        />

        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>

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
          onClick={handleClose}
          className="px-4 py-2 rounded border hover:bg-gray-100"
        >
          Close
        </button>

        {!isSubmitted && (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {safeInitial.vendor_id ? "Update" : "Add Vendor"}
          </button>
        )}
      </div>
    </form>
  );
}
