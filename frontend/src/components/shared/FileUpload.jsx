import React from "react";

/**
 * Very small stub to allow selecting a file in the UI.
 * Real upload/storage should be implemented later (backend required).
 */
export default function FileUpload({ onChange }) {
  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files && e.target.files[0];
        if (onChange) onChange(file);
      }}
      className="w-full"
    />
  );
}
