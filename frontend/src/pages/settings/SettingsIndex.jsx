import { useNavigate } from "react-router-dom";

export default function SettingsIndex() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "User Management",
      desc: "Manage system users, roles, and credentials.",
      path: "/settings/users",
    },
    {
      title: "Roles & Permissions",
      desc: "Create roles and assign permissions.",
      path: "/settings/roles",
    },
    {
      title: "System Health",
      desc: "Monitor server, API, database, and business-level health.",
      path: "/settings/monitoring",
    },
    {
      title: "Audit Logs",
      desc: "Track login events and system changes (future).",
      path: "/settings/logs",
    },
    {
      title: "App Info",
      desc: "Version, environment, and build metadata.",
      path: "/settings/info",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage configuration, monitoring, access control, and administrative
          tools.
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        role="list"
        aria-label="Settings sections"
      >
        {sections.map((section) => (
          <button
            key={section.path}
            type="button"
            onClick={() => navigate(section.path)}
            className="text-left cursor-pointer bg-transparent border-0 p-0"
            aria-label={`Open ${section.title}`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {section.title}
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {section.desc}
                </p>
              </div>
              <p className="text-sm font-medium text-blue-600 mt-4">
                Open section →
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
