/**
 * Upload Middleware
 * Multer configuration for video file uploads
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Upload to temp directory first
    cb(null, path.join(UPLOADS_DIR, 'videos', 'temp'));
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const allowedExts = ['.mp4', '.mov', '.avi', '.mkv'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only ${allowedExts.join(', ')} formats are allowed.`
      )
    );
  }
};

// Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

