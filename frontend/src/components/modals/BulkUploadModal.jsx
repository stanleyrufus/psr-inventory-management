// frontend/src/components/modals/BulkUploadModal.jsx
import React, { useState } from "react";
import api from "../../utils/api";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { error: "Empty CSV" };
  const header = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cols[i] !== undefined ? cols[i] : "";
    });
    return obj;
  });
  return { header, rows };
}

const REQUIRED_COLUMNS = ["part_number", "part_name", "uom", "quantity_on_hand"];

export default function BulkUploadModal({ onClose, onComplete }) {
  const [fileName, setFileName] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFile = (ev) => {
    setErrors([]);
    const f = ev.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      if (parsed.error) {
        setErrors([parsed.error]);
        return;
      }
      const headerSet = new Set(parsed.header);
      const missing = REQUIRED_COLUMNS.filter((c) => !headerSet.has(c));
      if (missing.length) {
        setErrors([`Missing required columns: ${missing.join(", ")}`]);
        return;
      }
      const normalized = parsed.rows.map((r) => ({
        ...r,
        quantity_on_hand: r.quantity_on_hand ? Number(r.quantity_on_hand) : 0,
        minimum_stock_level: r.minimum_stock_level ? Number(r.minimum_stock_level) : 0,
        unit_price: r.unit_price ? Number(r.unit_price) : 0,
      }));
      setPreviewRows(normalized);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    setUploading(true);
    setErrors([]);
    try {
      const result = await api.bulkUploadParts(previewRows);
      // backend returns { success:1, data: [...] } — we treat success if no error
      if (result && (result.success === 1 || Array.isArray(result.data))) {
        onComplete && onComplete();
        onClose && onClose();
      } else {
        setErrors([result?.message || "Bulk upload failed"]);
      }
    } catch (err) {
      console.error("Bulk upload failed:", err);
      setErrors([err.response?.data?.message || err.message || String(err)]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Bulk Upload Parts (CSV)</h3>
        <div>
          <button className="px-3 py-1 rounded bg-gray-200" onClick={() => onClose && onClose()}>Close</button>
        </div>
      </div>

      <div className="mb-4">
        <input type="file" accept=".csv,text/csv" onChange={handleFile} />
        {fileName && <div className="text-sm text-gray-600 mt-2">Loaded: {fileName}</div>}
      </div>

      {errors.length > 0 && <div className="text-red-600 mb-3">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}

      <div className="mb-4">
        <div className="overflow-auto max-h-48 border p-2">
          {previewRows.length === 0 ? <div className="text-sm text-gray-500">No preview</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(previewRows[0]).map((k) => <th key={k} className="px-2 py-1 border">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => <tr key={i}>
                  {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1 border">{v}</td>)}
                </tr>)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => onClose && onClose()} className="px-3 py-2 border rounded">Cancel</button>
        <button onClick={handleUpload} disabled={uploading || previewRows.length === 0} className="px-3 py-2 bg-blue-600 text-white rounded">
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
