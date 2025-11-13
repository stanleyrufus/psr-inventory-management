import { Card, Title, Text } from "@tremor/react";

export default function SystemSettings() {
  return (
    <div className="space-y-6">
      <Title className="text-2xl font-bold">System Preferences</Title>
      <Text className="text-gray-600">General application settings (future)</Text>

      <Card className="p-6">
        <p className="text-gray-500 text-sm">
          This section will allow setting defaults such as:
        </p>
        <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
          <li>Default currency</li>
          <li>Default vendor terms</li>
          <li>Low-stock alert threshold</li>
          <li>Notification emails</li>
          <li>PDF export branding</li>
        </ul>
      </Card>
    </div>
  );
}
