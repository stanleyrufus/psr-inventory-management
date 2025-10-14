import React, { useState, useEffect } from "react";
import api from "../../utils/api";

export default function PurchaseOrderForm({ initial = {}, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    order_number: "",
    supplier_name: "",
    part_id: "",
    quantity: 0,
    unit_price: 0,
    total_amount: 0,
    order_date: "",
    delivery_date: "",
    status: "Pending",
    remarks: "",
    ...initial,
  });

  const [parts, setParts] = useState([]);

  useEffect(() => {
    api.fetchParts().then(setParts).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === "quantity" || name === "unit_price") {
      const qty = Number(updated.quantity) || 0;
      const price = Number(updated.unit_price) || 0;
      updated.total_amount = qty * price;
    }
    setFormData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.purchase_order_id) {
      api.updatePurchaseOrder(formData.purchase_order_id, formData).then(onSaved);
    } else {
      api.createPurchaseOrder(formData).then(onSaved);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4">
      <h2 className="font-semibold mb-3">Add / Edit Purchase Order</h2>
      <div className="grid grid-cols-2 gap-4">
        <input name="order_number" placeholder="PO Number" className="border p-2 rounded" value={formData.order_number} onChange={handleChange} required />
        <input name="supplier_name" placeholder="Supplier Name" className="border p-2 rounded" value={formData.supplier_name} onChange={handleChange} />
        <select name="part_id" className="border p-2 rounded" value={formData.part_id} onChange={handleChange} required>
          <option value="">Select Part</option>
          {parts.map((p) => (
            <option key={p.part_id} value={p.part_id}>
              {p.part_number} - {p.part_name}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" placeholder="Quantity" className="border p-2 rounded" value={formData.quantity} onChange={handleChange} />
        <input name="unit_price" type="number" placeholder="Unit Price" className="border p-2 rounded" value={formData.unit_price} onChange={handleChange} />
        <input name="total_amount" type="number" placeholder="Total Amount" className="border p-2 rounded bg-gray-100" value={formData.total_amount} readOnly />
        <input name="order_date" type="date" placeholder="Order Date" className="border p-2 rounded" value={formData.order_date?.slice(0, 10)} onChange={handleChange} />
        <input name="delivery_date" type="date" placeholder="Delivery Date" className="border p-2 rounded" value={formData.delivery_date?.slice(0, 10)} onChange={handleChange} />
        <select name="status" className="border p-2 rounded" value={formData.status} onChange={handleChange}>
          <option>Pending</option>
          <option>Received</option>
          <option>Cancelled</option>
        </select>
        <textarea name="remarks" placeholder="Remarks" className="border p-2 rounded col-span-2" value={formData.remarks} onChange={handleChange}></textarea>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-psr-accent text-white rounded">Save</button>
      </div>
    </form>
  );
}
