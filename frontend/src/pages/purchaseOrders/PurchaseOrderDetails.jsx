import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper: safe number -> fixed(2)
const toMoney = (v) => Number(v ?? 0).toFixed(2);

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const isView = true; // view mode only

  const load = async () => {
    try {
      const res = await axios.get(`${BASE}/api/purchase_orders/${id}`);
      const data = res.data || null;
      setPo(data);
      if (data && data.files) setFiles(data.files);
      else setFiles([]);
    } catch (err) {
      console.error("Failed to load PO:", err);
      setPo(null);
      setFiles([]);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onUpload = async (e) => {
    if (isView) return; // disabled in view
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));

    setUploading(true);
    try {
      await axios.post(`${BASE}/api/purchase_orders/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      alert("Files uploaded");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload files");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Order Details</h1>
        <Link to="/purchase-orders" className="text-blue-700 hover:underline">
          ← Back to list
        </Link>
      </div>

      {!po && <div className="bg-white rounded shadow p-6">Loading…</div>}

      {po && (
        <>
          <div className="bg-white rounded shadow p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">PO ID</div>
                <div className="font-semibold">{po.id}</div>
              </div>
              <div>
                <div className="text-gray-500">PO Number</div>
                <div className="font-semibold">{po.psr_po_number || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Supplier</div>
                <div className="font-semibold">{po.supplier_name || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Created By</div>
                <div className="font-semibold">{po.created_by || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Order Date</div>
                <div className="font-semibold">
                  {po.order_date
                    ? new Date(po.order_date).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Expected Delivery</div>
                <div className="font-semibold">
                  {po.expected_delivery_date
                    ? new Date(po.expected_delivery_date).toLocaleDateString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-semibold">{po.status || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Currency</div>
                <div className="font-semibold">{po.currency || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Subtotal</div>
                <div className="font-semibold">${toMoney(po.subtotal)}</div>
              </div>
              <div>
                <div className="text-gray-500">
                  Tax ({po.tax_percent ?? 0}%)
                </div>
                <div className="font-semibold">${toMoney(po.tax_amount)}</div>
              </div>
              <div>
                <div className="text-gray-500">Shipping</div>
                <div className="font-semibold">
                  ${toMoney(po.shipping_charges)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Grand Total</div>
                <div className="font-semibold">
                  ${toMoney(po.grand_total)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div className="font-semibold">
                  {po.created_at
                    ? new Date(po.created_at).toLocaleString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Updated</div>
                <div className="font-semibold">
                  {po.updated_at
                    ? new Date(po.updated_at).toLocaleString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Purchased On</div>
                <div className="font-semibold">
                  {(po.purchased_on || po.purchased_at)
                    ? new Date(
                        po.purchased_on || po.purchased_at
                      ).toLocaleString()
                    : "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-500">Remarks</div>
                <div className="font-semibold whitespace-pre-wrap">
                  {po.remarks || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded shadow p-6">
            <div className="mb-3">
              <div className="font-semibold mb-2">Attachments</div>
              {/* 🔒 Disabled in view mode */}
              <input
                type="file"
                multiple
                onChange={onUpload}
                disabled={true}
                className="opacity-60 cursor-not-allowed"
                title="Uploads are disabled in view mode"
              />
            </div>

            <div className="border-t pt-3">
              {files && files.length > 0 ? (
                <ul className="list-disc pl-6">
                  {files.map((f) => (
                    <li key={f.id}>
                      <a
                        href={`${BASE}${f.filepath.startsWith("/") ? "" : "/"}${f.filepath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        {f.original_filename} ({f.mime_type},{" "}
                        {f.size_bytes} bytes)
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">
                  No files uploaded yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
