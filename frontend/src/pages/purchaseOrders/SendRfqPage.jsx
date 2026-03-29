// src/pages/purchaseOrders/SendRfqPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

/******************************************************************
 * MULTI-SELECT SEARCH (POForm-style for vendors)
 ******************************************************************/
function SearchSelectMultiVendors({
  options = [],        // [{ id, label, name, email, location }]
  selectedIds = [],    // [id, id, ...]
  onChange,
  placeholder = "Select vendors to BCC…",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);

  const lowerSearch = search.toLowerCase();

  const filtered = options.filter((opt) =>
    (opt.label || "").toLowerCase().includes(lowerSearch)
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, options.length]);

  const handleToggleId = (id) => {
    if (!id) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleKeyDown = (e) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev + 1 >= filtered.length ? prev : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 < 0 ? 0 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlightIndex];
      if (item) {
        handleToggleId(item.id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const selectedOptions = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      {/* Display area (chips) */}
      <div
        className="border p-2 rounded w-full bg-white cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex flex-wrap gap-2">
          {selectedOptions.length === 0 && (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}

          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1"
            >
              {opt.label}
              <button
                type="button"
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedIds.filter((x) => x !== opt.id));
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded shadow z-20">
          <input
            autoFocus
            className="border-b p-2 w-full"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-500">No vendors found.</div>
            )}

            {filtered.map((opt, idx) => {
              const isSelected = selectedIds.includes(opt.id);
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => handleToggleId(opt.id)}
                  className={`text-left w-full px-2 py-1 hover:bg-blue-50 ${
                    isHighlighted ? "bg-blue-50" : ""
                  } ${isSelected ? "bg-blue-100 font-semibold" : ""}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/******************************************************************
 * SEND RFQ PAGE
 ******************************************************************/
export default function SendRfqPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [po, setPo] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [subject, setSubject] = useState("");

  const [to, setTo] = useState(""); // TO vendor email
  const [cc, setCc] = useState("purchasing@psr.com");

  const [vendorsRaw, setVendorsRaw] = useState([]);
  const [bccVendorIds, setBccVendorIds] = useState([]); // selected vendor IDs

  const [error, setError] = useState("");

  /**********************************************************
   * Load vendors + RFQ preview + PO data
   **********************************************************/
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);

        // 1) Load vendors (same as POForm source)
        const vRes = await axios.get(`${BASE}/vendors`);
        if (!cancelled) {
          const arr = vRes.data?.data || vRes.data || [];
          setVendorsRaw(Array.isArray(arr) ? arr : []);
        }

        // 2) Load PO header info
        const poRes = await axios.get(`${BASE}/purchase_orders/${id}`);
        const poData = poRes.data?.data || poRes.data;
        if (!poData) throw new Error("PO not found");
        if (!cancelled) setPo(poData);

        // 3) Load RFQ preview (includes main vendor email & subject)
        const prevRes = await axios.get(
          `${BASE}/purchase_orders/${id}/rfq/preview`
        );
        const data = prevRes.data;

        if (!cancelled) {
          setHtmlPreview(data.html || "");
          setSubject(data.subject || `RFQ: ${poData.psr_po_number}`);
          setTo(data.vendor_email || "");
        }
      } catch (e) {
        console.error("RFQ load error:", e);
        if (!cancelled) setError("Failed to load RFQ preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /**********************************************************
   * Normalized vendor options (POForm-style)
   **********************************************************/
  const vendorOptions = useMemo(() => {
    return (vendorsRaw || []).map((v) => {
      const id = v.vendor_id || v.id;
      const name = v.vendor_name || v.name || "Unnamed Vendor";
      const city = v.city || "";
      const region = v.state || v.country || "";
      const location = [city, region].filter(Boolean).join(", ");
      const email = v.email || "";

      // Option C — 1-line compact:
      // VendorName — City, State — email@example.com
      const parts = [name];
      if (location) parts.push(location);
      if (email) parts.push(email);
      const label = parts.join(" — ");

      return { id, name, location, email, label };
    });
  }, [vendorsRaw]);

  /**********************************************************
   * Derived BCC email list (from selected vendor IDs)
   **********************************************************/
  const bccEmails = useMemo(() => {
    return vendorOptions
      .filter((opt) => bccVendorIds.includes(opt.id) && opt.email)
      .map((opt) => opt.email)
      .join(", ");
  }, [vendorOptions, bccVendorIds]);

  /**********************************************************
   * Send RFQ
   **********************************************************/
  const handleSend = async () => {
    setError("");

    const parsedTo = to
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedCc = cc
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedBcc = vendorOptions
      .filter((opt) => bccVendorIds.includes(opt.id) && opt.email)
      .map((opt) => opt.email);

    if (!parsedTo.length) {
      setError("Please provide a TO email.");
      return;
    }

    try {
      setSending(true);

      await axios.post(`${BASE}/purchase_orders/${id}/rfq/send`, {
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
      });

      alert("✅ RFQ sent successfully!");
      localStorage.setItem("refreshPOList", "1");
      navigate("/purchase-orders");
    } catch (e) {
      console.error("RFQ send error:", e);
      setError(e?.response?.data?.error || "Failed to send RFQ.");
    } finally {
      setSending(false);
    }
  };

  /**********************************************************
   * Render
   **********************************************************/
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

      {/* Header Info */}
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
            readOnly // backend uses preview subject
          />
        </div>
      </div>

      {/* TO */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">To *</label>
        <input
          className="border rounded p-2 w-full"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {/* CC */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Cc</label>
        <input
          className="border rounded p-2 w-full"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
        />
      </div>

      {/* BCC Multi-select vendors */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Bcc (select multiple vendors)
        </label>

        <SearchSelectMultiVendors
          options={vendorOptions}
          selectedIds={bccVendorIds}
          onChange={setBccVendorIds}
          placeholder="Search & select vendors to BCC…"
        />

        <div className="text-xs text-gray-500 mt-1">
          {bccEmails
            ? `Emails: ${bccEmails}`
            : "No BCC emails selected yet."}
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">Preview</div>
        <div
          className="border rounded p-4 bg-gray-50 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlPreview }}
        />
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => navigate(`/purchase-orders/${id}`)}
        >
          Cancel
        </button>

        <button
          className={`px-4 py-2 rounded text-white ${
            sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
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