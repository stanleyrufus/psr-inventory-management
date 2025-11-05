import { useState, useEffect } from "react";
import {
  Title, Card, Table, TableBody, TableCell,
  TableHead, TableHeaderCell, TableRow, TextInput, Button
} from "@tremor/react";
import { useNavigate } from "react-router-dom";
import { apiRaw as api } from "../../utils/api";

// ✅ PDF libs must be imported at top
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function LowStockReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // ✅ show-per-page needs state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  async function fetchData() {
    try {
      const res = await api.get("/parts/low-stock");
      setData(res.data?.data || []);
    } catch (err) {
      console.error("Low stock fetch error:", err);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function saveMinLevel(id) {
    try {
      await api.put(`/parts/min-level/${id}`, {
        minimum_stock_level: Number(editValue)
      });
      setEditId(null);
      setEditValue("");
      fetchData();
    } catch (err) {
      console.error("Error saving min level:", err);
    }
  }

  const filteredData = data.filter((item) => {
    const s = search.toLowerCase();
    return (
      (item.part_number || "").toLowerCase().includes(s) ||
      (item.part_name || "").toLowerCase().includes(s) ||
      (item.description || "").toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  // ✅ CSV Export (uses filteredData)
  function exportCSV() {
    const headers = ["Part Number", "Part Name", "Description", "Qty", "Min Level", "Vendor"];

    const rows = filteredData.map(r => [
      r.part_number || "",
      r.part_name || "",
      r.description || "",
      r.quantity_on_hand ?? "",
      r.minimum_stock_level ?? "",
      r.last_vendor_name || "",
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "low_stock_report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // ✅ PDF Export (uses filteredData)
  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Low Stock Report", 14, 10);

    const rows = filteredData.map(r => [
      r.part_number || "",
      r.part_name || "",
      r.description || "",
      r.quantity_on_hand ?? "",
      r.minimum_stock_level ?? "",
      r.last_vendor_name || "",
    ]);

    autoTable(doc, {
      startY: 14,
      head: [["Part Number", "Part Name", "Description", "Qty", "Min Level", "Vendor"]],
      body: rows,
      styles: { fontSize: 8, cellWidth: "wrap" },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 120 }, // keep description widest in PDF
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 40 },
      },
    });

    doc.save("low_stock_report.pdf");
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-2xl font-bold">Low Stock Report</Title>
          <p className="text-gray-600 text-sm">Parts below minimum stock level</p>
        </div>
        <Button onClick={() => navigate("/reports")}>← Back to Reports</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <TextInput
            placeholder="Search part # / name / description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-80"
          />

          <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
          <Button variant="secondary" onClick={exportPDF}>Export PDF</Button>

          {/* Show per page (inline after PDF) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border rounded-md text-sm px-2 py-1 bg-white"
              style={{ minWidth: "60px" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-[120px]">Part #</TableHeaderCell>
              <TableHeaderCell className="w-[220px]">Part Name</TableHeaderCell>
              <TableHeaderCell className="w-[900px]">Description</TableHeaderCell>
              <TableHeaderCell className="w-[80px]">Qty</TableHeaderCell>
              <TableHeaderCell className="w-[120px]">Min Level</TableHeaderCell>
              <TableHeaderCell className="w-[180px]">Vendor</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {pageData.map((row) => (
              <TableRow key={row.part_id} className="align-top">

                {/* Part Number */}
                <TableCell className="whitespace-nowrap">
                  {row.part_number || "—"}
                </TableCell>

                {/* Part Name */}
                <TableCell className="whitespace-normal break-words text-sm max-w-[220px]">
                  {row.part_name || "—"}
                </TableCell>

                {/* Description (big) */}
                <TableCell className="whitespace-normal break-words text-sm max-w-[900px]">
                  {row.description || "—"}
                </TableCell>

                {/* Qty */}
                <TableCell className="font-bold text-red-600 text-center">
                  {row.quantity_on_hand}
                </TableCell>

                {/* Min Level & Set */}
                <TableCell>
                  {editId === row.part_id ? (
                    <div className="flex gap-1 items-center">
                      <TextInput
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-16"
                      />
                      <Button size="xs" onClick={() => saveMinLevel(row.part_id)}>Save</Button>
                      <Button size="xs" variant="secondary" onClick={() => setEditId(null)}>X</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      {row.minimum_stock_level}
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => { setEditId(row.part_id); setEditValue(row.minimum_stock_level); }}
                      >
                        Set
                      </Button>
                    </div>
                  )}
                </TableCell>

                {/* Vendor */}
                <TableCell className="whitespace-normal break-words text-sm max-w-[180px]">
                  {row.last_vendor_name || "—"}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <Button size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} — {filteredData.length} records
          </span>

          <Button size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
