import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const n = (v) => Number(v ?? 0);
const money = (v) => n(v).toFixed(2);

export default function PurchaseOrderForm({ initialPo, onSaved, onCancel }) {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [staffList] = useState(["Stanley Medikonda", "Pawan Kumar", "Alex Johnson"]);
  const [submitting, setSubmitting] = useState(false);

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

  // global "+ Add New Part" panel (not tied to a row)
  const [addingGlobalPart, setAddingGlobalPart] = useState(false);
  const [globalPart, setGlobalPart] = useState({
    part_number: "",
    part_name: "",
    description: "",
    current_unit_price: "",
  });

  // Normalize the initialPo items shape if editing
const normalizePo = (poData) => {
  if (!poData) return null;
  const items = (poData.items || []).map((i) => ({
    partId: i.part_id || i.id || "",
    description: i.description || i.part_name || "",
    quantity: i.quantity || 1,
    unitPrice: i.unit_price || i.current_unit_price || 0,
    totalPrice:
      (i.quantity || 1) * (i.unit_price || i.current_unit_price || 0),
    lastUnitPrice: i.last_unit_price || null,
  }));
  return { ...poData, items };
};

const [po, setPo] = useState(
  initialPo ? normalizePo(initialPo) : {
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


  // load vendors + parts
  useEffect(() => {
    axios
      .get(`${BASE}/api/vendors`)
      .then((res) => setVendors(res.data || []))
      .catch(() => setVendors([]));

    axios
      .get(`${BASE}/api/purchase_orders/support/parts`)
      .then((res) => setParts(res.data?.data || res.data || []))
      .catch(() => setParts([]));
  }, []);

  const nNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

  const recalcTotals = (items, shipping = po.shipping_charges) => {
    const subtotal = items.reduce((sum, i) => sum + nNum(i.totalPrice), 0);
    const tax_amount = (subtotal * nNum(po.tax_percent)) / 100;
    const grand_total = subtotal + tax_amount + nNum(shipping);
    setPo((prev) => ({ ...prev, subtotal, tax_amount, grand_total }));
  };

  // add a blank line item row (original behavior)
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

  //
  // ---- PER-ROW NEW PART ----
  //
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

      // update dropdown list
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

      // inject that new part into this row
      const updatedItems = [...po.items];
      updatedItems[rowIndex] = {
        ...updatedItems[rowIndex],
        partId: newPart.part_id,
        description: newPart.description || newPart.part_name || "",
        unitPrice: nNum(newPart.current_unit_price || 0),
        lastUnitPrice: newPart.last_unit_price || null,
      };
      updatedItems[rowIndex].totalPrice =
        nNum(updatedItems[rowIndex].quantity) * nNum(updatedItems[rowIndex].unitPrice);

      setPo({ ...po, items: updatedItems });
      recalcTotals(updatedItems);

      cancelNewPartForRow(rowIndex);
    } catch (err) {
      console.error("❌ Error creating new part:", err);
      alert("Failed to add new part. See console.");
    }
  };

  // select part for a row
  const handlePartSelect = (index, value) => {
    if (value === "new") {
      openNewPartFormForRow(index);
      return;
    }

    const selected = parts.find(
      (p) => p.part_id === Number(value) || p.id === Number(value)
    );

    const updatedItems = [...po.items];
    updatedItems[index].partId = value;
    updatedItems[index].description =
      selected?.description || selected?.part_name || "";
    updatedItems[index].lastUnitPrice = selected?.last_unit_price || null;
    updatedItems[index].unitPrice = nNum(selected?.current_unit_price || 0);
    updatedItems[index].totalPrice =
      nNum(updatedItems[index].quantity) * nNum(updatedItems[index].unitPrice);

    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  // update row qty/unit price
  const updateItem = (index, field, value) => {
    const updatedItems = [...po.items];
    updatedItems[index][field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updatedItems[index].totalPrice =
        nNum(updatedItems[index].quantity) * nNum(updatedItems[index].unitPrice);
    }
    setPo({ ...po, items: updatedItems });
    recalcTotals(updatedItems);
  };

  //
  // ---- GLOBAL NEW PART PANEL ----
  //
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

      // add to dropdown list
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

  //
  // ---- Vendor inline add/save ----
  //
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

  // totals helpers
  const recalcShipping = (e) => {
    const val = e.target.value;
    setPo((prev) => ({ ...prev, shipping_charges: val }));
    recalcTotals(po.items, val);
  };

  const handleFileChange = (e) => setAttachments([...e.target.files]);

  // submit PO
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    recalcTotals(po.items);

    try {
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
        subtotal: nNum(po.subtotal),
        tax_amount: nNum(po.tax_amount),
        grand_total: nNum(po.grand_total),
        items: po.items.map((i) => ({
          part_id: Number(i.partId),
          quantity: nNum(i.quantity),
          unit_price: nNum(i.unitPrice),
          total_price: nNum(i.totalPrice),
        })),
        status: po.status,
      };

      if (initialPo?.id) {
        await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, payload);
        alert("✅ PO updated successfully.");
      } else {
        const res = await axios.post(`${BASE}/api/purchase_orders`, payload);
        const poId = res.data?.po_id;

        if (poId && attachments.length) {
          const fd = new FormData();
          attachments.forEach((f) => fd.append("files", f));
          await axios.post(`${BASE}/api/purchase_orders/${poId}/upload`, fd);
        }

        alert("✅ PO created successfully.");
      }

      if (onSaved) onSaved();
    } catch (err) {
      console.error("❌ PO save error:", err);
      alert("Save failed. See console.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow max-h-[90vh] overflow-y-auto"
    >
      <h2 className="text-xl font-bold mb-4 text-blue-700">
        {initialPo ? "Edit Purchase Order" : "New Purchase Order"}
      </h2>

      {/* --- Basic Details --- */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold">PSR PO Number *</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={po.psr_po_number}
            onChange={(e) => setPo({ ...po, psr_po_number: e.target.value })}
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="font-semibold">Status</label>
          <select
            className="border p-2 rounded w-full"
            value={po.status}
            onChange={(e) => setPo({ ...po, status: e.target.value })}
            disabled={submitting}
          >
            <option value="Draft">Draft</option>
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
            disabled={submitting}
          />
        </div>

        <div>
          <label className="font-semibold">Created By *</label>
          <select
            className="border p-2 rounded w-full"
            value={po.created_by}
            onChange={(e) => setPo({ ...po, created_by: e.target.value })}
            required
            disabled={submitting}
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
            disabled={submitting}
          >
            + Add New Vendor
          </button>
        </div>

        {!addingNewVendor ? (
          <select
            className="border p-2 rounded w-full"
            value={po.vendor_id || ""}
            onChange={(e) => setPo({ ...po, vendor_id: e.target.value })}
            required
            disabled={submitting}
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
              disabled={submitting}
            />
            <input
              placeholder="Contact Name"
              className="border p-2 rounded w-full"
              value={newVendor.contact_name}
              onChange={(e) =>
                setNewVendor({ ...newVendor, contact_name: e.target.value })
              }
              disabled={submitting}
            />
            <input
              placeholder="Email"
              className="border p-2 rounded w-full"
              value={newVendor.email}
              onChange={(e) =>
                setNewVendor({ ...newVendor, email: e.target.value })
              }
              disabled={submitting}
            />
            <input
              placeholder="Phone"
              className="border p-2 rounded w-full"
              value={newVendor.phone}
              onChange={(e) =>
                setNewVendor({ ...newVendor, phone: e.target.value })
              }
              disabled={submitting}
            />

            <div className="flex gap-2">
              <input
                placeholder="City"
                className="border p-2 rounded w-full"
                value={newVendor.city}
                onChange={(e) =>
                  setNewVendor({ ...newVendor, city: e.target.value })
                }
                disabled={submitting}
              />
              <input
                placeholder="Country"
                className="border p-2 rounded w-full"
                value={newVendor.country}
                onChange={(e) =>
                  setNewVendor({ ...newVendor, country: e.target.value })
                }
                disabled={submitting}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => setAddingNewVendor(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={saveNewVendor}
                disabled={submitting}
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
            disabled={submitting}
          >
            + Add New Part
          </button>
        </div>

        {/* Global Add New Part Panel */}
        {addingGlobalPart && (
          <div className="border p-3 bg-gray-50 rounded space-y-2">
            <input
              placeholder="Part Number *"
              className="border p-2 rounded w-full"
              value={globalPart.part_number}
              onChange={(e) =>
                setGlobalPart({ ...globalPart, part_number: e.target.value })
              }
              disabled={submitting}
            />
            <input
              placeholder="Part Name"
              className="border p-2 rounded w-full"
              value={globalPart.part_name}
              onChange={(e) =>
                setGlobalPart({ ...globalPart, part_name: e.target.value })
              }
              disabled={submitting}
            />
            <input
              placeholder="Description"
              className="border p-2 rounded w-full"
              value={globalPart.description}
              onChange={(e) =>
                setGlobalPart({ ...globalPart, description: e.target.value })
              }
              disabled={submitting}
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
              disabled={submitting}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => setAddingGlobalPart(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-2 py-1 bg-green-600 text-white rounded"
                onClick={saveGlobalPart}
                disabled={submitting}
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
                      value={item.partId}
                      onChange={(e) => handlePartSelect(i, e.target.value)}
                      disabled={submitting}
                    >
                      <option value="">Select</option>
                      {parts.map((p) => (
                        <option key={p.part_id || p.id} value={p.part_id || p.id}>
                          {p.part_number}
                        </option>
                      ))}
                      <option value="new">+ Add New Part</option>
                    </select>
                    {item.description && (
                      <div className="text-xs text-gray-600 mt-1">
                        {item.description}
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
                      disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        className="px-2 py-1 bg-gray-200 rounded"
                        onClick={() => cancelNewPartForRow(i)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 bg-blue-600 text-white rounded"
                        onClick={() => saveNewPartForRow(i)}
                        disabled={submitting}
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
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  disabled={submitting}
                />
              </td>

              <td className="border p-2">
                <input
                  type="number"
                  value={item.unitPrice}
                  className="border p-1 rounded w-full"
                  onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                  disabled={submitting}
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

      {/* --- Add Existing Part Button (below table) --- */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="text-sm text-green-700 hover:underline"
          onClick={addItemRow}
          disabled={submitting}
        >
          + Add Part
        </button>
      </div>

      {/* --- Totals --- */}
      <div className="mt-6 border-t pt-4 text-right space-y-1">
        <div>Subtotal: ${money(po.subtotal)}</div>
        <div>Tax ({po.tax_percent}%): ${money(po.tax_amount)}</div>
        <div>
          Shipping: $
          <input
            type="number"
            value={po.shipping_charges}
            onChange={recalcShipping}
            className="border rounded p-1 w-20 text-right"
            disabled={submitting}
          />
        </div>
        <div className="font-bold mt-2">
          Grand Total: ${money(po.grand_total)}
        </div>
      </div>

      {/* --- Attachments --- */}
      <div className="mt-6">
        <label className="font-semibold">Attachments</label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
          disabled={submitting}
        />
      </div>

      {/* --- Remarks --- */}
      <div className="mt-4">
        <label className="font-semibold">Remarks / Notes</label>
        <textarea
          className="border p-2 rounded w-full"
          rows="3"
          value={po.remarks}
          onChange={(e) => setPo({ ...po, remarks: e.target.value })}
          placeholder="Special instructions or comments"
          disabled={submitting}
        />
      </div>

      {/* --- Buttons --- */}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded shadow"
          disabled={submitting}
        >
          Cancel
        </button>
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
            : initialPo
            ? "Update Purchase Order"
            : "Submit Purchase Order"}
        </button>
      </div>
    </form>
  );
}
