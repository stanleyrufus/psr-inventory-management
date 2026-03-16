const fs = require("fs");
const path = require("path");

const filePath = path.join(
  process.cwd(),
  "frontend",
  "src",
  "pages",
  "purchaseOrders",
  "PurchaseOrderList.jsx"
);

if (!fs.existsSync(filePath)) {
  console.error("File not found:", filePath);
  process.exit(1);
}

const original = fs.readFileSync(filePath, "utf8");

const pattern =
  /valueFormatter:\s*\(p\)\s*=>\s*[\s\S]*?\s*:\s*"-",/;

const replacement = `valueFormatter: (p) =>
      p.value != null
        ? "$" +
          Number(p.value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "-",`;

if (!pattern.test(original)) {
  console.log("Target formatter block not found. No changes made.");
  process.exit(0);
}

const updated = original.replace(pattern, replacement);

fs.writeFileSync(filePath, updated, "utf8");

console.log("Updated file:");
console.log(filePath);
console.log("Grand Total formatter repaired successfully.");