import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const n = (v) => Number(v ?? 0);
const money = (v) => n(v).toFixed(2);

export default function PurchaseOrderForm({ initialPo, onSaved, onCancel }) {
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [staffList] = useState(["Stanley Medikonda", "Pawan Kumar", "Alex Johnson"]);
  const [addingNewSupplier, setAddingNewSupplier] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [po, setPo] = useState(
    initialPo
      ? { ...initialPo, items: initialPo.items || [] }
      : {
          psr_po_number: "",
          order_date: new Date().toISOString().split("T")[0],
          expected_delivery_date: "",
          created_by: "",
          supplier_id: "",
          supplier_name: "",
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

  // ✅ Load dropdowns
  useEffect(() => {
    axios
      .get(`${BASE}/api/suppliers`)
      .then((res) => setSuppliers(res.data || []))
      .catch(() => setSuppliers([]));

    axios
      .get(`${BASE}/api/parts`)
      .then((res) => setParts(res.data || []))
      .catch(() => setParts([]));
  }, []);

  const nNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

  const addItem = () => {
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
        },
      ],
    }));
  };

  const recalcTotals = (items, shipping = po.shipping_charges) => {
    const subtotal = items.reduce((sum, i) => sum + nNum(i.totalPrice), 0);
    const tax_amount = (subtotal * nNum(po.tax_percent)) / 100;
    const grand_total = subtotal + tax_amount + nNum(shipping);
    setPo((prev) => ({ ...prev, subtotal, tax_amount, grand_total }));
  };

  const handlePartSelect = (index, partId) => {
    const selected = parts.find(
      (p) => p.part_id === Number(partId) || p.id === Number(partId)
    );
    const updatedItems = [...po.items];
    updatedItems[index].partId = partId;
    updatedItems[index].description = selected ? selected.description : "";
    updatedItems[index].unitPrice = selected ? nNum(selected.unit_price) : 0;
    updatedItems[index].totalPrice =
      nNum(updatedItems[index].quantity) * nNum(updatedItems[index].unitPrice);
    recalcTotals(updatedItems);
    setPo({ ...po, items: updatedItems });
  };

  const updateItem = (index, field, value) => {
    const items = [...po.items];
    items[index][field] = value;
    if (field === "quantity" || field === "unitPrice") {
      const qty = nNum(items[index].quantity);
      const price = nNum(items[index].unitPrice);
      items[index].totalPrice = qty * price;
    }
    recalcTotals(items);
    setPo({ ...po, items });
  };

  const handleSupplierChange = (e) => {
    const val = e.target.value;
    if (val === "new") {
      setAddingNewSupplier(true);
      setPo({ ...po, supplier_id: "", supplier_name: "" });
    } else {
      setAddingNewSupplier(false);
      setPo({ ...po, supplier_id: val, supplier_name: "" });
    }
  };

  const handleShippingChange = (e) => {
    const val = e.target.value;
    setPo((prev) => ({ ...prev, shipping_charges: val }));
    recalcTotals(po.items, val);
  };

  const handleFileChange = (e) => {
    setAttachments([...e.target.files]);
  };

  // ✅ Corrected handleSubmit: prevents multiple submits & closes modal after success
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // avoid duplicate submits
    setSubmitting(true);
    recalcTotals(po.items);

    try {
      if (nNum(po.grand_total) <= 0) {
        alert("Please verify that item totals are entered correctly before submitting.");
        setSubmitting(false);
        return;
      }

      let supplierId = po.supplier_id;
      if (addingNewSupplier && (po.supplier_name || "").trim() !== "") {
        const supplierRes = await axios.post(`${BASE}/api/suppliers`, {
          name: po.supplier_name,
          contact_person: po.created_by || "N/A",
          email: "unknown@psr.com",
          phone: "",
          address: "",
        });
        supplierId = supplierRes.data.id || supplierRes.data.supplier_id;
      }

      if (!supplierId) {
        alert("Please select or enter a supplier before submitting.");
        setSubmitting(false);
        return;
      }

      const payload = {
        psr_po_number: po.psr_po_number,
        order_date: po.order_date || null,
        expected_delivery_date: po.expected_delivery_date || null,
        created_by: po.created_by,
        supplier_id: Number(supplierId),
        payment_method: po.payment_method,
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
        status: po.status || "Draft",
      };

      if (initialPo?.id) {
        await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, payload);
        alert(`✅ Purchase Order ${payload.psr_po_number} updated successfully!`);
      } else {
        const res = await axios.post(`${BASE}/api/purchase_orders`, payload);
        const poId = res.data?.po_id;

        if (poId && attachments.length > 0) {
          const formData = new FormData();
          attachments.forEach((file) => formData.append("files", file));
          await axios.post(`${BASE}/api/purchase_orders/${poId}/upload`, formData);
        }

        alert(`✅ Purchase Order ${payload.psr_po_number} created successfully!`);
      }

      // ✅ Delay ensures alert closes first, then modal closes
      setTimeout(() => {
        if (onSaved) onSaved();
      }, 200);

    } catch (err) {
      console.error("❌ Error saving PO:", err);
      alert("❌ Failed to save PO. See console for details.");
    } finally {
      // keep button disabled slightly until modal closes
      setTimeout(() => setSubmitting(false), 400);
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
            placeholder="PSR-PO-1001"
            required
            disabled={submitting}
          />
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

      {/* --- Supplier Section --- */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold">Supplier *</label>
          <select
            className="border p-2 rounded w-full"
            value={po.supplier_id || (addingNewSupplier ? "new" : "")}
            onChange={handleSupplierChange}
            required
            disabled={submitting}
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="new">+ Add New Supplier</option>
          </select>

          {addingNewSupplier && (
            <input
              type="text"
              className="mt-2 border p-2 rounded w-full"
              placeholder="Enter new supplier name"
              value={po.supplier_name}
              onChange={(e) => setPo({ ...po, supplier_name: e.target.value })}
              disabled={submitting}
            />
          )}
        </div>

        <div>
          <label className="font-semibold">Payment Terms</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={po.payment_terms}
            onChange={(e) => setPo({ ...po, payment_terms: e.target.value })}
            placeholder="30 days"
            disabled={submitting}
          />
        </div>
      </div>

      {/* --- Items Table --- */}
      <h3 className="text-lg font-semibold mb-2">Order Items</h3>
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
                </select>
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
              </td>
              <td className="border p-2 text-right">
                ${money(item.totalPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addItem}
        className="bg-blue-500 text-white px-3 py-1 rounded"
        disabled={submitting}
      >
        + Add Item
      </button>

      {/* --- Totals --- */}
      <div className="mt-6 border-t pt-4 text-right space-y-1">
        <div>Subtotal: ${money(po.subtotal)}</div>
        <div>Tax ({po.tax_percent}%): ${money(po.tax_amount)}</div>
        <div>
          Shipping: $
          <input
            type="number"
            value={po.shipping_charges}
            onChange={handleShippingChange}
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
