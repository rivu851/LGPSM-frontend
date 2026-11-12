"use client";

import React, { useState } from "react";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { useCategories } from "@/hooks/useCategories";
import { useOverlayClose } from "@/hooks/useOverlayClose";
import { templateService, type Template } from "@/services/templateService";

interface Props {
  onClose: () => void;
  /** The new template, already saved under My templates */
  onCreated: (template: Template) => void;
}

// "Upload your own template": the organizer's finished invitation design becomes the card. Their artwork carries the event
// details; the guest's own QR code and name are placed on it (bottom, on a white panel), so every guest still gets a scannable pass.
export default function UploadTemplateModal({ onClose, onCreated }: Props) {
  const categories = useCategories();
  const [name, setName] = useState("");
  const [cat, setCat] = useState({ categoryId: "", subcategoryId: "" });
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayClose = useOverlayClose(onClose, saving);

  const errors = {
    name: name.trim().length < 2 ? "Enter a name for the template." : undefined,
    category: !cat.categoryId ? "Choose the event type this design is for." : undefined,
    image: !imageKey ? "Upload your design." : undefined,
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(Boolean) || uploading) { setShowErrors(true); return; }
    setSaving(true);
    setError(null);
    const res = await templateService.uploadOwnTemplate({ name: name.trim(), imageKey: imageKey!, categoryId: cat.categoryId, ...(cat.subcategoryId ? { subcategoryId: cat.subcategoryId } : {}) });
    setSaving(false);
    if (res.success && res.data) onCreated(res.data);
    else setError(res.message || "The template could not be saved. Please try again.");
  };

  const shown: Partial<typeof errors> = showErrors ? errors : {};
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="upload-template-title" {...overlayClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 id="upload-template-title" className="text-base font-medium text-gray-900">Upload your own template</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="text-gray-500 hover:text-gray-600 cursor-pointer disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={save} noValidate className="px-6 py-5 space-y-5">
          <p className="text-sm text-[#4B4F52]">
            Upload your finished invitation design. Your artwork is the card; each guest&apos;s own QR code and name are placed at the bottom of it, so leave that area calm. {categories.isOrganizer ? "Only you can use this template." : "Only you can pick this template; an organizer you create an event for gets their own copy of it."}
          </p>
          <div>
            <label htmlFor="own-template-name" className="block text-sm font-medium text-gray-900 mb-1.5">Template name<span className="text-[#C44200] ml-0.5">*</span></label>
            <input
              id="own-template-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Gala 2026"
              aria-invalid={!!shown.name}
              className="w-full h-[44px] px-3.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D] text-gray-900"
            />
            {shown.name && <p className="mt-1 text-xs font-medium text-rose-600">{shown.name}</p>}
          </div>
          <CategoryFields
            api={categories}
            categoryId={cat.categoryId}
            subcategoryId={cat.subcategoryId}
            onChange={setCat}
            canManage
            required
            subcategoryOptional
            categoryLabel="Event Category"
            subcategoryLabel="Event Subcategory"
            categoryError={shown.category}
            labelClassName="block text-sm font-medium text-gray-900 mb-1.5"
          />
          <div>
            <ImageUploadField
              label={<>Your design<span className="text-[#C44200] ml-0.5">*</span></>}
              value={imageKey}
              onChange={setImageKey}
              purpose="TEMPLATE"
              hint="JPG, PNG or WEBP, up to 5 MB. Portrait works best (for example 1080 × 1920)."
              aspectClassName="aspect-[3/4]"
              emptyClassName="flex flex-col items-center justify-center min-h-[160px]"
              onUploadingChange={setUploading}
            />
            {shown.image && <p className="mt-1 text-xs font-medium text-rose-600">{shown.image}</p>}
          </div>
          {error && <p role="alert" className="text-sm font-medium text-rose-600 break-words">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-800 rounded-md cursor-pointer disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="px-6 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-60">
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
