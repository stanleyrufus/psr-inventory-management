import { useEffect, useState } from "react";
import axios from "axios";
import PartForm from "./PartForm";

export default function InventoryList() {
  const [parts, setParts] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchParts = async () => {
    try {
      const res = await axios.get("/api/inventory");
      setParts(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch parts");
    }
  };

  useEffect(() => { fetchParts(); }, []);

  return (
    <div>
      <h2>Inventory Parts</h2>
      {editing && <PartForm existingPart={editing} onSave={() => { setEditing(null); fetchParts(); }} />}
      <ul>
        {parts.map(p => (
          <li key={p.part_id}>
            {p.part_name} ({p.part_number}) - {p.quantity_on_hand} pcs
            <button onClick={() => setEditing(p)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
