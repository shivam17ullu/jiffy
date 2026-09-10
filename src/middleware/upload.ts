import multer from "multer";
import { Request, Response, NextFunction } from "express";

// Configure multer to store files in memory (for S3 upload)
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 20, // Max 20 files
    fieldSize: 100 * 1024 * 1024, // 100MB for field values (accommodates large base64 strings in form-data)
  },
});

// Middleware for single image upload
export const uploadSingle = upload.single("image");

// Middleware for multiple images upload (accepts any field names e.g. "images", "images[]", "files")
const uploadAnyMulter = upload.any();

/** Multer middleware that forwards errors to the global error handler */
export const uploadMultiple = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadAnyMulter(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

