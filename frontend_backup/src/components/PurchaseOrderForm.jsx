import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import axios from "axios";

export default function PurchaseOrderForm({ existingPO, onSave }) {
  const { inventory, fetchPurchaseOrders } = useAppContext();
  const [poData, setPoData] = useState({
    supplier_name: existingPO?.supplier_name || "",
    supplier_email: existingPO?.supplier_email || "",
    order_date: existingPO?.order_date?.slice(0,10) || new Date().toISOString().slice(0,10),
    remarks: existingPO?.remarks || "",
    items: existingPO?.items || [],
    invoice_file: null,
    pay_order_file: null,
  });

  const handleChange = e => setPoData({ ...poData, [e.target.name]: e.target.value });
  const handleItemChange = (index, field, value) => {
    const newItems = [...poData.items];
    newItems[index][field] = value;
    setPoData({ ...poData, items: newItems });
  };
  const addItem = () => setPoData({ ...poData, items: [...poData.items, { part_id: "", quantity: 1 }] });
  const handleFileChange = e => setPoData({ ...poData, [e.target.name]: e.target.files[0] });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      let form = new FormData();
      form.append("supplier_name", poData.supplier_name);
      form.append("supplier_email", poData.supplier_email);
      form.append("order_date", poData.order_date);
      form.append("remarks", poData.remarks);
      poData.items.forEach((item, idx) => {
        form.append(`items[${idx}][part_id]`, item.part_id);
        form.append(`items[${idx}][quantity]`, item.quantity);
      });
      if (poData.invoice_file) form.append("invoice_file", poData.invoice_file);
      if (poData.pay_order_file) form.append("pay_order_file", poData.pay_order_file);

      if (existingPO) {
        await axios.put(`/api/purchase_orders/${existingPO.po_id}`, form);
      } else {
        await axios.post("/api/purchase_orders", form);
      }

      alert("Purchase Order saved!");
      fetchPurchaseOrders();
      onSave();
    } catch (err) {
      console.error(err);
      alert("Failed to save PO");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="supplier_name" placeholder="Supplier Name" value={poData.supplier_name} onChange={handleChange} required />
      <input name="supplier_email" placeholder="Supplier Email" value={poData.supplier_email} onChange={handleChange} required />
      <input type="date" name="order_date" value={poData.order_date} onChange={handleChange} />
      <textarea name="remarks" placeholder="Remarks" value={poData.remarks} onChange={handleChange} />

      <h4>Parts in this PO</h4>
      {poData.items.map((item, idx) => (
        <div key={idx}>
          <select value={item.part_id} onChange={e => handleItemChange(idx, "part_id", e.target.value)} required>
            <option value="">Select Part</option>
            {inventory.map(p => <option key={p.part_id} value={p.part_id}>{p.part_name} ({p.part_number})</option>)}
          </select>
          <input type="number" value={item.quantity} min="1" onChange={e => handleItemChange(idx, "quantity", e.target.value)} />
        </div>
      ))}
      <button type="button" onClick={addItem}>Add Part</button>

      <h4>Attachments</h4>
      <input type="file" name="invoice_file" onChange={handleFileChange} />
      <input type="file" name="pay_order_file" onChange={handleFileChange} />

      <button type="submit">Submit PO</button>
    </form>
  );
}
