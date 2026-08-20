import { useNavigate } from "react-router-dom";

const appInfo = [
  { label: "Application Name", value: "PSR Inventory Management System" },
  { label: "Frontend Version", value: "0.0.0" },
  { label: "Backend Version", value: "1.0.0" },
  { label: "Frontend Framework", value: "React 18" },
  { label: "Build Tool", value: "Vite" },
  { label: "CSS Framework", value: "Tailwind CSS 3" },
  { label: "Backend Framework", value: "Express 4" },
  { label: "Database", value: "PostgreSQL" },
  { label: "ORM / Query Builder", value: "Knex.js" },
];

export default function AppInfoPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            App Info
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Version, environment, and build metadata
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
        <div className="divide-y divide-gray-100">
          {appInfo.map((item) => (
            <div
              key={item.label}
              className="flex flex-col sm:flex-row sm:items-center py-3 gap-1 sm:gap-0"
            >
              <div className="sm:w-1/3 text-sm font-medium text-gray-500">
                {item.label}
              </div>
              <div className="sm:w-2/3 text-sm text-gray-900">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
