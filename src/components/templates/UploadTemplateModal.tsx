"use client";

import React, { useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { useCategories } from "@/hooks/useCategories";
import { useOverlayClose } from "@/hooks/useOverlayClose";
import TextAreasEditor from "@/components/templates/TextAreasEditor";
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
  // an administrator's upload is dynamic: right after saving, the wording in the picture is checked (and fixed or marked by hand) here
  const [areas, setAreas] = useState<{ template: Template; intro: { detected: boolean; reason?: string } | null } | null>(null);
  const overlayClose = useOverlayClose(onClose, saving || !!areas);

  const errors = {
    // the name is optional; an organizer's upload has no event type (it suits every event), an admin's shared one needs it
    name: name.trim().length === 1 ? "A name needs at least 2 characters, or leave it empty." : undefined,
    category: !categories.isOrganizer && !cat.categoryId ? "Choose the event type this design is for." : undefined,
    image: !imageKey ? "Upload your design." : undefined,
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(Boolean) || uploading) { setShowErrors(true); return; }
    setSaving(true);
    setError(null);
    const res = await templateService.uploadOwnTemplate({ ...(name.trim() ? { name: name.trim() } : {}), imageKey: imageKey!, ...(!categories.isOrganizer && cat.categoryId ? { categoryId: cat.categoryId } : {}), ...(!categories.isOrganizer && cat.subcategoryId ? { subcategoryId: cat.subcategoryId } : {}) });
    setSaving(false);
    if (res.success && res.data) {
      const made = res.data as Template & { detection?: { detected: boolean; reason?: string } | null };
      // only an admin's design (whose wording the event's details replace) has areas to check; an organizer's own design is the card as it is
      if (made.templateData?.dynamicDetails) setAreas({ template: made, intro: made.detection ?? null });
      else onCreated(res.data);
    }
    else setError(res.message || "The template could not be saved. Please try again.");
  };

  const shown: Partial<typeof errors> = showErrors ? errors : {};
  if (areas) return <TextAreasEditor templateId={areas.template._id || areas.template.id || ""} intro={areas.intro} onClose={() => onCreated(areas.template)} />;
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
            {categories.isOrganizer
              ? "Upload your finished invitation design. Your artwork is the card; each guest's own QR code and name are placed at the bottom of it, so leave that area calm. Only you can use this template."
              : "Upload a background picture. Like the other templates, each event's own name, date and time and venue are written over the wording already in your picture (the picture around them is kept), and the guest's name and QR code are added at the bottom. After saving you check where that wording is. Pick the event category and subcategory it is for: every organizer can then use it for those events."}
          </p>
          <div>
            <label htmlFor="own-template-name" className="block text-sm font-medium text-gray-900 mb-1.5">Template name <span className="font-normal text-[#6B6B6B]">(optional)</span></label>
            <input
              id="own-template-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Gala 2026 (optional)"
              aria-invalid={!!shown.name}
              className="w-full h-[44px] px-3.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-black text-gray-900"
            />
            {shown.name && <p className="mt-1 text-xs font-medium text-rose-600">{shown.name}</p>}
          </div>
          {!categories.isOrganizer && (
          <CategoryFields
            api={categories}
            categoryId={cat.categoryId}
            subcategoryId={cat.subcategoryId}
            onChange={setCat}
            canManage={!categories.isOrganizer}
            required
            subcategoryOptional
            categoryLabel="Event Category"
            subcategoryLabel="Event Subcategory"
            categoryError={shown.category}
            labelClassName="block text-sm font-medium text-gray-900 mb-1.5"
          />
          )}
          <div>
            <ImageUploadField
              label={<>Your design<span className="text-[#1F65FF] ml-0.5">*</span></>}
              value={imageKey}
              onChange={setImageKey}
              purpose="TEMPLATE"
              hint="JPG, PNG or WEBP, up to 5 MB. You crop it to 9:16 (for example 1080 × 1920) so every card has the same shape."
              aspectClassName="aspect-[9/16]"
              cropAspect={{ ratio: 9 / 16, label: "9:16" }}
              emptyClassName="flex flex-col items-center justify-center min-h-[160px]"
              onUploadingChange={setUploading}
            />
            {shown.image && <p className="mt-1 text-xs font-medium text-rose-600">{shown.image}</p>}
            {categories.isOrganizer && imageKey && (
              <p role="status" className="mt-2 rounded-md border border-[#C7D7FE] bg-[#EEF4FF] px-3 py-2 text-xs text-[#1D3A8A]">
                Your uploaded card is used exactly as it is, so the event logo is not added to it. The Event Logo option in Event Details is turned off for this card.
              </p>
            )}
          </div>
          <PopupMessage message={error} />
          <div className="flex justify-end gap-3 pt-1">
            <button type="submit" disabled={saving || uploading} className="px-6 py-2.5 bg-[#1F65FF] hover:bg-[#1A56DB] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-60">
              {saving ? "Saving…" : uploading ? "Uploading…" : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
