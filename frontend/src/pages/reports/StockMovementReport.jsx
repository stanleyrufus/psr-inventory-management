import { useState } from "react";
import {
  Title, Card, Table, TableBody, TableCell,
  TableHead, TableHeaderCell, TableRow,
  TextInput, Button, DateRangePicker
} from "@tremor/react";
import { useNavigate } from "react-router-dom";

export default function StockMovementReport() {
  const navigate = useNavigate();

  // Placeholder data
  const [data] = useState([
    { id: 1, part: "Motor Assembly", change: -3, type: "Usage", date: "2025-01-14", ref: "WO-221" },
    { id: 2, part: "Label Sensor", change: +10, type: "Purchase", date: "2025-01-10", ref: "PO-102" },
  ]);

  const [search, setSearch] = useState("");

  const filteredData = data.filter((row) =>
    row.part.toLowerCase().includes(search.toLowerCase()) ||
    row.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-2xl font-bold">Stock Movement Log</Title>
          <p className="text-gray-600 text-sm">Track incoming & outgoing inventory transactions</p>
        </div>
        <Button onClick={() => navigate("/reports")}>← Back to Reports</Button>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex gap-4 items-center flex-wrap">
          <TextInput
            placeholder="Search part or movement type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />

          <DateRangePicker className="w-72" />

          <Button variant="secondary">Export CSV</Button>
          <Button variant="secondary">Export PDF</Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Part</TableHeaderCell>
              <TableHeaderCell>Change</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Reference</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.part}</TableCell>
                <TableCell className={row.change < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                  {row.change}
                </TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="font-medium">{row.ref}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
