import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';

// Matches the volume mount in docker-compose.yml (backend: /app/uploads).
// Overridable so tests (which run on the host, not in the container) can
// point this at a disposable temp directory - see tests/setup.js.
export const UPLOADS_ROOT = process.env.UPLOADS_DIR || '/app/uploads';

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_ROOT, 'parties', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, `${randomUUID()}.${MIME_EXTENSIONS[file.mimetype]}`);
  },
});

function fileFilter(req, file, cb) {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    cb(new Error('unsupported_file_type'));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/**
 * storage_path stored in party_images, relative to UPLOADS_ROOT so the root
 * itself stays swappable between environments.
 */
export function relativeStoragePath(partyId, filename) {
  return path.join('parties', partyId, filename);
}

export function contentTypeForPath(storagePath) {
  const ext = path.extname(storagePath).slice(1).toLowerCase();
  const entry = Object.entries(MIME_EXTENSIONS).find(([, value]) => value === ext);
  return entry ? entry[0] : 'application/octet-stream';
}

export function deleteStoredFile(storagePath) {
  fs.rm(path.join(UPLOADS_ROOT, storagePath), { force: true }, () => {});
}
