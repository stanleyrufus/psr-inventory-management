// frontend/src/pages/settings/SystemPreferences.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function SystemPreferences() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    default_currency: "",
    default_vendor_terms: "",
    low_stock_threshold: "",
    notification_email: "",
    pdf_branding_name: "",
    pdf_branding_footer: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await api.get("/system-preferences");
      setSettings(res.data);
    } catch (err) {
      console.error("Settings load failed", err);
      alert("Failed to load system preferences");
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await api.put("/system-preferences", settings);
      alert("System preferences updated successfully!");
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save settings");
    }
    setSaving(false);
  }

  /* Dropdown styling */
  const selectClass =
    "w-full border rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none";

  return (
    <div className="p-4 md:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            System Preferences
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            System-wide defaults, alerts, and PDF branding
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            ← Back to Settings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
        {/* 2 COLUMN LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Default Currency */}
          <div>
            <label className="text-sm text-gray-700">Default Currency</label>
            <select
              className={selectClass}
              value={settings.default_currency}
              onChange={(e) =>
                setSettings((s) => ({ ...s, default_currency: e.target.value }))
              }
            >
              <option value="">Select currency</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="INR">INR — Indian Rupee</option>
              <option value="CNY">CNY — Chinese Yuan</option>
            </select>
          </div>

          {/* Vendor Terms */}
          <div>
            <label className="text-sm text-gray-700">Default Vendor Terms</label>
            <select
              className={selectClass}
              value={settings.default_vendor_terms}
              onChange={(e) =>
                setSettings((s) => ({ ...s, default_vendor_terms: e.target.value }))
              }
            >
              <option value="">Select terms</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
            </select>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <label className="text-sm text-gray-700">Low Stock Alert Threshold</label>
            <input
              type="number"
              className={selectClass}
              value={settings.low_stock_threshold}
              onChange={(e) =>
                setSettings((s) => ({ ...s, low_stock_threshold: e.target.value }))
              }
            />
          </div>

          {/* Notification Email */}
          <div>
            <label className="text-sm text-gray-700">Notification Email</label>
            <input
              type="email"
              className={selectClass}
              value={settings.notification_email}
              onChange={(e) =>
                setSettings((s) => ({ ...s, notification_email: e.target.value }))
              }
            />
          </div>

          {/* PDF Branding Name */}
          <div>
            <label className="text-sm text-gray-700">PDF Branding Name</label>
            <input
              className={selectClass}
              value={settings.pdf_branding_name}
              onChange={(e) =>
                setSettings((s) => ({ ...s, pdf_branding_name: e.target.value }))
              }
            />
          </div>

          {/* PDF Footer */}
          <div>
            <label className="text-sm text-gray-700">PDF Branding Footer</label>
            <input
              className={selectClass}
              value={settings.pdf_branding_footer}
              onChange={(e) =>
                setSettings((s) => ({ ...s, pdf_branding_footer: e.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
