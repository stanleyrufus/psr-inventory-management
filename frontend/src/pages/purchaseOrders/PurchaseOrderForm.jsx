// src/pages/purchaseOrders/PurchaseOrderForm.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ===========================================================
   🔵 SEARCHSELECT — DROP-IN COMPONENT (embedded in this file)
   =========================================================== */
function SearchSelect({
  items = [],
  value,
  onChange,
  display,
  placeholder = "Search...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);

  const lowerSearch = search.toLowerCase();

  const filtered = items.filter((item) =>
    display(item).toLowerCase().includes(lowerSearch)
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, items.length]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedItem = items.find((item) => item.id === value);
  const displayValue = selectedItem ? display(selectedItem) : "";

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
        onChange(item.id);
        setOpen(false);
        setSearch("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <input
        disabled={disabled}
        value={displayValue}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        readOnly
        placeholder={placeholder}
        className="border p-2 rounded w-full bg-white cursor-pointer"
      />

      {open && (
        <div className="absolute mt-1 w-full bg-white border rounded shadow z-20">
          <input
            autoFocus
            className="border-b p-2 w-full"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-2 text-sm text-gray-500">No results.</div>
            )}

            {filtered.map((item, idx) => {
              const isSelected = item.id === value;
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`text-left w-full px-2 py-1 hover:bg-blue-50 ${
                    isHighlighted ? "bg-blue-50" : ""
                  } ${isSelected ? "bg-blue-100 font-semibold" : ""}`}
                >
                  {display(item)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================
   EXISTING FILE CONTENT
   ============================= */

function PaidStamp() {
  return (
    <div className="absolute top-2 right-2 rotate-[-15deg] pointer-events-none opacity-70">
      <span className="inline-block px-4 py-1 text-red-700 border-4 border-red-700 font-extrabold text-2xl tracking-wider rounded-lg">
        PAID
      </span>
    </div>
  );
}

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const FILE_BASE = BASE.replace(/\/api$/, "");

const n = (v) => Number(v ?? 0);
const money = (v) => n(v).toFixed(2);

export default function PurchaseOrderForm({
  initialPo,
  onSaved,
  onCancel,
  isModal = false,
}) {
  const navigate = useNavigate();

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate("/purchase-orders");
  };

  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [staffList] = useState(["Shiney Ramnarain"]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [existingFiles, setExistingFiles] = useState(initialPo?.files || []);
  const [deletingFileIds, setDeletingFileIds] = useState([]);

  useEffect(() => {
    setExistingFiles(initialPo?.files || []);
  }, [initialPo]);

  const [addingNewVendor, setAddingNewVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    country: "",
  });

  const [addingNewPartRow, setAddingNewPartRow] = useState({});
  const [newPartDraft, setNewPartDraft] = useState({});

  const [addingGlobalPart, setAddingGlobalPart] = useState(false);
  const [globalPart, setGlobalPart] = useState({
    part_number: "",
    part_name: "",
    description: "",
    current_unit_price: "",
  });

  const toDateOnly = (val) => (val ? String(val).slice(0, 10) : "");

  const normalizePo = (poData) => {
    if (!poData) return null;

    const rawItems = poData.items || poData.po_items || [];

    const items = rawItems.map((i) => ({
      poItemId: i.id,
      partId: i.part_id || i.partId,
      description: i.description || "",
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
      lineNo: i.line_no || null,
      lastUnitPrice: i.last_unit_price || null,
    }));

    return {
      ...poData,
      order_date: toDateOnly(poData.order_date),
      expected_delivery_date: toDateOnly(poData.expected_delivery_date),
      items,
    };
  };

  const [po, setPo] = useState(
    initialPo
      ? normalizePo(initialPo)
      : {
          psr_po_number: "",
          order_date: new Date().toISOString().split("T")[0],
          expected_delivery_date: "",
          created_by: "",
          vendor_id: "",
          vendor_name: "",
          payment_method: "",
          payment_terms: "",
          currency: "USD",
          remarks: "",
          tax_percent: 0,
          shipping_charges: 0,
          items: [],
          subtotal: 0,
          tax_amount: 0,
          grand_total: 0,
          status: "Draft",
        }
  );

  // Load vendors + parts
  useEffect(() => {
    axios
      .get(`${BASE}/api/vendors`)
      .then((res) => setVendors(res.data || []))
      .catch(() => setVendors([]));

    axios
      .get(`${BASE}/api/parts`)
      .then((res) => {
        const raw = res.data?.data || res.data || [];
        const normalized = raw.map((p) => ({
          part_id: p.part_id || p.id,
          part_number: p.part_number,
          description: p.description || "",
          current_unit_price: p.current_unit_price || p.unit_price || 0,
          last_unit_price: p.last_unit_price || null,
        }));
        setParts(normalized);
      })
      .catch(() => setParts([]));
  }, []);
  const nNum = (v) =>
    v === "" || v === null || v === undefined ? 0 : Number(v);

  const recalcTotals = (items, shipping = po.shipping_charges) => {
    const subtotal = items.reduce((sum, i) => sum + nNum(i.totalPrice), 0);
    const tax_amount = (subtotal * nNum(po.tax_percent)) / 100;
    const grand_total = subtotal + tax_amount + nNum(shipping);
    setPo((prev) => ({ ...prev, subtotal, tax_amount, grand_total }));
  };

  const removeItemRow = (index) => {
    const updatedItems = po.items.filter((_, i) => i !== index);
    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  const addItemRow = () => {
    setPo((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          partId: "",
          description: "",
          quantity: 1,
          unit: "pcs",
          unitPrice: 0,
          totalPrice: 0,
          lastUnitPrice: null,
        },
      ],
    }));
  };

  // ---- PER-ROW NEW PART ----
  const openNewPartFormForRow = (rowIndex) => {
    setAddingNewPartRow((prev) => ({ ...prev, [rowIndex]: true }));
    setNewPartDraft((prev) => ({
      ...prev,
      [rowIndex]: {
        part_number: "",
        part_name: "",
        description: "",
        current_unit_price: "",
      },
    }));
  };

  const cancelNewPartForRow = (rowIndex) => {
    setAddingNewPartRow((prev) => ({ ...prev, [rowIndex]: false }));
    setNewPartDraft((prev) => {
      const copy = { ...prev };
      delete copy[rowIndex];
      return copy;
    });
  };

  const saveNewPartForRow = async (rowIndex) => {
    const draft = newPartDraft[rowIndex] || {};
    if (!draft.part_number?.trim()) {
      alert("Part Number is required.");
      return;
    }

    try {
      const res = await axios.post(`${BASE}/api/parts`, {
        part_number: draft.part_number,
        part_name: draft.part_name || "",
        description: draft.description || "",
        current_unit_price: draft.current_unit_price || 0,
        status: "Active",
      });

      const newPart = res.data?.data;
      if (!newPart) {
        alert("Failed to create part.");
        return;
      }

      setParts((prev) => [
        ...prev,
        {
          part_id: newPart.part_id,
          part_number: newPart.part_number,
          part_name: newPart.part_name,
          description: newPart.description,
          current_unit_price: newPart.current_unit_price,
          last_unit_price: newPart.last_unit_price,
        },
      ]);

      const updatedItems = [...po.items];
      updatedItems[rowIndex] = {
        ...updatedItems[rowIndex],
        partId: newPart.part_id,
        description: newPart.description || newPart.part_name || "",
        unitPrice: nNum(newPart.current_unit_price || 0),
        lastUnitPrice: newPart.last_unit_price || null,
      };
      updatedItems[rowIndex].totalPrice =
        nNum(updatedItems[rowIndex].quantity) *
        nNum(updatedItems[rowIndex].unitPrice);

      setPo({ ...po, items: updatedItems });
      recalcTotals(updatedItems);

      cancelNewPartForRow(rowIndex);
    } catch (err) {
      console.error("❌ Error creating new part:", err);
      alert("Failed to add new part.");
    }
  };

  // PART SELECTION
  const handlePartSelect = (index, value) => {
    if (value === "new") {
      openNewPartFormForRow(index);
      return;
    }

    const selected = parts.find(
      (p) =>
        String(p.part_id) === String(value) || String(p.id) === String(value)
    );

    if (!selected) return;

    const updatedItems = [...po.items];
    updatedItems[index] = {
      ...updatedItems[index],
      partId: selected.part_id,
      unitPrice: selected.last_unit_price
        ? nNum(selected.last_unit_price)
        : selected.current_unit_price
        ? nNum(selected.current_unit_price)
        : "",
      lastUnitPrice: selected.last_unit_price || null,
    };
    updatedItems[index].totalPrice =
      nNum(updatedItems[index].quantity) * nNum(updatedItems[index].unitPrice);

    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...po.items];
    updatedItems[index][field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        nNum(updatedItems[index].quantity) *
        nNum(updatedItems[index].unitPrice);
    }
    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  // GLOBAL NEW PART PANEL
  const saveGlobalPart = async () => {
    if (!globalPart.part_number.trim()) {
      alert("Part Number is required.");
      return;
    }
    try {
      const res = await axios.post(`${BASE}/api/parts`, {
        part_number: globalPart.part_number,
        part_name: globalPart.part_name || "",
        description: globalPart.description || "",
        current_unit_price: globalPart.current_unit_price || 0,
        status: "Active",
      });

      const newPart = res.data?.data;
      if (!newPart) {
        alert("Error creating part.");
        return;
      }

      setParts((prev) => [
        ...prev,
        {
          part_id: newPart.part_id,
          part_number: newPart.part_number,
          part_name: newPart.part_name,
          description: newPart.description,
          current_unit_price: newPart.current_unit_price,
          last_unit_price: newPart.last_unit_price,
        },
      ]);

      setAddingGlobalPart(false);
      setGlobalPart({
        part_number: "",
        part_name: "",
        description: "",
        current_unit_price: "",
      });

      alert("Part added successfully.");
    } catch (err) {
      console.error("❌ Global part add error:", err);
      alert("Error adding part.");
    }
  };

  // VENDOR INLINE ADD
  const saveNewVendor = async () => {
    if (!newVendor.vendor_name.trim()) {
      alert("Vendor name required.");
      return;
    }
    try {
      const res = await axios.post(`${BASE}/api/vendors`, {
        ...newVendor,
        is_active: true,
      });

      const added = res.data?.data;
      if (!added) {
        alert(res.data?.message || "Error saving vendor.");
        return;
      }

      setVendors((prev) => [...prev, added]);
      setPo((p) => ({ ...p, vendor_id: added.vendor_id }));

      setAddingNewVendor(false);
      setNewVendor({
        vendor_name: "",
        contact_name: "",
        email: "",
        phone: "",
        city: "",
        country: "",
      });
    } catch (err) {
      console.error("Vendor add error:", err);
      alert("Error adding vendor.");
    }
  };

  const recalcShipping = (e) => {
    const val = e.target.value;
    setPo((prev) => ({ ...prev, shipping_charges: val }));
    recalcTotals(po.items, val);
  };

  const handleFileChange = (e) => setAttachments([...e.target.files]);

  const handleDeleteFile = async (fileId) => {
    if (!initialPo?.id) return;
    if (!window.confirm("Delete this attachment?")) return;

    try {
      setDeletingFileIds((prev) => [...prev, fileId]);
      await axios.delete(
        `${BASE}/api/purchase_orders/${initialPo.id}/file/${fileId}`
      );
      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error("❌ File delete error:", err);
      alert("Failed to delete file.");
    } finally {
      setDeletingFileIds((prev) => prev.filter((id) => id !== fileId));
    }
  };
  const handleSaveDraft = async () => {
    if (!po.psr_po_number.trim()) {
      alert("PO Number is required to save a draft.");
      return;
    }

    try {
      const exists = await axios
        .get(`${BASE}/api/purchase_orders/check-number/${po.psr_po_number}`)
        .then((res) => res.data.exists)
        .catch(() => false);

      if (exists) {
        alert("This PO Number already exists. Please use a unique PO Number.");
        return;
      }
    } catch (err) {
      console.error("❌ Error checking PO number:", err);
      alert("Failed to validate PO number.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await axios.post(`${BASE}/api/purchase_orders`, {
        ...po,
        status: "Draft",
        items: po.items.map((i, index) => ({
          id: null,
          part_id: Number(i.partId),
          line_no: index + 1,
          quantity: String(i.quantity),
          unit_price: String(i.unitPrice),
          total_price: String(i.totalPrice),
          description: i.description || "",
        })),
      });

      const newId = res.data?.po_id;
      if (!newId) {
        alert("Failed to save draft.");
        return;
      }

      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append("files", file);
        });

        const uploadRes = await axios.post(
          `${BASE}/api/purchase_orders/${newId}/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const uploaded = uploadRes.data?.files || [];
        setExistingFiles((prev) => [...prev, ...uploaded]);
        setAttachments([]);
      }

      alert("Draft saved successfully.");
      navigate("/purchase-orders");
    } catch (err) {
      console.error("❌ Draft save failed:", err);
      alert("Failed to save draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saved) return;

    setSubmitting(true);

    if (!po.items || po.items.length === 0) {
      alert("At least one Part must be added.");
      setSubmitting(false);
      return;
    }

    for (let i of po.items) {
      if (!i.partId) {
        alert("Each line needs a Part.");
        setSubmitting(false);
        return;
      }
      if (!i.quantity || Number(i.quantity) <= 0) {
        alert("Quantity must be > 0.");
        setSubmitting(false);
        return;
      }
      if (!i.unitPrice || Number(i.unitPrice) <= 0) {
        alert("Unit Price must be > 0.");
        setSubmitting(false);
        return;
      }
    }

    recalcTotals(po.items);

    if (!initialPo?.id) {
      try {
        const exists = await axios
          .get(
            `${BASE}/api/purchase_orders/check-number/${po.psr_po_number}`
          )
          .then((res) => res.data.exists)
          .catch(() => false);

        if (exists) {
          alert("PO Number exists. Use a unique one.");
          setSubmitting(false);
          return;
        }
      } catch {}
    }

    let sendRevised = false;

    if (
      initialPo?.id &&
      (initialPo.status === "Sent RFQ" ||
        initialPo.status === "Sent Revised RFQ")
    ) {
      const originalNorm = normalizePo(initialPo);
      const userEditedSomething =
        originalNorm && JSON.stringify(originalNorm) !== JSON.stringify(po);

      if (userEditedSomething) {
        const wantRevised = window.confirm(
          "This PO was already sent.\nSend revised RFQ now?"
        );
        sendRevised = wantRevised;
      }
    }

    let finalStatus = po.status;

    if (!initialPo?.id) {
      finalStatus = "Draft";
    }

    const payload = {
      psr_po_number: po.psr_po_number,
      order_date: po.order_date,
      expected_delivery_date: po.expected_delivery_date,
      created_by: po.created_by,
      vendor_id: po.vendor_id,
      payment_terms: po.payment_terms,
      currency: po.currency,
      remarks: po.remarks,
      tax_percent: Number(po.tax_percent),
      shipping_charges: Number(po.shipping_charges),
      subtotal: Number(po.subtotal),
      tax_amount: Number(po.tax_amount),
      grand_total: Number(po.grand_total),
      status: finalStatus,
      items: po.items.map((i, index) => ({
        id: i.poItemId ?? null,
        part_id: Number(i.partId),
        line_no: index + 1,
        quantity: String(i.quantity),
        unit_price: String(i.unitPrice),
        total_price: String(i.totalPrice),
        description: i.description || "",
      })),
    };

    try {
      if (initialPo?.id) {
        await axios.put(
          `${BASE}/api/purchase_orders/${initialPo.id}`,
          payload
        );

        if (attachments.length > 0) {
          const fd = new FormData();
          attachments.forEach((f) => fd.append("files", f));
          await axios.post(
            `${BASE}/api/purchase_orders/${initialPo.id}/upload`,
            fd
          );
        }

        if (sendRevised) {
          if (!validateBeforeRFQ()) {
            setSubmitting(false);
            return;
          }

          navigate(`/purchase-orders/${initialPo.id}/send-rfq?revised=1`);
          return;
        }

        alert("PO updated successfully.");
      } else {
        const res = await axios.post(
          `${BASE}/api/purchase_orders`,
          payload
        );

        const poId = res.data?.po_id;

        if (poId && attachments.length) {
          const fd = new FormData();
          attachments.forEach((f) => fd.append("files", f));
          await axios.post(
            `${BASE}/api/purchase_orders/${poId}/upload`,
            fd
          );
        }

        alert("PO created successfully.");
      }

      setSaved(true);

      if (isModal && onSaved) onSaved();
      else navigate("/purchase-orders");
    } catch (err) {
      console.error("❌ PO save error:", err);
      alert("Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = po.status;

  const validateBeforeRFQ = () => {
    if (!po.vendor_id) {
      alert("Select vendor before sending.");
      return false;
    }
    if (!po.created_by) {
      alert("Select who created.");
      return false;
    }
    if (!po.items || po.items.length === 0) {
      alert("Add at least one item.");
      return false;
    }
    for (const i of po.items) {
      if (!i.partId) {
        alert("Each item must have a Part.");
        return false;
      }
      if (!i.quantity || Number(i.quantity) <= 0) {
        alert("Quantity must be > 0.");
        return false;
      }
      if (!i.unitPrice || Number(i.unitPrice) <= 0) {
        alert("Unit Price must be > 0.");
        return false;
      }
    }
    return true;
  };

  const goToSendRFQ = () => {
    if (!initialPo?.id) {
      alert("Save draft first.");
      return;
    }
    if (!validateBeforeRFQ()) return;
    navigate(`/purchase-orders/${initialPo.id}/send-rfq`);
  };

  const markOrdered = async () => {
    if (!initialPo?.id) return;

    await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, {
      ...po,
      status: "Ordered",
    });

    setPo((p) => ({ ...p, status: "Ordered" }));
    alert("PO Marked Ordered");
  };

  const markReceived = async () => {
    if (!initialPo?.id) return;

    await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, {
      ...po,
      status: "Received",
    });

    setPo((p) => ({ ...p, status: "Received" }));
    alert("PO Marked Received");
  };

  const cancelPO = async () => {
    if (!initialPo?.id) return;
    if (!window.confirm("Cancel this PO?")) return;

    await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, {
      ...po,
      status: "Cancelled",
    });

    setPo((p) => ({ ...p, status: "Cancelled" }));
    alert("PO Cancelled");
  };

  const formScrollClasses = isModal ? "" : "max-h-[90vh] overflow-y-auto";

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white p-6 rounded shadow ${formScrollClasses}`}
    >
      {/* HEADER */}
      <div className="relative flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-700">
          {initialPo ? "Edit Purchase Order" : "New Purchase Order"}
        </h2>

        {isModal && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-700 hover:text-black text-2xl font-bold leading-none"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* --- Basic Details --- */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold">PSR PO Number *</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={po.psr_po_number || ""}
            onChange={(e) =>
              setPo({ ...po, psr_po_number: e.target.value })
            }
            required
            disabled={submitting || saved}
          />
        </div>

        <div>
          <label className="font-semibold">Status</label>
          <select
            className="border p-2 rounded w-full"
            value={po.status || ""}
            onChange={(e) => setPo({ ...po, status: e.target.value })}
            disabled={submitting || saved}
          >
            <option value="Draft">Draft</option>
            <option value="Sent RFQ">Sent RFQ</option>
            <option value="Sent Revised RFQ">Sent Revised RFQ</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="font-semibold">Expected Delivery Date</label>
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={po.expected_delivery_date || ""}
            onChange={(e) =>
              setPo({ ...po, expected_delivery_date: e.target.value })
            }
            disabled={submitting || saved}
          />
        </div>

        <div>
          <label className="font-semibold">Ordered By *</label>
          <select
            className="border p-2 rounded w-full"
            value={po.created_by || ""}
            onChange={(e) =>
              setPo({ ...po, created_by: e.target.value })
            }
            required
            disabled={submitting || saved}
          >
            <option value="">Select</option>
            {staffList.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Vendor Section --- */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="font-semibold">Vendor *</label>
          <button
            type="button"
            className="text-sm text-blue-700 hover:underline"
            onClick={() => setAddingNewVendor(true)}
            disabled={submitting || saved}
          >
            + Add New Vendor
          </button>
        </div>

        {!addingNewVendor ? (
          <div className="space-y-2">
            <SearchSelect
              items={vendors.map((v) => {
                const id = v.vendor_id || v.id;
                const name = v.vendor_name || v.name || "Unnamed Vendor";
                const city = v.city || "";
                const region = v.state || v.country || "";
                const location = [city, region].filter(Boolean).join(", ");
                return { id, name, location };
              })}
              value={po.vendor_id}
              onChange={(id) =>
                setPo((prev) => ({
                  ...prev,
                  vendor_id: id,
                }))
              }
              display={(v) =>
                v.location ? `${v.name} — ${v.location}` : v.name
              }
              placeholder="Search vendor..."
              disabled={submitting || saved}
            />

            {po.vendor_id && (
              <div className="text-xs text-gray-600 mt-1">
                Selected vendor ID: {po.vendor_id}
              </div>
            )}
          </div>
        ) : (
          <div className="border p-3 bg-gray-50 rounded space-y-2">
            <input
              placeholder="Vendor Name *"
              className="border p-2 rounded w-full"
              value={newVendor.vendor_name}
              onChange={(e) =>
                setNewVendor({ ...newVendor, vendor_name: e.target.value })
              }
              disabled={submitting || saved}
            />
            <input
              placeholder="Contact Name"
              className="border p-2 rounded w-full"
              value={newVendor.contact_name}
              onChange={(e) =>
                setNewVendor({
                  ...newVendor,
                  contact_name: e.target.value,
                })
              }
              disabled={submitting || saved}
            />
            <input
              placeholder="Email"
              className="border p-2 rounded w-full"
              value={newVendor.email}
              onChange={(e) =>
                setNewVendor({ ...newVendor, email: e.target.value })
              }
              disabled={submitting || saved}
            />
            <input
              placeholder="Phone"
              className="border p-2 rounded w-full"
              value={newVendor.phone}
              onChange={(e) =>
                setNewVendor({ ...newVendor, phone: e.target.value })
              }
              disabled={submitting || saved}
            />
            <div className="flex gap-2">
              <input
                placeholder="City"
                className="border p-2 rounded w-full"
                value={newVendor.city}
                onChange={(e) =>
                  setNewVendor({ ...newVendor, city: e.target.value })
                }
                disabled={submitting || saved}
              />
              <input
                placeholder="Country"
                className="border p-2 rounded w-full"
                value={newVendor.country}
                onChange={(e) =>
                  setNewVendor({
                    ...newVendor,
                    country: e.target.value,
                  })
                }
                disabled={submitting || saved}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => setAddingNewVendor(false)}
                disabled={submitting || saved}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={saveNewVendor}
                disabled={submitting || saved}
              >
                Save Vendor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Order Items Header --- */}
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Order Items</h3>
          <button
            type="button"
            className="text-sm text-green-700 hover:underline"
            onClick={() => setAddingGlobalPart(true)}
            disabled={submitting || saved}
          >
            + Add New Part
          </button>
        </div>

        {addingGlobalPart && (
          <div className="border p-3 bg-gray-50 rounded space-y-2">
            <input
              placeholder="Part Number *"
              className="border p-2 rounded w-full"
              value={globalPart.part_number}
              onChange={(e) =>
                setGlobalPart({
                  ...globalPart,
                  part_number: e.target.value,
                })
              }
              disabled={submitting || saved}
            />
            <input
              placeholder="Part Name"
              className="border p-2 rounded w-full"
              value={globalPart.part_name}
              onChange={(e) =>
                setGlobalPart({
                  ...globalPart,
                  part_name: e.target.value,
                })
              }
              disabled={submitting || saved}
            />
            <input
              placeholder="Description"
              className="border p-2 rounded w-full"
              value={globalPart.description}
              onChange={(e) =>
                setGlobalPart({
                  ...globalPart,
                  description: e.target.value,
                })
              }
              disabled={submitting || saved}
            />
            <input
              type="number"
              placeholder="Unit Price"
              className="border p-2 rounded w-full"
              value={globalPart.current_unit_price}
              onChange={(e) =>
                setGlobalPart({
                  ...globalPart,
                  current_unit_price: e.target.value,
                })
              }
              disabled={submitting || saved}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => setAddingGlobalPart(false)}
                disabled={submitting || saved}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-2 py-1 bg-green-600 text-white rounded"
                onClick={saveGlobalPart}
                disabled={submitting || saved}
              >
                Save Part
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Items Table --- */}
      <table className="w-full border mb-4 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">Part</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Unit Price</th>
            <th className="p-2 border text-right">Total</th>
            <th className="p-2 border text-center">Remove</th>
          </tr>
        </thead>

        <tbody>
          {po.items.map((item, i) => {
            const selectedPart =
              parts.find(
                (p) =>
                  String(p.part_id || p.id) ===
                  String(item.partId || item.part_id)
              ) || null;

            return (
              <tr key={i}>
                <td className="border p-2">{i + 1}</td>

                <td className="border p-2 align-top">
                  {!addingNewPartRow[i] ? (
                    <div className="space-y-1">
                      <SearchSelect
                        items={parts.map((p) => ({
                          id: p.part_id || p.id,
                          part_number: p.part_number,
                          description: p.description || "",
                        }))}
                        value={item.partId || item.part_id || ""}
                        onChange={(id) => handlePartSelect(i, id)}
                        display={(p) =>
                          `${p.part_number || "No Part #"} — ${
                            p.description || "No description"
                          }`
                        }
                        placeholder="Search part..."
                        disabled={submitting || saved}
                      />

                      {selectedPart && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          {selectedPart.description}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border rounded p-2 space-y-1">
                      <input
                        placeholder="Part Number *"
                        className="border p-1 rounded w-full"
                        value={newPartDraft[i]?.part_number || ""}
                        onChange={(e) =>
                          setNewPartDraft({
                            ...newPartDraft,
                            [i]: {
                              ...newPartDraft[i],
                              part_number: e.target.value,
                            },
                          })
                        }
                        disabled={submitting || saved}
                      />
                      <input
                        placeholder="Part Name"
                        className="border p-1 rounded w-full"
                        value={newPartDraft[i]?.part_name || ""}
                        onChange={(e) =>
                          setNewPartDraft({
                            ...newPartDraft,
                            [i]: {
                              ...newPartDraft[i],
                              part_name: e.target.value,
                            },
                          })
                        }
                        disabled={submitting || saved}
                      />
                      <input
                        placeholder="Description"
                        className="border p-1 rounded w-full"
                        value={newPartDraft[i]?.description || ""}
                        onChange={(e) =>
                          setNewPartDraft({
                            ...newPartDraft,
                            [i]: {
                              ...newPartDraft[i],
                              description: e.target.value,
                            },
                          })
                        }
                        disabled={submitting || saved}
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        className="border p-1 rounded w-full"
                        value={
                          newPartDraft[i]?.current_unit_price || ""
                        }
                        onChange={(e) =>
                          setNewPartDraft({
                            ...newPartDraft,
                            [i]: {
                              ...newPartDraft[i],
                              current_unit_price: e.target.value,
                            },
                          })
                        }
                        disabled={submitting || saved}
                      />

                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-200 rounded"
                          onClick={() => cancelNewPartForRow(i)}
                          disabled={submitting || saved}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-blue-600 text-white rounded"
                          onClick={() => saveNewPartForRow(i)}
                          disabled={submitting || saved}
                        >
                          Save Part
                        </button>
                      </div>
                    </div>
                  )}
                </td>

                <td className="border p-2">
                  <input
                    type="number"
                    value={item.quantity}
                    className="border p-1 rounded w-full"
                    onChange={(e) =>
                      updateItem(i, "quantity", e.target.value)
                    }
                    disabled={submitting || saved}
                  />
                </td>

                <td className="border p-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    className="border p-1 rounded w-full"
                    onChange={(e) =>
                      updateItem(i, "unitPrice", e.target.value)
                    }
                    disabled={submitting || saved}
                  />

                  {item.lastUnitPrice && (
                    <div className="text-xs text-gray-500">
                      Last: ${money(item.lastUnitPrice)}
                    </div>
                  )}
                </td>

                <td className="border p-2 text-right">
                  ${money(item.totalPrice)}
                </td>

                <td className="border p-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={submitting || saved}
                    className="text-red-600 font-bold hover:text-red-800"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="text-sm text-green-700 hover:underline"
          onClick={addItemRow}
          disabled={submitting || saved}
        >
          + Add Part
        </button>
      </div>

      {/* --- Totals --- */}
      <div className="mt-6 border-t pt-4 text-right space-y-1">
        <div>Subtotal: ${money(po.subtotal)}</div>
        <div>Tax ({po.tax_percent}%): ${money(po.tax_amount)}</div>

        <div>
          Shipping:{" "}
          <input
            type="number"
            value={po.shipping_charges || ""}
            onChange={recalcShipping}
            className="border rounded p-1 w-24 text-right"
            disabled={submitting || saved}
          />
        </div>

        <div className="font-bold mt-2">
          Grand Total: ${money(po.grand_total)}
        </div>
      </div>

      {/* --- Upload New Attachments --- */}
      <div className="mt-6">
        <label className="font-semibold">Attachments</label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
          disabled={submitting || saved}
        />
      </div>

      {/* --- Existing Attachments --- */}
      {existingFiles.length > 0 && (
        <div className="mt-4 border p-3 bg-gray-50 rounded">
          <p className="font-semibold mb-1 text-gray-700">
            Existing Attachments:
          </p>

          <ul className="list-disc pl-6 text-sm space-y-1">
            {existingFiles.map((f) => {
              const safePath =
                "/" + (f.filepath || "").replace(/^\/+/, "");

              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3"
                >
                  <a
                    href={`${FILE_BASE}${safePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {f.original_filename} ({f.mime_type},{" "}
                    {f.size_bytes?.toLocaleString()} bytes)
                  </a>

                  {initialPo?.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id)}
                      disabled={
                        submitting ||
                        deletingFileIds.includes(f.id)
                      }
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      {deletingFileIds.includes(f.id)
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* --- Remarks --- */}
      <div className="mt-4">
        <label className="font-semibold">Remarks / Notes</label>
        <textarea
          className="border p-2 rounded w-full"
          rows="3"
          value={po.remarks || ""}
          onChange={(e) =>
            setPo({ ...po, remarks: e.target.value })
          }
          placeholder="Special instructions or comments"
          disabled={submitting || saved}
        />
      </div>

      {/* ================================
          PAID STAMP (optional display)
      ================================= */}
      {po.status === "Paid" && <PaidStamp />}

      {/* --- Buttons --- */}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow"
          disabled={submitting}
        >
          Cancel
        </button>

        {!initialPo?.id && status === "Draft" && (
          <button
            type="button"
            onClick={handleSaveDraft}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
            disabled={submitting}
          >
            Save as Draft
          </button>
        )}

        {initialPo?.id && status === "Draft" && (
          <>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              disabled={submitting}
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={goToSendRFQ}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
              disabled={submitting}
            >
              Send RFQ
            </button>
          </>
        )}

        {initialPo?.id &&
          (status === "Sent RFQ" ||
            status === "Sent Revised RFQ") && (
            <>
              <button
                type="button"
                onClick={markOrdered}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded shadow"
                disabled={submitting}
              >
                Mark As Ordered
              </button>

              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                disabled={submitting}
              >
                Save Changes
              </button>
            </>
          )}

        {initialPo?.id && status === "Ordered" && (
          <>
            <button
              type="button"
              onClick={markReceived}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              disabled={submitting}
            >
              Mark As Received
            </button>

            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              disabled={submitting}
            >
              Save Changes
            </button>
          </>
        )}

        {initialPo?.id &&
          (status === "Received" ||
            status === "Cancelled") && (
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
              disabled={submitting}
            >
              Save Changes
            </button>
          )}
      </div>
    </form>
  );
}
