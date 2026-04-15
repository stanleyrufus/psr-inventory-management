// src/pages/settings/SettingsIndex.jsx

import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader, Card } from "../../components/ui";

/**
 * SettingsIndex
 * Purpose:
 * - Main landing page for Settings
 * - Shows all settings sections as clickable cards
 * - Uses shared PSR design shell for consistent look and feel
 */
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
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Manage configuration, monitoring, access control, and administrative tools."
      />

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
            <Card
              className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              padding="lg"
            >
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
            </Card>
          </button>
        ))}
      </div>
    </PageContainer>
  );
}