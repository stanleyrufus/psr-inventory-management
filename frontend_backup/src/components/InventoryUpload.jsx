// src/components/InventoryUpload.jsx
import React from "react";
import * as XLSX from "xlsx";

export default function InventoryUpload({ onUpload }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary" });

        // Read first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        // Notify parent component
        if (typeof onUpload === "function") {
          onUpload(jsonData, file);
        }
      } catch (err) {
        console.error("File parsing error:", err);
        if (typeof onUpload === "function") {
          onUpload([], file); // return empty array to handle errors
        }
      }
    };

    reader.readAsBinaryString(file);

    // Clear input to allow re-upload of same file
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="inventoryFile"
        className="text-sm font-semibold text-gray-700"
      >
        Choose File
      </label>
      <input
        id="inventoryFile"
        type="file"
        accept=".xlsx,.csv"
        onChange={handleFileChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
      />
    </div>
  );
}
