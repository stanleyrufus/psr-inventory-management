// src/pages/settings/SettingsIndex.jsx
import { Card, Title, Text } from "@tremor/react";
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
      title: "System Preferences",
      desc: "Configure application defaults and behaviour.",
      path: "/settings/system",
    },
    {
      title: "Backup & Data Import",
      desc: "Database backup and CSV import tools (future).",
      path: "/settings/backup",
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
    <div className="p-8 space-y-8 w-full relative z-0">
      {/* Header */}
      <div>
        <Title className="text-3xl font-bold">Settings</Title>
        <Text className="text-gray-600 mt-1">
          Manage configuration and administrative controls.
        </Text>
      </div>

      {/* Settings Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
        {sections.map((section, idx) => (
          <Card
            key={idx}
            className="cursor-pointer hover:shadow-lg transition-all p-5 relative z-0"
            onClick={() => navigate(section.path)}
          >
            <Title className="text-xl font-semibold">{section.title}</Title>
            <Text className="text-gray-600 mt-2">{section.desc}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
