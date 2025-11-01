import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchVendors, updateVendor } from "../../utils/api";

export default function VendorEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const allVendors = await fetchVendors();
      const found = allVendors.find((v) => String(v.vendor_id) === id);
      if (!found) {
        setMessage("⚠️ Vendor not found.");
        setVendor(null);
      } else {
        setVendor(found);
      }
    } catch (err) {
      console.error("❌ Error loading vendor:", err);
      setMessage("❌ Failed to load vendor.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVendor((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value === ""
          ? null
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateVendor(id, vendor);
      if (res.success) {
        setMessage("✅ Vendor updated successfully.");
        setTimeout(() => navigate("/vendors"), 1500);
      } else {
        setMessage(res.message || "⚠️ Failed to update vendor.");
      }
    } catch (err) {
      console.error("❌ Error updating vendor:", err);
      setMessage("❌ Error updating vendor.");
    }
  };

  if (loading) return <p className="text-gray-600">Loading vendor...</p>;
  if (!vendor) return <p className="text-gray-600">{message || "Vendor not found."}</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-xl font-semibold text-gray-800">Edit Vendor</h2>
        <button
          onClick={() => navigate("/vendors")}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕ Close
        </button>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md relative">
          {message}
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"
            onClick={() => setMessage("")}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block font-medium text-gray-700">Vendor Name *</label>
          <input
            type="text"
            name="vendor_name"
            value={vendor.vendor_name || ""}
            onChange={handleChange}
            required
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Contact Name</label>
          <input
            type="text"
            name="contact_name"
            value={vendor.contact_name || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Phone</label>
          <input
            type="text"
            name="phone"
            value={vendor.phone || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={vendor.email || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">City</label>
          <input
            type="text"
            name="city"
            value={vendor.city || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">State</label>
          <input
            type="text"
            name="state"
            value={vendor.state || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Country</label>
          <input
            type="text"
            name="country"
            value={vendor.country || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            name="postal_code"
            value={vendor.postal_code || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div className="col-span-2">
          <label className="block font-medium text-gray-700">Remarks</label>
          <textarea
            name="remarks"
            value={vendor.remarks || ""}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-md p-2"
          ></textarea>
        </div>

        <div className="col-span-2 flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            name="isactive"
            checked={vendor.isactive || false}
            onChange={handleChange}
          />
          <label className="text-gray-700">Active</label>
        </div>

        <div className="col-span-2 flex justify-end space-x-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/vendors")}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-psr-primary hover:bg-psr-primary-dark text-white px-4 py-2 rounded-md"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
