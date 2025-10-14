import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import PurchaseOrderForm from "./PurchaseOrderForm";

export default function PurchaseOrderList() {
  const { purchaseOrders, fetchPurchaseOrders } = useAppContext();
  const [editingPO, setEditingPO] = useState(null);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return (
    <div>
      <h2>Purchase Orders</h2>
      {editingPO && (
        <PurchaseOrderForm
          existingPO={editingPO}
          onSave={() => { setEditingPO(null); fetchPurchaseOrders(); }}
        />
      )}
      <ul>
        {purchaseOrders.map((po) => (
          <li key={po.po_id}>
            PO#{po.po_id} - {po.supplier_name} - {po.status} - {po.order_date?.slice(0,10)}
            <button onClick={() => setEditingPO(po)}>Edit / View</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
