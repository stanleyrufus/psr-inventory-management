import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import PurchaseOrderForm from "./PurchaseOrderForm";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PurchaseOrderEdit() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load the existing PO by ID
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${BASE}/api/purchase_orders/${id}`);
        setPo(res.data || null);
      } catch (err) {
        console.error("❌ Failed to load PO for edit:", err);
        setPo(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  if (!po) {
    return (
      <div className="p-6">
        <div className="mb-4 text-red-600">PO not found.</div>
        <Link className="text-blue-700 hover:underline" to="/purchase-orders">
          ← Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">Edit Purchase Order</h1>
        <Link to="/purchase-orders" className="text-blue-700 hover:underline">
          ← Back to list
        </Link>
      </div>

      {/* ✅ Pass the loaded PO to the form */}
      <PurchaseOrderForm initialPo={po} />
    </div>
  );
}
