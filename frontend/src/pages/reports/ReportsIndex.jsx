import { Card, Title, Text } from "@tremor/react";
import { useNavigate } from "react-router-dom";

export default function ReportsIndex() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Low Stock Report",
      description: "View parts that are below minimum stock level",
      path: "/reports/low-stock",
    },
    {
      title: "Purchase Order History",
      description: "Track all purchase orders with filters & exports",
      path: "/reports/purchase-orders",
    },
    {
      title: "Vendor Purchase Summary",
      description: "Summarized total spend, PO count, and last order by vendor",
      path: "/reports/vendor-summary",
    },
    {
      title: "Part Purchase Summary",
      description: "Summarized purchase totals by part with quantities and spend",
      path: "/reports/part-summary",
    },
    {
      title: "Stock Movement Log",
      description: "Audit incoming & outgoing inventory activity",
      path: "/reports/stock-movement",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Title className="text-2xl font-bold">Reports</Title>
      <Text className="text-gray-600">
        Analyze system data and export detailed information.
      </Text>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => (
          <Card
            key={idx}
            className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
            onClick={() => navigate(report.path)}
          >
            <Title className="text-lg font-semibold">{report.title}</Title>
            <Text className="text-gray-600 mt-2">{report.description}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
