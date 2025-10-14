// src/pages/inventory/InventoryUploadPage.jsx
import React, { useState } from "react";
import InventoryUpload from "../../components/InventoryUpload";
import { useNavigate } from "react-router-dom";

export default function InventoryUploadPage() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleUpload = (data, file) => {
    setMessage("");

    try {
      if (!Array.isArray(data) || data.length === 0) {
        setMessage("❌ No valid data found in the uploaded file.");
        return;
      }

      // ===========================
      // CLEAN BULK DATA
      // ===========================
      const cleanedData = data
        .map((row) => {
          const newRow = {};
          Object.entries(row).forEach(([key, value]) => {
            // Replace line breaks and invisible spaces, trim
            const cleanedValue =
              value !== null && value !== undefined
                ? value.toString().replace(/[\r\n\u00A0]+/g, " ").trim()
                : "";
            newRow[key.trim()] = cleanedValue;
          });
          return newRow;
        })
        // Remove any row where all values are empty
        .filter((row) =>
          Object.values(row).some((val) => val && val.toString().trim() !== "")
        );

      if (cleanedData.length === 0) {
        setMessage("❌ Uploaded file contains no valid rows.");
        return;
      }

      // ===========================
      // LOAD EXISTING INVENTORY
      // ===========================
      const existingRaw = localStorage.getItem("psr_inventory");
      const existingData = existingRaw ? JSON.parse(existingRaw) : [];

      // ===========================
      // MERGE NEW ENTRIES AT TOP
      // ===========================
      const updatedData = [...cleanedData, ...existingData];

      // ===========================
      // SAVE TO LOCAL STORAGE
      // ===========================
      localStorage.setItem("psr_inventory", JSON.stringify(updatedData));

      setMessage(`✅ Successfully uploaded ${cleanedData.length} rows from "${file.name}"`);

      // Navigate back to inventory after 1.5s
      setTimeout(() => navigate("/inventory"), 1500);
    } catch (error) {
      console.error("Upload failed:", error);
      setMessage("❌ Upload failed. Please check your file and try again.");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Bulk Upload Inventory</h2>

      <InventoryUpload onUpload={handleUpload} />

      {message && (
        <div
          className={`mt-4 p-3 rounded-md ${
            message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
