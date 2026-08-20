import { useNavigate } from "react-router-dom";

export default function AuditLogsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Audit Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track login events and system changes
          </p>
        </div>

        <button
          onClick={() => navigate("/settings")}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
        >
          ← Back to Settings
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Audit logging is not currently enabled
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            No audit history is available yet. Audit logging will track login
            events, data changes, and system modifications once enabled on the
            backend.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-4 py-2 rounded-lg text-sm font-medium shadow-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
