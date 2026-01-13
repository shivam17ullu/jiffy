import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Initialize S3 configuration
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "jiffy-products";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Validate AWS credentials
const validateAWSCredentials = () => {
  if (!AWS_ACCESS_KEY_ID || AWS_ACCESS_KEY_ID.trim() === '') {
    throw new Error(
      "AWS_ACCESS_KEY_ID is not configured. Please set it in your .env file. See AWS_CREDENTIALS_SETUP.md for instructions."
    );
  }
  if (!AWS_SECRET_ACCESS_KEY || AWS_SECRET_ACCESS_KEY.trim() === '') {
    throw new Error(
      "AWS_SECRET_ACCESS_KEY is not configured. Please set it in your .env file. See AWS_CREDENTIALS_SETUP.md for instructions."
    );
  }
  if (!BUCKET_NAME || BUCKET_NAME.trim() === '') {
    throw new Error(
      "AWS_S3_BUCKET_NAME is not configured. Please set it in your .env file. See AWS_CREDENTIALS_SETUP.md for instructions."
    );
  }
};

// Initialize S3 client (lazy initialization)
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    validateAWSCredentials();
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
};

/**
 * Convert base64 string to buffer
 * @param base64String - Base64 encoded image string (with or without data URL prefix)
 * @returns Buffer and mime type
 */
export const base64ToBuffer = (base64String: string): { buffer: Buffer; mimeType: string; extension: string } => {
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  let base64Data = base64String;
  let mimeType = 'image/jpeg'; // default
  let extension = 'jpg'; // default

  if (base64String.includes(',')) {
    const parts = base64String.split(',');
    const dataPrefix = parts[0];
    base64Data = parts[1];

    // Extract mime type from prefix
    const mimeMatch = dataPrefix.match(/data:([^;]+)/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
      // Get extension from mime type
      const extMap: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
      };
      extension = extMap[mimeType] || 'jpg';
    }
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  return { buffer, mimeType, extension };
};

/**
 * Upload a file to S3
 * @param file - Multer file object
 * @param folder - Folder path in S3 (e.g., 'products', 'documents')
 * @returns S3 URL of uploaded file
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = "products"
): Promise<string> => {
  try {
    const client = getS3Client();
    
    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

    // Upload to S3
    // Note: ACL is removed because newer S3 buckets have ACLs disabled by default
    // Use bucket policy for public read access instead
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL removed - use bucket policy for public access
    });

    await client.send(command);

    // Return public URL - Format: https://bucket-name.s3.region.amazonaws.com/key
    const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;
    return fileUrl;
  } catch (error: any) {
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Upload multiple files to S3
 * @param files - Array of Multer file objects
 * @param folder - Folder path in S3
 * @returns Array of S3 URLs
 */
export const uploadMultipleToS3 = async (
  files: Express.Multer.File[],
  folder: string = "products"
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => uploadToS3(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error: any) {
    console.error("S3 Multiple Upload Error:", error);
    throw new Error(`Failed to upload files to S3: ${error.message}`);
  }
};

/**
 * Upload base64 image to S3
 * @param base64String - Base64 encoded image string
 * @param folder - Folder path in S3 (e.g., 'products', 'documents')
 * @returns S3 URL of uploaded file
 */
export const uploadBase64ToS3 = async (
  base64String: string,
  folder: string = "products"
): Promise<string> => {
  try {
    const client = getS3Client();
    const { buffer, mimeType, extension } = base64ToBuffer(base64String);
    
    // Generate unique filename
    const fileName = `${folder}/${randomUUID()}.${extension}`;

    // Upload to S3
    // Note: ACL is removed because newer S3 buckets have ACLs disabled by default
    // Use bucket policy for public read access instead
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
      // ACL removed - use bucket policy for public access
    });

    await client.send(command);

    // Return public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;
    return fileUrl;
  } catch (error: any) {
    console.error("S3 Base64 Upload Error:", error);
    throw new Error(`Failed to upload base64 image to S3: ${error.message}`);
  }
};

/**
 * Upload multiple base64 images to S3
 * @param base64Strings - Array of base64 encoded image strings
 * @param folder - Folder path in S3
 * @returns Array of S3 URLs
 */
export const uploadMultipleBase64ToS3 = async (
  base64Strings: string[],
  folder: string = "products"
): Promise<string[]> => {
  try {
    const uploadPromises = base64Strings.map((base64) => uploadBase64ToS3(base64, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error: any) {
    console.error("S3 Multiple Base64 Upload Error:", error);
    throw new Error(`Failed to upload base64 images to S3: ${error.message}`);
  }
};

/**
 * Delete file from S3 (optional - for future use)
 */
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    const client = getS3Client();
    
    // Extract key from URL
    const urlParts = fileUrl.split(".com/");
    if (urlParts.length < 2) {
      throw new Error("Invalid S3 URL");
    }
    const key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
  } catch (error: any) {
    console.error("S3 Delete Error:", error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};
