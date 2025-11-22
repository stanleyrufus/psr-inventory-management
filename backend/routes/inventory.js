import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
// Kept in case you later want to use for direct file links
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
  const [staffList] = useState([
    "Shiney Ramnarain",
    "Brian Ramnarain",
    "Dave Ramnarain",
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false); // still used for disabling UI if needed

  // existing uploaded files
  const [existingFiles, setExistingFiles] = useState(initialPo?.files || []);
  const [deletingFileIds, setDeletingFileIds] = useState([]);

  useEffect(() => {
    setExistingFiles(initialPo?.files || []);
  }, [initialPo]);

  // inline vendor "add new vendor" state
  const [addingNewVendor, setAddingNewVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    country: "",
  });

  // per-row "add new part for this row"
  const [addingNewPartRow, setAddingNewPartRow] = useState({});
  const [newPartDraft, setNewPartDraft] = useState({});

  // global "+ Add New Part" panel
  const [addingGlobalPart, setAddingGlobalPart] = useState(false);
  const [globalPart, setGlobalPart] = useState({
    part_number: "",
    part_name: "",
    description: "",
    current_unit_price: "",
  });

  const toDateOnly = (val) => (val ? String(val).slice(0, 10) : "");

  // Normalize the initialPo items shape if editing
  const normalizePo = (poData) => {
    if (!poData) return null;
    const items = (poData.items || []).map((i) => ({
      partId: i.part_id || i.id || "",
      description: i.description || i.part_name || "",
      quantity: i.quantity || 1,
      unitPrice: i.unit_price || i.current_unit_price || 0,
      totalPrice: (i.quantity || 1) * (i.unit_price || i.current_unit_price || 0),
      lastUnitPrice: i.last_unit_price || null,
    }));
    return {
      ...poData,
      order_date: toDateOnly(poData.order_date),
      expected_delivery_date: toDateOnly(poData.expected_delivery_date),
      status: poData.status || "Draft", // ✅ avoid null status
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
          tax_percent: 8,
          shipping_charges: 0,
          items: [],
          subtotal: 0,
          tax_amount: 0,
          grand_total: 0,
          status: "Draft",
        }
  );

  const isNew = !initialPo?.id;
  const isEditingDraft = !!initialPo?.id && (initialPo.status === "Draft");
  const isEditingCreated = !!initialPo?.id && initialPo.status !== "Draft";

  // Which buttons should show
  const showSaveDraft = isNew || isEditingDraft;
  const showCreatePO = isNew || isEditingDraft;
  const showUpdatePO = isEditingCreated;

  // load vendors + parts
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
      alert("Failed to add new part. See console.");
    }
  };

  // ✅ PART SELECTION
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
      totalPrice:
        nNum(updatedItems[index].quantity) *
        (selected.last_unit_price
          ? nNum(selected.last_unit_price)
          : selected.current_unit_price
          ? nNum(selected.current_unit_price)
          : nNum(updatedItems[index].unitPrice || 0)),
    };

    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  // update row qty/unit price
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

  // ---- GLOBAL NEW PART PANEL ----
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

      alert("✅ Part added successfully.");
    } catch (err) {
      console.error("❌ Global part add error:", err);
      alert("Error adding part.");
    }
  };

  // ---- Vendor inline add/save ----
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

  // delete a single existing file
  const handleDeleteFile = async (fileId) => {
    if (!initialPo?.id) return;
    const confirm = window.confirm("Delete this attachment?");
    if (!confirm) return;

    try {
      setDeletingFileIds((prev) => [...prev, fileId]);
      await axios.delete(
        `${BASE}/api/purchase_orders/${initialPo.id}/file/${fileId}`
      );
      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error("❌ File delete error:", err);
      alert("Failed to delete file. See console.");
    } finally {
      setDeletingFileIds((prev) => prev.filter((id) => id !== fileId));
    }
  };

  // 2️⃣ / 3️⃣ Save as Draft – new OR existing Draft
  const handleSaveDraft = async () => {
    if (submitting) return;

    if (!po.psr_po_number?.trim()) {
      alert("PO Number is required to save a draft.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        psr_po_number: po.psr_po_number,
        status: "Draft",
        remarks: po.remarks || "",
        created_by: po.created_by || null,
        vendor_id: po.vendor_id || null,
        order_date: po.order_date || null,
        expected_delivery_date: po.expected_delivery_date || null,
        // for drafts we do NOT require items; backend should allow this
        items: [],
        subtotal: po.subtotal || 0,
        tax_amount: po.tax_amount || 0,
        grand_total: po.grand_total || 0,
      };

      if (isNew) {
        // new draft
        await axios.post(`${BASE}/api/purchase_orders`, payload);
      } else if (isEditingDraft) {
        // update existing draft
        await axios.put(
          `${BASE}/api/purchase_orders/${initialPo.id}`,
          payload
        );
      } else {
        alert("Save as Draft is only for new POs or Draft POs.");
        setSubmitting(false);
        return;
      }

      alert("✅ Draft saved successfully.");
      navigate("/purchase-orders");
    } catch (err) {
      console.error("❌ Draft save error:", err);
      alert("Failed to save draft. See console.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4️⃣ / 5️⃣ Create / Update PO (non-draft path)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    // --- Validations only for REAL POs (Create / Update) ---
    if (!po.psr_po_number?.trim()) {
      alert("PO Number is required.");
      setSubmitting(false);
      return;
    }

    if (!po.vendor_id) {
      alert("Vendor is required.");
      setSubmitting(false);
      return;
    }

    if (!po.created_by) {
      alert("Created By is required.");
      setSubmitting(false);
      return;
    }

    if (!po.items || po.items.length === 0) {
      alert("At least one Part must be added to the Purchase Order.");
      setSubmitting(false);
      return;
    }

    for (let i of po.items) {
      if (!i.partId) {
        alert("Each line item must have a selected Part.");
        setSubmitting(false);
        return;
      }
      if (!i.quantity || Number(i.quantity) <= 0) {
        alert("Quantity must be greater than 0.");
        setSubmitting(false);
        return;
      }
      if (
        i.unitPrice === "" ||
        i.unitPrice === null ||
        Number(i.unitPrice) <= 0
      ) {
        alert(
          "Unit Price is required and must be greater than 0 for all items."
        );
        setSubmitting(false);
        return;
      }
    }

    // compute totals fresh for payload
    const itemsForPayload = po.items.map((i) => ({
      part_id: Number(i.partId),
      quantity: nNum(i.quantity),
      unit_price: nNum(i.unitPrice),
      total_price: nNum(i.totalPrice),
    }));

    const subtotal = itemsForPayload.reduce(
      (sum, i) => sum + nNum(i.total_price),
      0
    );
    const tax_amount = (subtotal * nNum(po.tax_percent)) / 100;
    const grand_total =
      subtotal + tax_amount + nNum(po.shipping_charges || 0);

    // Update local totals for UI (won't really matter since we navigate)
    setPo((prev) => ({
      ...prev,
      subtotal,
      tax_amount,
      grand_total,
    }));

    // Duplicate check:
    try {
      if (isNew) {
        const exists = await axios
          .get(
            `${BASE}/api/purchase_orders/check-number/${po.psr_po_number}`
          )
          .then((res) => res.data.exists)
          .catch(() => false);
        if (exists) {
          alert(
            "This PO Number already exists. Please use a unique PO Number."
          );
          setSubmitting(false);
          return;
        }
      } else {
        // editing: use excludeId to allow same number on this row
        const exists = await axios
          .get(
            `${BASE}/api/purchase_orders/check-number/${po.psr_po_number}`,
            { params: { excludeId: initialPo.id } }
          )
          .then((res) => res.data.exists)
          .catch(() => false);
        if (exists) {
          alert(
            "This PO Number already exists for another PO. Please use a unique PO Number."
          );
          setSubmitting(false);
          return;
        }
      }
    } catch {
      // if check fails silently, backend still enforces unique
    }

    // Decide final status for this action
    let finalStatus;
    if (isNew || isEditingDraft) {
      // "Create PO" from new or draft
      finalStatus = "Created";
    } else {
      // editing existing created/sent/etc – keep what user selected
      finalStatus = po.status || initialPo.status || "Created";
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
      tax_percent: nNum(po.tax_percent),
      shipping_charges: nNum(po.shipping_charges),
      subtotal,
      tax_amount,
      grand_total,
      items: itemsForPayload,
      status: finalStatus,
    };

    try {
      if (isNew) {
        // CREATE
        const res = await axios.post(`${BASE}/api/purchase_orders`, payload);
        const poId = res.data?.po_id;

        if (poId && attachments.length) {
          const fd = new FormData();
          attachments.forEach((f) => fd.append("files", f));
          await axios.post(
            `${BASE}/api/purchase_orders/${poId}/upload`,
            fd
          );
        }

        alert("✅ PO created successfully.");
      } else {
        // UPDATE
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

        if (isEditingDraft) {
          alert("✅ Draft converted to Created PO successfully.");
        } else {
          alert("✅ PO updated successfully.");
        }
      }

      setSaved(true);
      if (onSaved) onSaved();
      navigate("/purchase-orders");
    } catch (err) {
      console.error("❌ PO save error:", err);
      alert("Save failed. See console.");
    } finally {
      setSubmitting(false);
    }
  };

  const formScrollClasses = isModal ? "" : "max-h[90vh] overflow-y-auto";

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white p-6 rounded shadow ${formScrollClasses}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-700">
          {isNew
            ? "New Purchase Order"
            : isEditingDraft
            ? "Edit Draft Purchase Order"
            : "Edit Purchase Order"}
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

      {/* Basic Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold">PSR PO Number *</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={po.psr_po_number}
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
            value={po.status || "Draft"}
            onChange={(e) => setPo({ ...po, status: e.target.value })}
            disabled={submitting || saved}
          >
            <option value="Draft">Draft</option>
            <option value="Created">Created</option>
            <option value="Sent">Sent</option>
            <option value="Closed">Closed</option>
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
          <label className="font-semibold">Created By *</label>
          <select
            className="border p-2 rounded w-full"
            value={po.created_by || ""}
            onChange={(e) =>
              setPo({ ...po, created_by: e.target.value })
            }
            disabled={submitting || saved}
          >
            <option value="">Select</option>
            {staffList.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendor */}
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
          <select
            className="border p-2 rounded w-full"
            value={po.vendor_id || ""}
            onChange={(e) =>
              setPo({ ...po, vendor_id: e.target.value })
            }
            disabled={submitting || saved}
          >
            <option value="">Select Vendor</option>
            {vendors.map((v) => (
              <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                {v.vendor_name || v.name}
              </option>
            ))}
          </select>
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

      {/* Order Items header */}
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

      {/* Items table */}
      <table className="w-full border mb-4 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">Part</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Unit Price</th>
            <th className="p-2 border text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, i) => (
            <tr key={i}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">
                {!addingNewPartRow[i] ? (
                  <>
                    <select
                      className="border p-1 rounded w-full"
                      value={item.partId || ""}
                      onChange={(e) =>
                        handlePartSelect(i, e.target.value)
                      }
                      disabled={submitting || saved}
                    >
                      <option value="">Select</option>
                      {parts.map((p) => (
                        <option
                          key={p.part_id || p.id}
                          value={p.part_id || p.id}
                        >
                          {p.part_number}
                        </option>
                      ))}
                      <option value="new">+ Add New Part</option>
                    </select>

                    {item.partId && (
                      <div className="text-xs text-gray-500 mt-1">
                        {parts.find(
                          (p) =>
                            String(p.part_id) === String(item.partId)
                        )?.description || "No description available"}
                      </div>
                    )}
                  </>
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
                      value={newPartDraft[i]?.current_unit_price || ""}
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
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add part below table */}
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

      {/* Totals */}
      <div className="mt-6 border-t pt-4 text-right space-y-1">
        <div>Subtotal: ${money(po.subtotal)}</div>
        <div>Tax ({po.tax_percent}%): ${money(po.tax_amount)}</div>
        <div>
          Shipping:{" "}
          <input
            type="number"
            value={po.shipping_charges}
            onChange={recalcShipping}
            className="border rounded p-1 w-24 text-right"
            disabled={submitting || saved}
          />
        </div>
        <div className="font-bold mt-2">
          Grand Total: ${money(po.grand_total)}
        </div>
      </div>

      {/* Attachments */}
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

      {existingFiles.length > 0 && (
        <div className="mt-2 border p-3 bg-gray-50 rounded">
          <p className="font-semibold mb-1 text-gray-700">
            Existing Attachments:
          </p>
          <ul className="list-disc pl-6 text-sm space-y-1">
            {existingFiles.map((f) => (
              <li key={f.id || f.filepath} className="flex items-center gap-3">
                <a
                  href={`${
                    import.meta.env.VITE_API_URL || "http://localhost:5000"
                  }${f.filepath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {f.original_filename || "File"} ({f.mime_type || ""},{" "}
                  {f.size_bytes?.toLocaleString() || 0} bytes)
                </a>
                {initialPo?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(f.id)}
                    disabled={
                      submitting || deletingFileIds.includes(f.id)
                    }
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    {deletingFileIds.includes(f.id)
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Remarks */}
      <div className="mt-4">
        <label className="font-semibold">Remarks / Notes</label>
        <textarea
          className="border p-2 rounded w-full"
          rows="3"
          value={po.remarks}
          onChange={(e) =>
            setPo({ ...po, remarks: e.target.value })
          }
          placeholder="Special instructions or comments"
          disabled={submitting || saved}
        />
      </div>

      {/* Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow"
          disabled={submitting}
        >
          Cancel
        </button>

        {/* Save as Draft – only for NEW or DRAFT */}
        {showSaveDraft && (
          <button
            type="button"
            onClick={handleSaveDraft}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
            disabled={submitting}
          >
            Save as Draft
          </button>
        )}

        {/* Create / Update */}
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 rounded shadow text-white ${
            submitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {submitting
            ? "Saving..."
            : isNew || isEditingDraft
            ? "Create PO"
            : "Update PO"}
        </button>
      </div>
    </form>
  );
}
