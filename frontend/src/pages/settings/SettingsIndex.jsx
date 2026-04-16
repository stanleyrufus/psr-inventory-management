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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage configuration, monitoring, access control, and administrative tools.
        </p>
      </div>

      {/* ✅ FIXED GRID WRAPPER */}
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
            className="text-left bg-transparent border-0 p-0"
            style={{ cursor: "pointer" }}
            aria-label={`Open ${section.title}`}
          >
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="psr-section-stack">
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "var(--psr-text)",
                    }}
                  >
                    {section.title}
                  </h2>

                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--psr-text-muted)",
                    }}
                  >
                    {section.desc}
                  </p>
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--psr-primary)",
                  }}
                >
                  Open section →
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}