import { useEffect, useState } from "react";
import axios from "axios";
import SalesOrderForm from "./SalesOrderForm";

export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchOrders = async () => {
    const res = await axios.get("/api/sales_orders");
    setOrders(res.data);
  };

  useEffect(() => { fetchOrders(); }, []);

  return (
    <div>
      <h2>Sales Orders</h2>
      {editing && <SalesOrderForm existingOrder={editing} onSave={() => { setEditing(null); fetchOrders(); }} />}
      <ul>
        {orders.map(o => (
          <li key={o.order_id}>
            {o.customer_name} - {o.status} - {o.total_amount}
            <button onClick={() => setEditing(o)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
