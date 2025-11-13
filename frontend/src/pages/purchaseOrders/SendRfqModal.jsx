// components/po/SendRfqModal.jsx
import { useEffect, useState } from "react";
import axios from "axios";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SendRfqModal({ poId, onClose, defaultTo = [], defaultCc = [] }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState({ subject: "", html: "" });
  const [to, setTo] = useState(defaultTo.join(", "));
  const [cc, setCc] = useState(defaultCc.join(", "));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${BASE}/api/purchase_orders/${poId}/rfq/preview`)
      .then(res => setPreview({ subject: res.data.subject, html: res.data.html }))
      .finally(() => setLoading(false));
  }, [poId]);

  const parseList = (s) => s.split(",").map(e => e.trim()).filter(Boolean);

  const send = async () => {
    setSending(true);
    try {
      await axios.post(`${BASE}/api/purchase_orders/${poId}/rfq/send`, {
        to: parseList(to),
        cc: parseList(cc),
      });
      alert("RFQ sent.");
      onClose(true); // indicate success
    } catch (e) {
      console.error(e);
      alert("Send failed. See console.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">Send RFQ</h2>
          <button onClick={() => onClose(false)} className="text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading preview…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-3 lg:col-span-1">
                <div>
                  <label className="text-sm font-medium">To (comma separated)</label>
                  <input className="border rounded p-2 w-full" value={to} onChange={e=>setTo(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">CC</label>
                  <input className="border rounded p-2 w-full" value={cc} onChange={e=>setCc(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <input className="border rounded p-2 w-full" value={preview.subject} readOnly />
                </div>
                <div className="text-xs text-gray-500">
                  Prices are intentionally excluded. Email contains: PO #, Items, Qty, Expected Delivery, Remarks.
                </div>
              </div>

              <div className="lg:col-span-2 border rounded">
                <div className="p-3 bg-gray-50 border-b text-sm text-gray-600">Draft Preview</div>
                <div className="p-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: preview.html }} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => onClose(false)} disabled={sending}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={send} disabled={sending}>
                {sending ? "Sending…" : "Send RFQ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
