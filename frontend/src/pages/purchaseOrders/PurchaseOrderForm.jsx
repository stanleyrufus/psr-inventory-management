import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const n = (v) => Number(v ?? 0);
const money = (v) => n(v).toFixed(2);

export default function PurchaseOrderForm({ initialPo }) {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [staffList] = useState(["Stanley Medikonda", "Pawan Kumar", "Alex Johnson"]);
  const [addingNewSupplier, setAddingNewSupplier] = useState(false);

  // ✅ Initialize with passed-in PO (Edit mode) or blank (New)
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

  useEffect(() => {
    if (initialPo) {
      setPo({
        ...initialPo,
        items: initialPo.items || [],
      });
    }
  }, [initialPo]);

  // ✅ NEW: Load attachments if editing an existing PO
  useEffect(() => {
    if (initialPo?.files) {
      setAttachments(initialPo.files);
    }
  }, [initialPo]);

  // ✅ Load suppliers and parts
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
    const subtotal = items.reduce((sum, i) => sum + n(i.totalPrice), 0);
    const tax_amount = (subtotal * n(po.tax_percent)) / 100;
    const grand_total = subtotal + tax_amount + n(shipping);
    setPo((prev) => ({ ...prev, subtotal, tax_amount, grand_total }));
  };

  const handlePartSelect = (index, partId) => {
    const selected = parts.find(
      (p) => p.part_id === Number(partId) || p.id === Number(partId)
    );
    const updatedItems = [...po.items];
    updatedItems[index].partId = partId;
    updatedItems[index].description = selected ? selected.description : "";
    updatedItems[index].unitPrice = selected ? n(selected.unit_price) : 0;
    updatedItems[index].totalPrice =
      n(updatedItems[index].quantity) * n(updatedItems[index].unitPrice);
    recalcTotals(updatedItems);
    setPo({ ...po, items: updatedItems });
  };

  const updateItem = (index, field, value) => {
    const items = [...po.items];
    items[index][field] = value;
    if (field === "quantity" || field === "unitPrice") {
      const qty = n(items[index].quantity);
      const price = n(items[index].unitPrice);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    recalcTotals(po.items);
    await new Promise((r) => setTimeout(r, 0));

    if (n(po.grand_total) <= 0) {
      alert("Please verify that item totals are entered correctly before submitting.");
      return;
    }

    try {
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
        return;
      }

      const payload = {
        psr_po_number: po.psr_po_number,
        order_date: po.order_date,
        expected_delivery_date: po.expected_delivery_date,
        created_by: po.created_by,
        supplier_id: Number(supplierId),
        payment_method: po.payment_method,
        payment_terms: po.payment_terms,
        currency: po.currency,
        remarks: po.remarks,
        tax_percent: n(po.tax_percent),
        shipping_charges: n(po.shipping_charges),
        subtotal: n(po.subtotal),
        tax_amount: n(po.tax_amount),
        grand_total: n(po.grand_total),
        items: po.items.map((i) => ({
          part_id: Number(i.partId),
          quantity: n(i.quantity),
          unit_price: n(i.unitPrice),
          total_price: n(i.totalPrice),
        })),
        status: po.status || "Draft",
      };

      // ✅ Create or Update based on Edit mode
      if (initialPo?.id) {
        await axios.put(`${BASE}/api/purchase_orders/${initialPo.id}`, payload);
        alert(`✅ Purchase Order ${payload.psr_po_number} updated successfully!`);
      } else {
        const res = await axios.post(`${BASE}/api/purchase_orders`, payload);
        const poId = res.data.po_id;

        if (attachments.length > 0) {
          const formData = new FormData();
          attachments.forEach((file) => formData.append("files", file));
          await axios.post(`${BASE}/api/purchase_orders/${poId}/upload`, formData);
        }

        alert(`✅ Purchase Order ${payload.psr_po_number} created successfully!`);
      }

      navigate("/purchase-orders");
    } catch (err) {
      console.error("❌ Error saving PO:", err);
      alert("❌ Failed to save PO. See console for details.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen overflow-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        {initialPo ? "Edit Purchase Order" : "New Purchase Order"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
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
            />
          </div>
          <div>
            <label className="font-semibold">Expected Delivery Date</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={po.expected_delivery_date || ""}
              onChange={(e) => setPo({ ...po, expected_delivery_date: e.target.value })}
            />
          </div>
          <div>
            <label className="font-semibold">Created By *</label>
            <select
              className="border p-2 rounded w-full"
              value={po.created_by}
              onChange={(e) => setPo({ ...po, created_by: e.target.value })}
              required
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
            />
          </div>
        </div>

        {/* --- Items Table --- */}
        <h2 className="text-lg font-semibold mb-2">Order Items</h2>
        <table className="w-full border mb-4 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Part Number</th>
              <th className="p-2 border">Description</th>
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
                  >
                    <option value="">Select</option>
                    {parts.map((p) => (
                      <option key={p.part_id || p.id} value={p.part_id || p.id}>
                        {p.part_number}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="border p-1 rounded w-full"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="border p-1 rounded w-full"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                  />
                </td>
                <td className="border p-2 text-right">${money(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded"
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
            />
          </div>
          <div className="font-bold mt-2">Grand Total: ${money(po.grand_total)}</div>
        </div>

        {/* --- Attachments --- */}
        <div className="mt-6">
          <label className="font-semibold">Attachments</label>

          {/* ✅ Show existing attachments in edit mode */}
          {initialPo?.files && initialPo.files.length > 0 && (
            <ul className="list-disc pl-6 mb-2">
              {initialPo.files.map((f) => (
                <li key={f.id}>
                  <a
                    href={`${BASE}${f.filepath.startsWith("/") ? "" : "/"}${f.filepath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {f.original_filename} ({f.mime_type}, {f.size_bytes} bytes)
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* ✅ Allow adding new attachments */}
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="border p-2 rounded w-full"
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
          />
        </div>

        {/* --- Buttons --- */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => navigate("/purchase-orders")}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
          >
            {initialPo ? "Update Purchase Order" : "Submit Purchase Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
