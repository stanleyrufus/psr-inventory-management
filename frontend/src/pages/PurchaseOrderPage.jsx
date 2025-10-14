import React, { useEffect, useState } from "react";
import api from "../utils/api";
import PurchaseOrderForm from "../components/forms/PurchaseOrderForm";
import PurchaseOrderList from "../components/lists/PurchaseOrderList";

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);

  const loadOrders = () => api.fetchPurchaseOrders().then(setOrders).catch(console.error);

  useEffect(() => {
    loadOrders();
  }, []);

  const onSaved = () => {
    loadOrders();
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Purchase Orders</h2>
          <p className="text-sm text-gray-500">Manage parts procurement</p>
        </div>
        <div>
          <button onClick={() => setEditing({})} className="bg-psr-accent text-white px-4 py-2 rounded">Add PO</button>
        </div>
      </div>

      <PurchaseOrderList data={orders} onEdit={setEditing} />

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded w-full max-w-3xl">
            <PurchaseOrderForm initial={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
