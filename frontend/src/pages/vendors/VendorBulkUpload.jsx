// frontend/src/pages/vendors/VendorBulkUpload.jsx
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { bulkUploadVendors } from "../../utils/api";

export default function VendorBulkUploadModal({ onClose }) {
  const [fileName, setFileName] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const topRef = useRef(null);

  const scrollTop = () => {
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const normalizeHeader = (raw) =>
    raw?.toString().trim().toLowerCase().replace(/\s+/g, "_") || "";

  // ✅ Helper: Convert Excel serial date → "YYYY-MM-DD"
  const excelDateToJS = (serial) => {
    if (!serial || isNaN(serial)) return serial;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
    return jsDate.toISOString().split("T")[0];
  };

  const parseFile = (file, callback, onError) => {
    const reader = new FileReader();

    if (file.name.endsWith(".xlsx")) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          // normalize excel date-looking numeric cells into nice strings
          const converted = json.map((row) => {
            const r2 = {};
            for (const [key, value] of Object.entries(row)) {
              if (
                typeof value === "number" &&
                key.toLowerCase().includes("date")
              ) {
                r2[key] = excelDateToJS(value);
              } else {
                r2[key] = value;
              }
            }
            return r2;
          });

          callback(converted);
        } catch (err) {
          onError(`Error parsing Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split(/\r?\n/).filter(Boolean);
          const header = lines[0].split(",").map((h) => h.trim());
          const rows = lines.slice(1).map((line) => {
            const cols = line.split(",").map((c) => c.trim());
            const obj = {};
            header.forEach((h, i) => {
              obj[h] = cols[i] || "";
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
  };

  const handleFile = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setPreviewRows([]);
    setUploadSummary(null);

    parseFile(
      file,
      (rows) => {
        if (!rows || rows.length === 0) {
          setErrors(["File is empty or unreadable."]);
          scrollTop();
          return;
        }

        const normalizedRows = rows.map((raw) => {
          const mapped = {};
          for (const [origKey, v] of Object.entries(raw)) {
            const nk = normalizeHeader(origKey);

            if (nk === "vendorname" || nk === "vendor_name") {
              mapped.vendor_name = v;
            } else if (nk === "contact_name" || nk === "contactname") {
              mapped.contact_name = v;
            } else if (nk === "phone") {
              mapped.phone = v;
            } else if (nk === "email") {
              mapped.email = v;
            } else if (nk === "address1" || nk === "address_line_1") {
              mapped.address1 = v;
            } else if (nk === "address2" || nk === "address_line_2") {
              mapped.address2 = v;
            } else if (nk === "city") {
              mapped.city = v;
            } else if (nk === "state") {
              mapped.state = v;
            } else if (nk === "country") {
              mapped.country = v;
            } else if (
              nk === "postal_code" ||
              nk === "postalcode" ||
              nk === "zip"
            ) {
              mapped.postal_code = v;
            } else if (nk === "website") {
              mapped.website = v;
            } else if (nk === "remarks" || nk === "notes") {
              mapped.remarks = v;
            } else if (
              nk === "isactive" ||
              nk === "active" ||
              nk === "status"
            ) {
              mapped.isactive =
                v === true ||
                v === "true" ||
                v === "TRUE" ||
                v === "Active" ||
                v === "ACTIVE";
            } else {
              mapped[origKey] = v;
            }
          }

          if (mapped.isactive === undefined) {
            mapped.isactive = true;
          }

          return mapped;
        });

        // require vendor_name
        const hasVendor = normalizedRows.some(
          (r) => r.vendor_name && r.vendor_name.trim()
        );
        if (!hasVendor) {
          setErrors([
            'Missing required column: vendor_name ("Vendor Name" / "vendor_name").',
          ]);
          scrollTop();
          return;
        }

        setPreviewRows(normalizedRows);
        scrollTop();
      },
      (err) => {
        setErrors([err]);
        scrollTop();
      }
    );
  };

  const handleUpload = async () => {
    if (previewRows.length === 0) {
      setErrors(["No valid rows to upload."]);
      scrollTop();
      return;
    }

    setUploading(true);
    setErrors([]);
    setUploadSummary(null);

    try {
      const result = await bulkUploadVendors(previewRows);

      if (result && result.success === 1) {
        let summaryText = `✅ Inserted ${result.inserted?.length || 0} vendor(s).`;
        if (result.duplicates?.length) {
          summaryText += ` ⚠️ Skipped ${result.duplicates.length} duplicate(s): ${result.duplicates.join(
            ", "
          )}`;
        }
        setUploadSummary(summaryText);
      } else {
        setErrors([result?.message || "Bulk upload failed."]);
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setErrors([err.response?.data?.message || err.message]);
    } finally {
      setUploading(false);
      scrollTop();
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-h-[80vh] overflow-y-auto">
      <div ref={topRef} />

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Bulk Upload Vendors</h3>
        <button
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => onClose && onClose()}
        >
          Close
        </button>
      </div>

      {errors.length > 0 && (
        <div className="text-red-600 mb-3 text-sm border border-red-300 bg-red-50 p-2 rounded">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {uploadSummary && (
        <div className="mb-3 text-sm border border-green-300 bg-green-50 text-green-700 p-2 rounded">
          {uploadSummary}
        </div>
      )}

      <div className="mb-4">
        <input
          type="file"
          accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFile}
          className="block text-sm"
        />
        {fileName && (
          <div className="text-sm text-gray-600 mt-2">Loaded: {fileName}</div>
        )}
      </div>

      <div className="overflow-auto max-h-60 border rounded mb-4">
        {previewRows.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No preview
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {Object.keys(previewRows[0]).map((k) => (
                  <th key={k} className="px-2 py-1 border">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {Object.values(r).map((v, j) => (
                    <td key={j} className="px-2 py-1 border truncate">
                      {String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => onClose && onClose()}
          className="px-3 py-2 border rounded hover:bg-gray-100"
        >
          Close
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || previewRows.length === 0}
          className={`px-3 py-2 rounded text-white ${
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
