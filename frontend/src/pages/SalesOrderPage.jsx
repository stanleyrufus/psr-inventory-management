import React, { useState, useEffect } from "react";
import api from "../utils/api";
import SalesOrderForm from "../components/forms/SalesOrderForm";
import SalesOrderList from "../components/lists/SalesOrderList";

export default function SalesOrderPage() {
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.fetchSalesOrders().then(setOrders).catch(console.error);
  }, []);

  const openNew = () => setEditing({});
  const edit = (order) => setEditing(order);
  const onSaved = () => {
    api.fetchSalesOrders().then(setOrders);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Sales Orders</h2>
          <p className="text-sm text-gray-500">Manage customer orders</p>
        </div>
        <div>
          <button onClick={openNew} className="bg-psr-accent text-white px-4 py-2 rounded">Add Sales Order</button>
        </div>
      </div>

      <div className="card p-4">
        <SalesOrderList orders={orders} onEdit={edit} />
      </div>

      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded w-full max-w-4xl">
            <SalesOrderForm initial={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
