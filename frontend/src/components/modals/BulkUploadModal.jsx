import React, { useState } from "react";
import * as XLSX from "xlsx";
import api from "../../utils/api";

const REQUIRED_COLUMNS = ["part_number", "part_name"];

function parseCSVorExcel(file, callback, onError) {
  const reader = new FileReader();

  if (file.name.toLowerCase().endsWith(".xlsx")) {
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        callback(json);
      } catch (err) {
        onError(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // CSV handler
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const obj = {};
        header.forEach((h, i) => {
          obj[h] = cols[i] !== undefined ? cols[i] : "";
        });
        return obj;
      });
      callback(rows);
    } catch (err) {
      onError(`Error parsing CSV: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

export default function BulkUploadModal({ onClose, onComplete }) {
  const [fileName, setFileName] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);

  /** Handle file select */
  const handleFile = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setPreviewRows([]);
    setUploadSummary(null);

    parseCSVorExcel(
      file,
      (rows) => {
        if (!rows || rows.length === 0) {
          setErrors(["File is empty or unreadable."]);
          return;
        }

        const headerSet = new Set(Object.keys(rows[0]));
        const missing = REQUIRED_COLUMNS.filter((col) => !headerSet.has(col));
        if (missing.length > 0) {
          setErrors([`Missing required columns: ${missing.join(", ")}`]);
          return;
        }

        const DISALLOWED = ["vendor_name", "vendor", "supplier_name", "supplier"];
        const normalized = rows.map((r) => {
          const obj = {};
          for (const [k, v] of Object.entries(r)) {
            if (!DISALLOWED.includes(k)) obj[k] = v;
          }

          return {
            ...obj,
            quantity_on_hand: r.quantity_on_hand ? Number(r.quantity_on_hand) : 0,
            minimum_stock_level: r.minimum_stock_level
              ? Number(r.minimum_stock_level)
              : 0,
            current_unit_price: r.current_unit_price
              ? Number(r.current_unit_price)
              : 0,
            lead_time_days: r.lead_time_days ? Number(r.lead_time_days) : null,
            weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
            last_order_date: r.last_order_date || null,
            machine_name: r.machine_name || "",
            status: r.status || "Active",
          };
        });

        setPreviewRows(normalized);
      },
      (err) => setErrors([err])
    );
  };

  /** Handle upload */
  const handleUpload = async () => {
    if (previewRows.length === 0) {
      setErrors(["No valid rows to upload."]);
      return;
    }

    setUploading(true);
    setErrors([]);
    setUploadSummary(null);

    try {
      const result = await api.bulkUploadParts(previewRows);

      if (result && result.success === 1) {
        // ✅ unified message comes from backend
        setUploadSummary(result.message || "✅ Bulk upload completed successfully!");
        onComplete && onComplete(); // refresh dashboard data but do NOT close modal
      } else {
        setErrors([result?.message || "Bulk upload failed."]);
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setErrors([err.response?.data?.message || err.message]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">
            Bulk Upload Parts
          </h3>
          <p className="text-xs text-gray-500">
            Upload CSV or Excel (.xlsx). We’ll skip duplicates automatically.
          </p>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <input
          type="file"
          accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFile}
          className="block text-sm"
        />
        {fileName && (
          <div className="text-sm text-gray-600 mt-2">
            Loaded: <span className="font-medium">{fileName}</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Required: <strong>part_number, part_name</strong>. <br />
          Optional: category, description, current_unit_price, machine_name,
          weight_kg, etc.
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="text-red-700 bg-red-50 border border-red-200 text-sm px-3 py-2 rounded">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="text-sm px-3 py-2 rounded border bg-green-50 border-green-200 text-green-700 whitespace-pre-line">
          {uploadSummary}
        </div>
      )}

      {/* Preview */}
      <div className="overflow-auto max-h-60 border rounded">
        {previewRows.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No preview
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {Object.keys(previewRows[0]).map((k) => (
                  <th key={k} className="px-2 py-1 border text-left">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {Object.values(row).map((v, j) => (
                    <td
                      key={j}
                      className="px-2 py-1 border align-top whitespace-pre-wrap break-all"
                    >
                      {String(v ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={onClose}
          className="px-3 py-2 border rounded text-sm hover:bg-gray-100"
        >
          Close
        </button>

        <button
          onClick={handleUpload}
          disabled={uploading || previewRows.length === 0}
          className={`px-4 py-2 rounded text-white text-sm font-medium ${
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
