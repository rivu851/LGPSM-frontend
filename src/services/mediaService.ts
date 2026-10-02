import { apiClient, ApiResponse } from "./apiClient";

export interface PresignPayload {
  fileName: string;
  fileType: string;
  folder?: string;
}

export interface PresignData {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
}

export type MediaPurpose = "TEMPLATE" | "EVENT_LOGO" | "ORGANIZATION_LOGO" | "AVATAR";

export interface StoredImage {
  key: string; // "media:<id>"
  contentType: string;
  width: number;
  height: number;
  size: number;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp";

export const mediaService = {
  /**
   * Upload an image to the API's media store
   * POST /api/v1/media/upload (multipart: file, purpose)
   */
  async uploadImage(file: File, purpose: MediaPurpose): Promise<ApiResponse<StoredImage>> {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return { success: false, message: "Only JPG, PNG or WEBP images are supported." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { success: false, message: "Image must be 5 MB or smaller." };
    }
    const form = new FormData();
    form.append("purpose", purpose);
    form.append("file", file);
    return apiClient<StoredImage>("/api/v1/media/upload", { method: "POST", body: form }, true);
  },

  /**
   * Request a presigned S3 upload URL from the backend
   * POST /api/v1/media/presign
   */
  async presignUpload(payload: PresignPayload): Promise<ApiResponse<PresignData>> {
    return apiClient<PresignData>("/api/v1/media/presign", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * Upload file directly to S3 using the presigned URL
   */
  async uploadToS3(uploadUrl: string, file: File): Promise<boolean> {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
