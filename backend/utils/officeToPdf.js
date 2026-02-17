// backend/utils/officeToPdf.js
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execFileAsync = promisify(execFile);

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveSoffice() {
  if (process.env.SOFFICE_PATH && exists(process.env.SOFFICE_PATH)) {
    return process.env.SOFFICE_PATH;
  }

  const winCandidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
  ];

  for (const c of winCandidates) {
    if (exists(c)) return c;
  }

  return "soffice";
}

export async function convertOfficeToPdf(inputPath) {
  if (!inputPath) throw new Error("inputPath required");
  if (!exists(inputPath)) throw new Error(`File not found: ${inputPath}`);

  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const outPdf = path.join(dir, `${base}.pdf`);

  if (exists(outPdf)) return outPdf;

  const soffice = await resolveSoffice();

  // 🔥 Completely isolated LibreOffice profile in OS temp
  const userProfileDir = path.join(
    os.tmpdir(),
    "lo-profile-" + Date.now()
  );

  fs.mkdirSync(userProfileDir, { recursive: true });

  try {
    await execFileAsync(
      soffice,
      [
        "--headless",
        "--invisible",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        "--nolockcheck",
        "--nocrashreport",
        "--norestore",
        "--safe-mode",
        `-env:UserInstallation=file:///${userProfileDir.replace(/\\/g, "/")}`,
        "--convert-to",
        "pdf:calc_pdf_Export",
        "--outdir",
        dir,
        inputPath,
      ],
      {
        windowsHide: true,
        timeout: 120000,
      }
    );
  } catch (e) {
    throw new Error(`LibreOffice conversion failed: ${e.message}`);
  } finally {
    // Cleanup profile
    try {
      fs.rmSync(userProfileDir, { recursive: true, force: true });
    } catch {}
  }

  if (!exists(outPdf)) {
    throw new Error(`Conversion failed. PDF not created: ${outPdf}`);
  }

  return outPdf;
}
