"use client";

import CustomDropdown from "@/components/common/CustomDropdown";
import React, { useState } from "react";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { CategoriesApi } from "@/hooks/useCategories";
import { CARD_DESIGNS, CARD_DESIGN_LABELS, CardDesign } from "@/services/templateService";

export interface NewTemplateInput {
  name: string;
  categoryId: string;
  subcategoryId: string;
  previewImageKey: string;
  cardDesign: CardDesign;
  isPublished: boolean;
}

interface AddNewTemplateCardProps {
  categories: CategoriesApi;
  // Resolves true when the template was created, so the form only resets on success
  onAddTemplate: (input: NewTemplateInput) => Promise<boolean>;
}

export default function AddNewTemplateCard({ categories, onAddTemplate }: AddNewTemplateCardProps) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState({ categoryId: "", subcategoryId: "" });
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [cardDesign, setCardDesign] = useState<CardDesign>("CLASSIC");
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    name: !name.trim() ? "Template name is required." : undefined,
    category: !cat.categoryId ? "Choose a category." : undefined,
    subcategory: !cat.subcategoryId ? "Choose a subcategory." : undefined,
    image: !imageKey ? "Upload the card template image." : undefined,
  };
  const shown: Partial<typeof errors> = showErrors ? errors : {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(Boolean) || uploading) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    const ok = await onAddTemplate({ name: name.trim(), ...cat, previewImageKey: imageKey!, cardDesign, isPublished });
    setSubmitting(false);
    if (ok) {
      setName("");
      setCat({ categoryId: "", subcategoryId: "" });
      setImageKey(null);
      setCardDesign("CLASSIC");
      setIsPublished(false);
      setShowErrors(false);
    }
  };

  const labelCls = "block text-sm font-medium text-gray-900 mb-1.5";
  return (
    // Figma 2029:1828: name, category and subcategory share one row; the upload box sits under them, then Publish and the button
    <section className="bg-white rounded-lg border border-[#E0E0E0] p-5 sm:p-7">
      <h2 className="text-[22px] font-medium text-[#15191C] mb-5">Add New Template</h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-[18px] gap-y-5">
          <div className="min-w-0">
            <label htmlFor="new-template-name" className={labelCls}>
              Template Name<span className="text-[#C44200] ml-0.5">*</span>
            </label>
            <input
              id="new-template-name"
              type="text"
              maxLength={100}
              placeholder="Type"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            gridClassName="contents"
            categoryError={shown.category}
            subcategoryError={shown.subcategory}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-[18px] gap-y-5">
          <div className="min-w-0">
            <ImageUploadField
              label={<>Upload Card Template<span className="text-[#C44200] ml-0.5">*</span></>}
              value={imageKey}
              onChange={setImageKey}
              purpose="TEMPLATE"
              aspectClassName="aspect-[334/120]"
              emptyClassName="flex flex-col items-center justify-center min-h-[120px]"
              onUploadingChange={setUploading}
            />
            {shown.image && <p className="mt-1 text-xs font-medium text-rose-600">{shown.image}</p>}
          </div>
          {/* Not in the Figma frame, but every template needs one: it fills the empty space beside the upload box */}
          <div className="min-w-0">
            <span className={labelCls}>
              Invitation Card Design<span className="text-[#C44200] ml-0.5">*</span>
            </span>
            <CustomDropdown ariaLabel="Invitation Card Design" value={cardDesign} onChange={(v) => setCardDesign(v as CardDesign)} options={CARD_DESIGNS.map((d) => ({ value: d, label: CARD_DESIGN_LABELS[d] }))} />
            <p className="mt-1 text-xs text-[#6B6B6B]">The layout generated for each invitee&apos;s PDF/QR card — separate from the preview image.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span id="new-template-publish" className="text-sm font-medium text-gray-900">Publish</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            aria-labelledby="new-template-publish"
            onClick={() => setIsPublished((v) => !v)}
            className={`relative inline-flex h-6 w-[50px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isPublished ? "bg-[#FF651D]" : "bg-[#E6E6E6]"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-[26px]" : "translate-x-0"}`} />
          </button>
          <span className="text-xs text-[#6B6B6B]">{isPublished ? "Organizers can pick it" : "Saved as draft: hidden when choosing a template"}</span>
        </div>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-6 py-[11px] bg-[#C65318] text-white text-base font-semibold rounded-lg hover:bg-[#A83800] disabled:opacity-60 cursor-pointer"
        >
          {submitting ? "Adding..." : "Add Template"}
        </button>
      </form>
    </section>
  );
}
