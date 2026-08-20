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
      title: "Vendor Parts Latest Report",
      description:
        "Show latest purchased part details for each vendor, with latest PO, qty, and price",
      path: "/reports/vendor-parts-latest",
    },
    {
      title: "Part Purchase Summary",
      description:
        "Summarized purchase totals by part with quantities and spend",
      path: "/reports/part-summary",
    },
    {
      title: "Stock Movement Log",
      description: "Audit incoming & outgoing inventory activity",
      path: "/reports/stock-movement",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Reports
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Analyze system data and export detailed information.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all h-full flex flex-col justify-between"
            onClick={() => navigate(report.path)}
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {report.title}
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {report.description}
              </p>
            </div>
            <p className="text-sm font-medium text-blue-600 mt-4">
              Open report →
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
