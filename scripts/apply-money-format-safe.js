const fs = require("fs");
const path = require("path");

const root = process.cwd();

const targetFiles = [
  "frontend/src/components/lists/PartsList.jsx",
  "frontend/src/components/PartDetail.jsx",
  "frontend/src/pages/PartsPage.jsx",
  "frontend/src/pages/ProductDetail.jsx",
  "frontend/src/pages/purchaseOrders/PurchaseOrderDetails.jsx",
  "frontend/src/pages/purchaseOrders/PurchaseOrderForm.jsx",
  "frontend/src/pages/reports/PartPurchaseSummary.jsx",
  "frontend/src/pages/reports/VendorPurchaseSummary.jsx",
  "frontend/src/pages/purchaseOrders/PurchaseOrderList.jsx",
];

function moneyExpr(expr) {
  return `"$${
    expr
  }"`;
}

function formatExpr(expr) {
  return `"$$PLACEHOLDER$$"`;
}

function replacePatterns(content, file) {
  let out = content;

  // 1) `$${Number(x).toFixed(2)}`
  out = out.replace(
    /`\$\$\{Number\(([^)]+)\)\.toFixed\(2\)\}`/g,
    (_, expr) =>
      '"$" + Number(' +
      expr.trim() +
      ').toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })'
  );

  // 2) `$${something.toFixed(2)}`
  out = out.replace(
    /`\$\$\{([^}]+)\.toFixed\(2\)\}`/g,
    (_, expr) =>
      '"$" + Number(' +
      expr.trim() +
      ').toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })'
  );

  // 3) const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  out = out.replace(
    /const money = \(v\) => `\$\$\{Number\(v \|\| 0\)\.toFixed\(2\)\}`;/g,
    'const money = (v) => v == null || v === "" || Number.isNaN(Number(v)) ? "-" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });'
  );

  // 4) const money = (v) => n(v).toFixed(2);
  out = out.replace(
    /const money = \(v\) => n\(v\)\.toFixed\(2\);/g,
    'const money = (v) => v == null || v === "" || Number.isNaN(Number(v)) ? "-" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });'
  );

  // 5) multiline money helper in PO details
  out = out.replace(
    /const money = \(v\) =>\s*v == null \|\| v === "" \|\| isNaN\(Number\(v\)\) \? "-" : `\$\$\{Number\(v\)\.toFixed\(2\)\}`;/g,
    'const money = (v) => v == null || v === "" || Number.isNaN(Number(v)) ? "-" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });'
  );

  // 6) return v ? `$${Number(v).toFixed(2)}` : "-";
  out = out.replace(
    /return v \? `\$\$\{Number\(v\)\.toFixed\(2\)\}` : "-";/g,
    'return v == null || v === "" || Number.isNaN(Number(v)) ? "-" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });'
  );

  // 7) inline ternary with em dash
  out = out.replace(
    /\{([^{}]+?) \? `\$\$\{Number\(([^)]+)\)\.toFixed\(2\)\}` : "—"\}/g,
    '{ $2 != null && $2 !== "" ? "$" + Number($2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—" }'
  );

  return out;
}

let changedCount = 0;

for (const rel of targetFiles) {
  const file = path.join(root, rel);

  if (!fs.existsSync(file)) {
    console.log("Skipped (not found):", rel);
    continue;
  }

  const original = fs.readFileSync(file, "utf8");
  const updated = replacePatterns(original, file);

  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    console.log("Updated:", rel);
    changedCount++;
  } else {
    console.log("No change:", rel);
  }
}

console.log(`Done. Files changed: ${changedCount}`);