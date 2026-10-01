"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ACCEPTED_IMAGE_TYPES, MediaPurpose, mediaService } from "@/services/mediaService";
import { resolveImageUrl } from "@/utils/mediaUrl";

interface ImageUploadFieldProps {
  // Stored image reference ("media:<id>", URL or site path); empty when there is no image
  value: string | null;
  onChange: (key: string | null) => void;
  purpose: MediaPurpose;
  label?: React.ReactNode;
  hint?: string;
  aspectClassName?: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

// Uploads immediately and previews the stored copy, so what the user sees here is exactly what
// every other screen renders from the saved key.
export default function ImageUploadField({
  value,
  onChange,
  purpose,
  label,
  hint = "JPG, PNG or WEBP, up to 5 MB",
  aspectClassName = "aspect-[3/4]",
  disabled = false,
  onUploadingChange,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = resolveImageUrl(value);

  const upload = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setUploading(true);
    onUploadingChange?.(true);
    const res = await mediaService.uploadImage(file, purpose);
    setUploading(false);
    onUploadingChange?.(false);
    if (inputRef.current) inputRef.current.value = "";
    if (res.success && res.data?.key) onChange(res.data.key);
    else setError(res.message || "Upload failed. Please try again.");
  };

  return (
    <div>
      {label && <div className="block text-sm font-medium text-gray-900 mb-1.5">{label}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {preview ? (
        <div className={`relative w-full ${aspectClassName} rounded-md overflow-hidden border border-[#E0E0E0] bg-[#F4F5F8]`}>
          <Image src={preview} alt="Uploaded image preview" fill unoptimized sizes="400px" className="object-contain" />
          <div className="absolute bottom-2 left-2 right-2 flex gap-2 justify-center">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-md bg-white/95 border border-gray-200 text-xs font-medium text-gray-800 hover:bg-white cursor-pointer disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Replace"}
            </button>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onChange(null)}
              className="px-3 py-1.5 rounded-md bg-white/95 border border-gray-200 text-xs font-medium text-rose-600 hover:bg-white cursor-pointer disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`w-full rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors cursor-pointer disabled:cursor-not-allowed ${
            dragOver ? "border-[#FF651D] bg-orange-50/50" : "border-[#D3D3D3] bg-[#FAFAFA] hover:border-[#FF651D]"
          }`}
        >
          <span className="text-[#4B4F52]">
            {uploading ? "Uploading..." : (
              <>
                Drag and drop an image here or <span className="text-[#E5520F] font-medium underline">click to open file</span>
              </>
            )}
          </span>
          <span className="block mt-1 text-xs text-[#828282]">{hint}</span>
        </button>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
