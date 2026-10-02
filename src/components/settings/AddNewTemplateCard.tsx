"use client";

import React, { useState } from "react";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { CategoriesApi } from "@/hooks/useCategories";

export interface NewTemplateInput {
  name: string;
  categoryId: string;
  subcategoryId: string;
  previewImageKey: string;
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
  const [isPublished, setIsPublished] = useState(false);
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
    const ok = await onAddTemplate({ name: name.trim(), ...cat, previewImageKey: imageKey!, isPublished });
    setSubmitting(false);
    if (ok) {
      setName("");
      setCat({ categoryId: "", subcategoryId: "" });
      setImageKey(null);
      setIsPublished(false);
      setShowErrors(false);
    }
  };

  return (
    <section className="bg-white rounded-md border border-[#E0E0E0] p-4 sm:p-6">
      <h2 className="text-base font-medium text-gray-900 mb-5">Add New Template</h2>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        <div className="space-y-5 min-w-0">
          <div>
            <label htmlFor="new-template-name" className="block text-sm font-medium text-gray-900 mb-1.5">
              Template Name<span className="text-[#FF651D] ml-0.5">*</span>
            </label>
            <input
              id="new-template-name"
              type="text"
              maxLength={100}
              placeholder="Type"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!shown.name}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D] text-gray-900"
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
            categoryError={shown.category}
            subcategoryError={shown.subcategory}
          />
          <div className="flex items-center gap-3">
            <span id="new-template-publish" className="text-sm font-medium text-gray-900">Publish</span>
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              aria-labelledby="new-template-publish"
              onClick={() => setIsPublished((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isPublished ? "bg-[#FF651D]" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className="text-xs text-[#828282]">{isPublished ? "Organizers can pick it" : "Saved as draft"}</span>
          </div>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-6 py-2.5 bg-[#FF651D] text-white text-sm font-medium rounded-md hover:bg-[#E5520F] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Adding..." : "Add Template"}
          </button>
        </div>
        <div>
          <ImageUploadField
            label={<>Upload Card Template<span className="text-[#FF651D] ml-0.5">*</span></>}
            value={imageKey}
            onChange={setImageKey}
            purpose="TEMPLATE"
            onUploadingChange={setUploading}
          />
          {shown.image && <p className="mt-1 text-xs font-medium text-rose-600">{shown.image}</p>}
        </div>
      </form>
    </section>
  );
}
