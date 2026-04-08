import React, { useEffect, useMemo, useState } from "react";
import { apiRaw as api } from "../utils/api";

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return fallback;
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function statusBadge(level) {
  const v = String(level || "").toLowerCase();

  if (v === "critical" || v === "down") {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 shadow-sm">
        Critical
      </span>
    );
  }

  if (v === "warning") {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">
        Warning
      </span>
    );
  }

  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
      Healthy
    </span>
  );
}

export default function MonitoringPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/monitoring/overview");
      setData(res.data || {});
      setError("");
    } catch (err) {
      console.error("Monitoring load failed:", err);
      setError("Unable to load system status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const system =
    data && typeof data.system === "object" && data.system !== null
      ? data.system
      : {};

  const business =
    data && typeof data.business === "object" && data.business !== null
      ? data.business
      : {};

  const messages = Array.isArray(business.messages)
    ? business.messages.map((m) => text(m))
    : [];

  const uptime = useMemo(() => {
    const s = numberValue(system.uptimeSeconds, 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }, [system.uptimeSeconds]);

  const systemLevel = String(system.level || "").toLowerCase();
  const businessLevel = String(business.level || "").toLowerCase();

  const bannerClass =
    systemLevel === "critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : systemLevel === "warning"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-green-50 text-green-700 border-green-200";

  const bannerText =
    systemLevel === "critical"
      ? "Critical issues detected"
      : systemLevel === "warning"
      ? "Some attention may be required"
      : "System operating normally";

  if (loading && !data) {
    return <div className="p-6 text-gray-600">Loading system health...</div>;
  }

  if (error && !data) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-8 space-y-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            🩺 System Health
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Monitor API, database, server performance, web traffic, and business-level alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md"
        >
          🔄 Refresh
        </button>
      </div>

      <div className={`rounded-2xl border px-5 py-4 shadow-md ${bannerClass}`}>
        <div className="font-semibold text-lg">{bannerText}</div>
        <div className="text-sm opacity-80 mt-1">
          Updated:{" "}
          {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"}
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">
          ⚙️ Technical System Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              API Status •
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {text(system.apiStatus)}
              </span>
              {statusBadge(system.level)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              Database Status •
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {text(system.dbStatus)}
              </span>
              {statusBadge(system.dbStatus)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              DB Latency ⏱
            </div>
            <div className="font-semibold text-slate-900">
              {text(system.dbLatencyMs)} ms
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              API Latency ⏱
            </div>
            <div className="font-semibold text-slate-900">
              {text(system.apiLatencyMs)} ms
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
            CPU Load ⚡
          </div>
          <div className="text-4xl font-bold tracking-tight text-slate-900">
            {numberValue(system.nodeCpu, 0).toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-slate-500">1-minute average</div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
            Memory Usage 🧠
          </div>
          <div className="text-4xl font-bold tracking-tight text-slate-900">
            {text(system.nodeMemory)} MB
          </div>
          <div className="mt-1 text-xs text-slate-500">Node process RSS</div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50/40 p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
            Uptime ⏳
          </div>
          <div className="text-4xl font-bold tracking-tight text-slate-900">
            {uptime}
          </div>
          <div className="mt-1 text-xs text-slate-500">Since backend start</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
            Requests / Minute 📈
          </div>
          <div className="text-4xl font-bold tracking-tight text-slate-900">
            {text(system?.nginx?.recentRequests ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Recent web traffic</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-md">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            🌐 Web Traffic (Last 1 Minute)
          </h2>

          <div className="grid grid-cols-3 gap-5 text-sm">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Requests
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {text(system?.nginx?.recentRequests ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-yellow-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                4xx Errors
              </div>
              <div className="text-3xl font-bold tracking-tight text-yellow-700 mt-1">
                {text(system?.nginx?.status4xx ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-red-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                5xx Errors
              </div>
              <div className="text-3xl font-bold tracking-tight text-red-700 mt-1">
                {text(system?.nginx?.status5xx ?? 0)}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            businessLevel === "critical"
              ? "border-red-200 bg-red-50/30"
              : businessLevel === "warning"
              ? "border-yellow-200 bg-yellow-50/30"
              : "border-green-200 bg-green-50/30"
          }`}
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            📦 Business Health
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Low Stock Parts 📉
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {text(business.lowStockCount ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Pending POs 📝
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {text(business.pendingPoCount ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Stale POs ⏰
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {text(business.stalePoCount ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Vendor Alerts 🚚
              </div>
              <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {text(business.staleVendorRecordsCount ?? 0)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {messages.length > 0 ? (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm"
                >
                  {msg}
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-500 shadow-sm">
                ✅ No business alerts.
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}