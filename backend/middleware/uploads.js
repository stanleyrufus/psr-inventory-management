// backend/middleware/uploads.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve uploads root:
// - PROD: /var/www/psr-inventory-management/uploads (from .env)
// - LOCAL: C:\...\psr-inventory-management\uploads (from .env)
// - Fallback: backend/uploads (if UPLOADS_ROOT not set)
const uploadsRoot = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.resolve(__dirname, "..", "uploads");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Create a multer instance for a given subfolder (e.g., "parts", "po-attachments")
export function makeUploader(subfolder) {
  const folder = path.join(uploadsRoot, subfolder);
  ensureDir(folder);

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, folder);
    },
    filename(req, file, cb) {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
      const ext = path.extname(file.originalname || "");
      cb(null, `${unique}${ext}`);
    },
  });

  return multer({ storage });
}

// Helper to resolve full path for an existing DB image_url like "/uploads/parts/xxx.png"
export function resolveUploadPath(imageUrl) {
  if (!imageUrl) return null;

  // Remove leading "/uploads/" if present
  const relative = imageUrl.replace(/^\/uploads\//, "");
  return path.join(uploadsRoot, relative);
}
