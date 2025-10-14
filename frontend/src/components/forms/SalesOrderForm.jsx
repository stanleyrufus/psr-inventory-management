import React, { useState, useEffect } from "react";
import api from "../../utils/api";

export default function SalesOrderForm({ initial = {}, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    order_number: initial.order_number || "",
    customer_name: initial.customer_name || "",
    customer_email: initial.customer_email || "",
    product_id: initial.product_id || "",
    quantity: initial.quantity || 1,
    unit_price: initial.unit_price || 0,
    delivery_date: initial.delivery_date || "",
    status: initial.status || "Pending",
    remarks: initial.remarks || "",
  });

  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.fetchProducts().then(setProducts).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (initial.sales_order_id) {
        await api.updateSalesOrder(initial.sales_order_id, formData);
      } else {
        await api.createSalesOrder(formData);
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save sales order:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4 mb-6">
      <h2 className="font-semibold mb-3">{initial.sales_order_id ? "Edit" : "Add"} Sales Order</h2>
      <div className="grid grid-cols-2 gap-4">
        <input name="order_number" placeholder="Order Number" className="border p-2 rounded" value={formData.order_number} onChange={handleChange} />
        <input name="customer_name" placeholder="Customer Name" className="border p-2 rounded" value={formData.customer_name} onChange={handleChange} />
        <input name="customer_email" placeholder="Customer Email" type="email" className="border p-2 rounded" value={formData.customer_email} onChange={handleChange} />
        <select name="product_id" className="border p-2 rounded" value={formData.product_id} onChange={handleChange}>
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
          ))}
        </select>
        <input name="quantity" type="number" placeholder="Quantity" className="border p-2 rounded" value={formData.quantity} onChange={handleChange} />
        <input name="unit_price" type="number" placeholder="Unit Price" className="border p-2 rounded" value={formData.unit_price} onChange={handleChange} />
        <input name="delivery_date" type="date" className="border p-2 rounded" value={formData.delivery_date} onChange={handleChange} />
        <select name="status" className="border p-2 rounded" value={formData.status} onChange={handleChange}>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <textarea name="remarks" placeholder="Remarks" className="border p-2 rounded col-span-2" value={formData.remarks} onChange={handleChange}></textarea>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="bg-psr-primary text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
        <button type="button" onClick={onCancel} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
      </div>
    </form>
  );
}
