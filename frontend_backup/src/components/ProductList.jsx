import { useEffect, useState } from "react";
import axios from "axios";
import ProductForm from "./ProductForm";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  useEffect(() => { fetchProducts(); }, []);

  return (
    <div>
      <h2>Machines</h2>
      {editing && <ProductForm existingProduct={editing} onSave={() => { setEditing(null); fetchProducts(); }} />}
      <ul>
        {products.map(p => (
          <li key={p.machine_id}>
            {p.name} - {p.category}
            <button onClick={() => setEditing(p)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
