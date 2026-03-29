// src/pages/purchaseOrders/PoImportFromPdfPage.jsx
import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const bytesToSize = (bytes = 0) => {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export default function PoImportFromPdfPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canImport = files.length > 0 && !uploading;

  const createdCount = result?.created?.length || 0;
  const failedCount = result?.errors?.length || 0;

  const fileNamesKey = useMemo(
    () => files.map((f) => `${f.name}-${f.size}-${f.lastModified}`).join("|"),
    [files]
  );

  const resetAll = () => {
    setFiles([]);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (incoming) => {
    const incomingArr = Array.from(incoming || []);
    if (!incomingArr.length) return;

    const next = [...files];
    const seen = new Set(next.map((f) => `${f.name}-${f.size}-${f.lastModified}`));

    for (const f of incomingArr) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      const isPdf =
        f.type === "application/pdf" || String(f.name).toLowerCase().endsWith(".pdf");
      if (!isPdf) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(f);
    }

    setFiles(next);
    setResult(null);
    setError("");
  };

  const handleFileChange = (e) => addFiles(e.target.files);

  const handleRemoveFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploading) return;
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => e.preventDefault();

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

      const res = await axios.post(`${BASE}/po_import/pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
    } catch (err) {
      console.error("❌ PDF import failed:", err);

      const data = err?.response?.data;

      // ✅ keep backend details so failed file reasons still render
      if (data && (data.errors || data.created)) {
        setResult(data);
      }

      const msg =
        data?.message ||
        data?.error ||
        "Failed to import POs from PDF.";

      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* =========================================================
          HEADER CARD (stronger frame + PSR style)
      ========================================================= */}
      <div className="bg-white rounded-xl shadow border-2 border-blue-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              Import Purchase Orders from PDF
            </h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Upload one or more PO acknowledgement PDFs. We’ll create{" "}
              <span className="font-semibold">Draft POs</span> you can review and edit using
              the normal PO form.
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow"
            onClick={() => navigate("/purchase-orders")}
            disabled={uploading}
            title="Back to PO List"
          >
            Back to PO List
          </button>
        </div>
      </div>

      {/* =========================================================
          MAIN CARD (stronger frame)
      ========================================================= */}
      <div className="bg-white rounded-xl shadow border-2 border-blue-200 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* =====================================================
              UPLOAD / DROPZONE SECTION (bright frame)
          ===================================================== */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
              Upload PDFs
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`rounded-xl border-2 border-dashed p-5 transition ${
                uploading
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-blue-400 hover:border-blue-500 bg-white"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">PDF Files</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Drag & drop PDFs here, or click{" "}
                    <span className="font-semibold text-blue-700">Browse</span>.
                    Each valid file creates one Draft PO.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    key={fileNamesKey}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />

                  {/* PSR Neutral Input button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`px-4 py-2 rounded shadow text-sm font-semibold ${
                      uploading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-300"
                    }`}
                  >
                    Browse
                  </button>

                  {/* PSR Secondary */}
                  <button
                    type="button"
                    onClick={resetAll}
                    disabled={uploading || (!files.length && !result && !error)}
                    className={`px-4 py-2 rounded shadow text-sm font-semibold ${
                      uploading || (!files.length && !result && !error)
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gray-300 hover:bg-gray-400 text-black"
                    }`}
                    title="Clear selection and results"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Selected Files ({files.length})
                  </div>

                  <div className="max-h-56 overflow-auto rounded-lg border-2 border-blue-200 bg-white">
                    {files.map((f, idx) => (
                      <div
                        key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 border-b border-blue-100 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">{f.name}</div>
                          <div className="text-xs text-gray-500">{bytesToSize(f.size)}</div>
                        </div>

                        {/* PSR destructive */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          disabled={uploading}
                          className={`text-xs px-3 py-1 rounded shadow font-semibold ${
                            uploading
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                          title="Remove file"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    Tip: If you accidentally selected a non-PDF, it will be ignored.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =====================================================
              ACTION BAR
          ===================================================== */}
          <div className="rounded-xl border-2 border-blue-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-600">
              Recommended: import 5–10 PDFs at a time for smoother review.
            </div>

            {/* PSR Primary */}
            <button
              type="submit"
              disabled={!canImport}
              className={`px-5 py-2 rounded shadow text-sm font-semibold text-white ${
                !canImport
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {uploading ? "Importing..." : "Import from PDF"}
            </button>
          </div>
        </form>

        {/* =====================================================
            ERROR MESSAGE (strong border)
        ===================================================== */}
        {error && (
          <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            RESULT (strong border + green frame)
        ===================================================== */}
        {result && (
          <div className="mt-5 rounded-xl border-2 border-green-300 bg-green-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                  Import Summary
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {createdCount > 0 ? `✅ Created ${createdCount}` : "No POs created"}
                  {failedCount > 0 ? ` • ❌ Failed ${failedCount}` : ""}
                </div>
              </div>

              {/* PSR Secondary */}
              <button
                type="button"
                onClick={resetAll}
                disabled={uploading}
                className={`px-4 py-2 rounded shadow text-sm font-semibold ${
                  uploading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-300 hover:bg-gray-400 text-black"
                }`}
              >
                Import More
              </button>
            </div>

            {/* Created */}
            {result.created?.length ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-800 mb-2">
                  Created POs
                </div>

                <div className="space-y-2">
                  {result.created.map((c) => (
                    <div
                      key={c.po_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border-2 border-green-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">
                          <span className="font-semibold">
                            {c.psr_po_number || "(no PO #)"}
                          </span>{" "}
                          <span className="text-gray-500">•</span>{" "}
                          <span className="text-gray-700">{c.filename}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Draft PO created — verify vendor, dates, and line items.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-semibold"
                        onClick={() => navigate(`/purchase-orders/edit/${c.po_id}`)}
                      >
                        Edit PO
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Errors */}
            {result.errors?.length ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-red-700 mb-2">
                  Failed Files
                </div>

                <div className="space-y-2">
                  {result.errors.map((e, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                      <div className="font-semibold">{e.filename}</div>
                      <div className="text-xs text-red-700 mt-1">{e.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        If a PDF imports incorrectly, open the created Draft PO and adjust line items before sending RFQ.
      </div>
    </div>
  );
}
