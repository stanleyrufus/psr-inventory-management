// src/pages/vendors/VendorListPage.jsx
import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import VendorForm from "../../components/VendorForm";
import VendorDetail from "../../components/VendorDetail";
import VendorBulkUploadModal from "../../components/modals/VendorBulkUploadModal";

export default function VendorListPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/vendors");
      setVendors(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching vendors:", err);
      alert("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleDelete = async (vendor_id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await api.delete(`/vendors/${vendor_id}`);
      fetchVendors();
    } catch (err) {
      console.error("❌ Error deleting vendor:", err);
      alert("Failed to delete vendor");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Vendors</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Bulk Upload
          </button>
          <button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(true);
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No vendors found.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Vendor Name</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">City</th>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr
                  key={v.vendor_id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {v.vendor_name}
                  </td>
                  <td className="px-3 py-2">{v.contact_name || "—"}</td>
                  <td className="px-3 py-2">{v.phone || "—"}</td>
                  <td className="px-3 py-2">{v.email || "—"}</td>
                  <td className="px-3 py-2">{v.city || "—"}</td>
                  <td className="px-3 py-2">{v.country || "—"}</td>
                  <td className="px-3 py-2">
                    {v.isactive ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedVendor(v);
                          setShowDetail(true);
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingVendor(v);
                          setShowForm(true);
                        }}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.vendor_id)}
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <VendorForm
              initial={editingVendor}
              onSaved={() => {
                setShowForm(false);
                fetchVendors();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {showDetail && (
        <VendorDetail
          vendor={selectedVendor}
          onClose={() => setShowDetail(false)}
        />
      )}

      {showBulkUpload && (
        <VendorBulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onComplete={() => {
            setShowBulkUpload(false);
            fetchVendors();
          }}
        />
      )}
    </div>
  );
}
