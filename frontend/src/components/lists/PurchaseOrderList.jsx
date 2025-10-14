import React from "react";

export default function PurchaseOrderList({ data = [], onEdit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <table className="min-w-full text-left text-sm">
        <thead className="text-gray-500 bg-gray-100">
          <tr>
            <th className="py-2 px-3">ID</th>
            <th className="py-2 px-3">PO Number</th>
            <th className="py-2 px-3">Supplier</th>
            <th className="py-2 px-3">Part</th>
            <th className="py-2 px-3">Qty</th>
            <th className="py-2 px-3">Unit Price</th>
            <th className="py-2 px-3">Total</th>
            <th className="py-2 px-3">Order Date</th>
            <th className="py-2 px-3">Delivery Date</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && <tr><td colSpan={11} className="p-4">No Purchase Orders</td></tr>}
          {data.map((po) => (
            <tr key={po.purchase_order_id} className="border-t">
              <td className="py-2 px-3">{po.purchase_order_id}</td>
              <td className="py-2 px-3">{po.order_number}</td>
              <td className="py-2 px-3">{po.supplier_name}</td>
              <td className="py-2 px-3">{po.part_name || po.part_id}</td>
              <td className="py-2 px-3">{po.quantity}</td>
              <td className="py-2 px-3">{po.unit_price}</td>
              <td className="py-2 px-3">{po.total_amount}</td>
              <td className="py-2 px-3">{po.order_date?.slice(0, 10)}</td>
              <td className="py-2 px-3">{po.delivery_date?.slice(0, 10)}</td>
              <td className="py-2 px-3">{po.status}</td>
              <td className="py-2 px-3">
                <button onClick={() => onEdit(po)} className="text-sm px-3 py-1 rounded bg-gray-100">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
