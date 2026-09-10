import { Document, SellerProfile, VerifiedSellers } from "../../model/relations.js";
import { uploadBase64ToS3 } from "../../utils/s3Upload.js";
import { ApiError } from "../../utils/ApiError.js";

export const getSellerDocs = async (userId: number) => {
  const sellerProfile = await SellerProfile.findOne({ where: { userId } });
  if (!sellerProfile) return null;

  return await Document.findOne({ where: { sellerId: sellerProfile.id } });
};

export const reuploadSellerDocs = async (
  userId: number,
  payload: {
    aadhaarUrl?: string;
    panUrl?: string;
    gstUrl?: string;
    storeDocUrl?: string;
    aadhaar_url?: string;
    pan_url?: string;
    gst_url?: string;
    store_doc_url?: string;
    store_doc?: string;
  }
) => {
  const sellerProfile = await SellerProfile.findOne({ where: { userId } });
  if (!sellerProfile) {
    throw ApiError.notFound("Seller profile not found");
  }

  const verifiedSeller = await VerifiedSellers.findOne({
    where: { sellerId: sellerProfile.id }
  });

  if (!verifiedSeller) {
    throw ApiError.notFound("Seller verification record not found");
  }

  // Ensure the seller is in rejected status
  if (verifiedSeller.status !== "rejected") {
    throw ApiError.badRequest("Documents can only be reuploaded if the seller account is rejected");
  }

  const isBase64String = (str?: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;
    return trimmed.startsWith('data:') || trimmed.length > 100;
  };

  let aadhaarFinal = payload.aadhaarUrl || payload.aadhaar_url;
  if (isBase64String(aadhaarFinal)) {
    aadhaarFinal = await uploadBase64ToS3(aadhaarFinal!, 'documents');
  }

  let panFinal = payload.panUrl || payload.pan_url;
  if (isBase64String(panFinal)) {
    panFinal = await uploadBase64ToS3(panFinal!, 'documents');
  }

  let gstFinal = payload.gstUrl || payload.gst_url;
  if (isBase64String(gstFinal)) {
    gstFinal = await uploadBase64ToS3(gstFinal!, 'documents');
  }

  let storeDocFinal = payload.storeDocUrl || payload.store_doc_url || payload.store_doc;
  if (isBase64String(storeDocFinal)) {
    storeDocFinal = await uploadBase64ToS3(storeDocFinal!, 'documents');
  }

  // Find or create document record
  let document = await Document.findOne({ where: { sellerId: sellerProfile.id } });
  if (document) {
    await document.update({
      aadhaarUrl: aadhaarFinal || document.aadhaarUrl,
      panUrl: panFinal || document.panUrl,
      gstUrl: gstFinal || document.gstUrl,
      storeDocUrl: storeDocFinal || document.storeDocUrl
    });
  } else {
    document = await Document.create({
      sellerId: sellerProfile.id,
      aadhaarUrl: aadhaarFinal,
      panUrl: panFinal,
      gstUrl: gstFinal,
      storeDocUrl: storeDocFinal
    });
  }

  // Update verified seller status to pending, is_active to false, and clear rejection reason
  await verifiedSeller.update({
    status: "pending",
    is_active: false,
    rejection_reason: null
  });

  return {
    message: "Seller documents reuploaded successfully",
    data: {
      document,
      verifiedSeller
    }
  };
};

