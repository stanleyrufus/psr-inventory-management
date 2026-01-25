// src/pages/purchaseOrders/PoImportFromPdfPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PoImportFromPdfPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError("Please select at least one PDF.");
      return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      setUploading(true);
      setError("");
      setResult(null);

const res = await axios.post(
  `${BASE}/api/purchase_orders/import-from-pdf`,
  formData,
  {
    headers: { "Content-Type": "multipart/form-data" },
  }
);


      setResult(res.data);
    } catch (err) {
      console.error("❌ PDF import failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to import POs from PDF.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Import Purchase Orders from PDF
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload one or more PO acknowledgement PDFs. We'll create Draft POs
            that you can review and edit using the normal PO form.
          </p>
        </div>

        <button
          className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          onClick={() => navigate("/purchase-orders")}
        >
          Back to PO List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border rounded p-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            PDF Files
          </label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            You can select multiple PDFs. Each valid file will create one Draft
            PO.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading || !files.length}
            className={`px-4 py-2 rounded text-sm text-white ${
              uploading || !files.length
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {uploading ? "Importing..." : "Import from PDF"}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="border rounded p-3 bg-gray-50 text-sm space-y-2">
          <div className="font-semibold text-gray-800 mb-1">
            Import Result
          </div>

          {result.created?.length ? (
            <div>
              <div className="mb-1">
                ✅ Created {result.created.length} PO
                {result.created.length > 1 ? "s" : ""}:
              </div>
              <ul className="list-disc list-inside space-y-1">
                {result.created.map((c) => (
                  <li key={c.po_id}>
                    <span className="font-medium">
                      {c.psr_po_number || "(no PO #)"}{" "}
                    </span>
                    from <span>{c.filename}</span>{" "}
                    <button
                      type="button"
                      className="text-blue-700 hover:underline ml-2"
                      onClick={() =>
                        navigate(`/purchase-orders/edit/${c.po_id}`)
                      }
                    >
                      Edit PO
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>No POs were created.</div>
          )}

          {result.errors?.length ? (
            <div className="mt-2">
              <div className="font-semibold text-red-700">
                Some files failed:
              </div>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {result.errors.map((e, idx) => (
                  <li key={idx}>
                    {e.filename}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
