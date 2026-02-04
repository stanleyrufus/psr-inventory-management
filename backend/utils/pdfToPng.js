import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

// utils/pdfToPng.js
const PDFTOPPM_EXE =
  process.env.PDFTOPPM_EXE ||
  (process.platform === "win32"
    ? "C:\\poppler\\poppler-25.12.0\\Library\\bin\\pdftoppm.exe"
    : "pdftoppm"); // linux/mac use PATH


async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert first N pages of PDF into PNGs.
 * Returns array of absolute PNG paths.
 */
export async function pdfToPngPages(filePath, pages = 1, dpi = 300) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "psr-pdfpng-"));
  const outPrefix = path.join(tmpDir, "page");

  const first = 1;
  const last = Math.max(1, Math.min(pages, 5)); // safety cap

  await execFileAsync(PDFTOPPM_EXE, [
    "-png",
    "-r",
    String(dpi),
    "-f",
    String(first),
    "-l",
    String(last),
    filePath,
    outPrefix,
  ]);

  const pngs = [];
  for (let p = first; p <= last; p++) {
    const imgPath = `${outPrefix}-${p}.png`;
    if (await fileExists(imgPath)) pngs.push(imgPath);
  }

  return { tmpDir, pngs };
}
