import React, { useEffect, useState } from "react";
import { apiRaw as api } from "../utils/api";

function Pill({ level }) {
  const styles = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[level] || styles.unknown}`}>
      {level?.toUpperCase()}
    </span>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function MonitoringPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await api.get("/monitoring/overview");
      setData(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load system status.");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (error && !data) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-600">Loading system health…</div>;

  const { system } = data;

  const uptime = (() => {
    const s = system.uptimeSeconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  })();

  // Global status banner
  const banner = {
    ok: { msg: "System operating normally", cls: "bg-green-50 text-green-700 border-green-200" },
    warning: { msg: "Some attention may be required", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    critical: { msg: "Critical issues detected", cls: "bg-red-50 text-red-700 border-red-200" },
  }[system.level || "ok"];

  return (
    <div className="p-6 space-y-6">

      {/* 🔥 Global Banner */}
      <div className={`p-4 border rounded-xl shadow-sm ${banner.cls}`}>
        <div className="font-semibold text-lg">{banner.msg}</div>
        <div className="text-xs opacity-80">
          Updated: {new Date(data.generatedAt).toLocaleString()}
        </div>
      </div>

      {/* ➤ Technical System Health */}
      <Card title="Technical System Health">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-gray-500">API Status</div>
            <div className="font-semibold flex items-center gap-2">
              {system.apiStatus}
              <Pill level={system.level} />
            </div>
          </div>

          <div>
            <div className="text-gray-500">DB Status</div>
            <div className="font-semibold">{system.dbStatus}</div>
          </div>

          <div>
            <div className="text-gray-500">DB Latency</div>
            <div className="font-semibold">
              {system.dbLatencyMs} ms{" "}
              {system.dbLatencyMs > 200 && <span className="text-yellow-700">(slow)</span>}
            </div>
          </div>

          <div>
            <div className="text-gray-500">API Latency</div>
            <div className="font-semibold">{system.apiLatencyMs} ms</div>
          </div>
        </div>
      </Card>

      {/* ➤ Server Performance (CPU/RAM/Uptime) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="CPU Load">
          <div className="text-3xl font-bold text-gray-900">
            {typeof system.nodeCpu === "number" ? system.nodeCpu.toFixed(2) : "—"}
          </div>
        </Card>

        <Card title="Memory Usage">
          <div className="text-3xl font-bold text-gray-900">
            {system.nodeMemory ? `${system.nodeMemory} MB` : "—"}
          </div>
        </Card>

        <Card title="Uptime">
          <div className="text-3xl font-bold text-gray-900">{uptime}</div>
        </Card>
      </div>

      {/* ➤ Web Traffic */}
      <Card title="Web Traffic (Last 1 Minute)">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-gray-500">Requests</div>
            <div className="font-semibold">{system.nginx?.recentRequests || 0}</div>
          </div>

          <div>
            <div className="text-gray-500">4xx Errors</div>
            <div className="font-semibold text-yellow-700">{system.nginx?.status4xx || 0}</div>
          </div>

          <div>
            <div className="text-gray-500">5xx Errors</div>
            <div className="font-semibold text-red-700">{system.nginx?.status5xx || 0}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
