import React, { useState } from "react";

const InventoryManualPage = () => {
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    itemId: "",
    description: "",
    width: "",
    length: "",
    weight: "",
    price: "",
    um: "",
    extension: "",
    tax: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Form submitted: " + JSON.stringify(formData));
    console.log(formData);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manual Inventory Entry</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {Object.keys(formData).map((key) => (
          <input
            key={key}
            name={key}
            type={key === "quantity" || key === "extension" ? "number" : "text"}
            value={formData[key]}
            onChange={handleChange}
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            className="border rounded px-2 py-1 w-full sm:w-1/2 md:w-1/3"
          />
        ))}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default InventoryManualPage;
