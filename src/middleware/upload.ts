import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { AppError } from '../utils/app-error.js';

export const reportUploadsDirectory = path.join(process.cwd(), 'uploads', 'reports');

mkdirSync(reportUploadsDirectory, { recursive: true });

const extensionsByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, reportUploadsDirectory),
  filename: (_request, file, callback) => callback(null, `${randomUUID()}${extensionsByMimeType[file.mimetype]}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (extensionsByMimeType[file.mimetype]) {
      callback(null, true);
      return;
    }

    callback(new AppError(400, 'INVALID_EVIDENCE_FILE', 'Evidence must be an image file'));
  }
});
