// backend/utils/pdfOcr.js
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs/promises";
import Tesseract from "tesseract.js";

const execFileAsync = promisify(execFile);

// ✅ Hard-coded Poppler path (no PATH needed)
// utils/pdfOcr.js
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
 * OCR a PDF by converting pages to PNG using Poppler (pdftoppm) then running Tesseract.
 * pagesToScan: number of pages starting from 1 (e.g., 1..N)
 */
export async function ocrPdfWithPoppler(filePath, pagesToScan = 1, debug = false) {
  // Safety clamp
  const first = 1;
  const last = Math.max(1, Math.min(Number(pagesToScan) || 1, 25)); // scan up to 25 pages max

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "psr-ocr-"));
  const outPrefix = path.join(tmpDir, "page");

  try {
    // Ensure pdftoppm exists
    // only check file existence when it's a full path
if (PDFTOPPM_EXE.includes("\\") || PDFTOPPM_EXE.includes("/")) {
  if (!(await fileExists(PDFTOPPM_EXE))) {
    throw new Error(
      `pdftoppm not found at: ${PDFTOPPM_EXE}. Set PDFTOPPM_EXE env var or install Poppler.`
    );
  }
}


    if (debug) console.log("🧠 OCR: running pdftoppm:", { first, last, tmpDir });

    await execFileAsync(PDFTOPPM_EXE, [
      "-png",
      "-r",
      "450",
      "-scale-to-x",
      "2800",
      "-scale-to-y",
      "-1",
      "-f",
      String(first),
      "-l",
      String(last),
      filePath,
      outPrefix,
    ]);

    let combined = "";

    for (let p = first; p <= last; p++) {
      const imgPath = `${outPrefix}-${p}.png`;

      const ok = await fileExists(imgPath);
      if (!ok) {
        if (debug) console.log(`⚠️ OCR: missing image output: ${imgPath}`);
        continue;
      }

      if (debug) console.log(`🧠 OCR: tesseract on page ${p}: ${imgPath}`);

      const result = await Tesseract.recognize(imgPath, "eng", {
        logger: debug
          ? (m) => {
              if (m.status === "recognizing text") {
                console.log(
                  `🧠 OCR: page ${p} ${m.status} ${(m.progress * 100).toFixed(0)}%`
                );
              }
            }
          : () => {},
      });

      const pageText = String(result?.data?.text || "").trim();
      if (debug) console.log(`🧠 OCR: page ${p} textLen=${pageText.length}`);
      if (pageText) combined += "\n" + pageText;
    }

    const finalText = combined.trim();
    if (debug) console.log(`🧠 OCR: combined textLen=${finalText.length}`);
    return finalText;
  } finally {
    // ✅ If debug, keep tmpDir so you can inspect images
    if (debug) {
      console.log("🧠 OCR DEBUG: keeping temp images at:", tmpDir);
    } else {
      // Cleanup temp dir (Node 22 safe)
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}
