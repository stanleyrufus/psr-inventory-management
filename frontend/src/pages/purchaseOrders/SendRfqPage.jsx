// src/pages/purchaseOrders/SendRfqPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SendRfqPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [po, setPo] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [subject, setSubject] = useState("");
  const [to, setTo] = useState("");   // comma-separated
  const [cc, setCc] = useState("");   // comma-separated
  const [error, setError] = useState("");

  // Load PO (so we can default “To” to vendor_email)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);

        // 1) PO details (includes vendor_email per your backend route)
        const poRes = await axios.get(`${BASE}/api/purchase_orders/${id}`);
        const poData = poRes.data?.data || poRes.data;
        if (!poData) throw new Error("PO not found");
        if (cancelled) return;
        setPo(poData);

        // default emails
        const defaultTo = poData.vendor_email || "";
        const defaultCc = (import.meta.env?.VITE_RFQ_CC_DEFAULT || "").trim();
        setTo(defaultTo);
        setCc(defaultCc);

        // 2) Preview render (HTML body & subject)
        const prevRes = await axios.get(`${BASE}/api/purchase_orders/${id}/rfq/preview`);
        if (cancelled) return;
        setHtmlPreview(prevRes.data?.html || "");
        setSubject(prevRes.data?.subject || `RFQ: ${poData.psr_po_number}`);
      } catch (e) {
        console.error("RFQ load error:", e);
        setError("Failed to load RFQ preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [id]);

  const parsedTo = useMemo(
    () => to.split(",").map(s => s.trim()).filter(Boolean),
    [to]
  );
  const parsedCc = useMemo(
    () => cc.split(",").map(s => s.trim()).filter(Boolean),
    [cc]
  );

  const handleSend = async () => {
    setError("");
    if (!parsedTo.length) {
      setError("Please provide at least one recipient email in the To field.");
      return;
    }
    try {
      setSending(true);
      await axios.post(`${BASE}/api/purchase_orders/${id}/rfq/send`, {
        to: parsedTo,
        cc: parsedCc,
      });
      alert("✅ RFQ sent successfully!");
localStorage.setItem("refreshPOList", "1"); // ✅ trigger reload on dashboard
navigate("/purchase-orders"); // ✅ go back to main PO dashboard

    } catch (e) {
      console.error("❌ RFQ send error:", e);
      setError(e?.response?.data?.error || "Failed to send RFQ.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-6">Loading RFQ…</div>;
  if (!po) return <div className="p-6">Purchase Order not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Send RFQ — PO {po.psr_po_number}
        </h2>
        <button
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => navigate(`/purchase-orders/${id}`)}
        >
          Back to PO
        </button>
      </div>

      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-600">Vendor</div>
          <div className="font-medium">{po.vendor_name || "—"}</div>
        </div>
        <div>
          <div className="text-gray-600">Expected Delivery</div>
          <div className="font-medium">
            {po.expected_delivery_date
              ? new Date(po.expected_delivery_date).toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-600">PO Remarks</div>
          <div className="font-medium">{po.remarks || "—"}</div>
        </div>
        <div>
          <div className="text-gray-600">Subject</div>
          <input
            className="border rounded p-2 w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      {/* Email fields */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">To *</label>
        <input
          className="border rounded p-2 w-full"
          placeholder="vendor@example.com, vendor2@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <div className="text-xs text-gray-500 mt-1">
          Separate multiple emails with commas.
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Cc</label>
        <input
          className="border rounded p-2 w-full"
          placeholder="cc@example.com"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
        />
      </div>

      {/* Preview */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">Preview</div>
        <div
          className="border rounded p-4 bg-gray-50 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlPreview }}
        />
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => navigate(`/purchase-orders/${id}`)}
        >
          Cancel
        </button>
        <button
          className={`px-4 py-2 rounded text-white ${
            sending ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send RFQ"}
        </button>
      </div>
    </div>
  );
}
