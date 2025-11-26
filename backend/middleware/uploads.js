// backend/middleware/uploads.js
//-------------------------------------------------------------
// FULL + CLEANED + SAFE UPLOAD PIPELINE
// Supports:
//   ✔ PARTS uploads  (images)
//   ✔ PO ATTACHMENTS uploads
//   ✔ PROD + LOCAL directory handling
//   ✔ Safe path deletion
//   ✔ No circular JSON crashes
//-------------------------------------------------------------

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//-------------------------------------------------------------
// 1️⃣ Resolve Upload Root Folder
//-------------------------------------------------------------
const uploadsRoot = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.resolve(__dirname, "..", "uploads");

// Ensure base folder exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(uploadsRoot);

// Create specific subfolder (e.g. "parts", "po-attachments")
function resolveFolder(subfolder) {
  const folder = path.join(uploadsRoot, subfolder);
  ensureDir(folder);
  return folder;
}

//-------------------------------------------------------------
// 2️⃣ COMMON STORAGE ENGINE
// Unique filename generator
//-------------------------------------------------------------
function makeStorage(folder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, folder);
    },
    filename(req, file, cb) {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
      const ext = path.extname(file.originalname || "");
      cb(null, `${unique}${ext}`);
    },
  });
}

//-------------------------------------------------------------
// 3️⃣ BASIC UPLOADER  (use for PARTS ONLY)
// Returns real multer → supports .array("images")
//-------------------------------------------------------------
export function makeBasicUploader(subfolder) {
  const folder = resolveFolder(subfolder);
  const storage = makeStorage(folder);
  return multer({ storage });
}

//-------------------------------------------------------------
// 4️⃣ SAFE UPLOADER (use for POs only)
// Wraps array upload to prevent circular JSON crashes
//-------------------------------------------------------------
export function makeSafeUploader(subfolder) {
  const folder = resolveFolder(subfolder);
  const storage = makeStorage(folder);

  const uploadArray = multer({ storage }).array("files", 10);

  return function safeUpload(req, res, next) {
    uploadArray(req, res, (err) => {
      if (err) {
        console.error("❌ Multer upload error:", err);
        return res.status(400).json({
          success: 0,
          errormsg: err.message,
        });
      }
      next();
    });
  };
}

//-------------------------------------------------------------
// 5️⃣ Resolve Physical File Path for Delete
//-------------------------------------------------------------
export function resolveUploadPath(imageUrl) {
  if (!imageUrl) return null;

  // remove "/uploads/" prefix
  const rel = imageUrl.replace(/^\/uploads\//, "");
  return path.join(uploadsRoot, rel);
}

//-------------------------------------------------------------
// 6️⃣ Debug Info (optional, helps confirm folder paths)
//-------------------------------------------------------------
console.log("📂 Upload root resolved to:", uploadsRoot);
