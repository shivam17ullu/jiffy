import multer from "multer";
import { Request } from "express";

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
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Max 10 files
    fieldSize: 10 * 1024 * 1024, // 10MB for field values
  },
});

// Middleware for single image upload
export const uploadSingle = upload.single("image");

// Middleware for multiple images upload
export const uploadMultiple = upload.array("images", 10); // Max 10 images

