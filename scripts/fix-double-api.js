const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "frontend", "src");
const exts = new Set([".js", ".jsx"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root);
let changed = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");

  const updated = original.replaceAll("${BASE}/api/", "${BASE}/");

  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    console.log("Updated:", path.relative(process.cwd(), file));
    changed++;
  }
}

console.log(`Done. Files changed: ${changed}`);