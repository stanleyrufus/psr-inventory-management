import React from "react";

export default function SalesOrderList({ orders, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left border">
        <thead className="bg-gray-100 text-sm text-gray-500">
          <tr>
            <th className="py-2 px-3 border">ID</th>
            <th className="py-2 px-3 border">Order Number</th>
            <th className="py-2 px-3 border">Customer</th>
            <th className="py-2 px-3 border">Email</th>
            <th className="py-2 px-3 border">Product</th>
            <th className="py-2 px-3 border">Qty</th>
            <th className="py-2 px-3 border">Unit Price</th>
            <th className="py-2 px-3 border">Total</th>
            <th className="py-2 px-3 border">Order Date</th>
            <th className="py-2 px-3 border">Delivery Date</th>
            <th className="py-2 px-3 border">Status</th>
            <th className="py-2 px-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && <tr><td className="p-4 text-center" colSpan={12}>No sales orders</td></tr>}
          {orders.map((o) => (
            <tr key={o.sales_order_id} className="border-t text-sm">
              <td className="py-2 px-3 border">{o.sales_order_id}</td>
              <td className="py-2 px-3 border">{o.order_number}</td>
              <td className="py-2 px-3 border">{o.customer_name}</td>
              <td className="py-2 px-3 border">{o.customer_email}</td>
              <td className="py-2 px-3 border">{o.product_name || o.product_id}</td>
              <td className="py-2 px-3 border">{o.quantity}</td>
              <td className="py-2 px-3 border">{o.unit_price}</td>
              <td className="py-2 px-3 border">{o.total_amount}</td>
              <td className="py-2 px-3 border">{o.order_date}</td>
              <td className="py-2 px-3 border">{o.delivery_date}</td>
              <td className="py-2 px-3 border">{o.status}</td>
              <td className="py-2 px-3 border">
                <button onClick={() => onEdit(o)} className="text-sm px-3 py-1 rounded bg-gray-100">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
