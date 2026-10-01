"use client";

import React, { useState } from "react";
import { TemplateItem } from "@/types/settings";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { CategoriesApi } from "@/hooks/useCategories";

interface EditTemplateModalProps {
  template: TemplateItem;
  categories: CategoriesApi;
  onClose: () => void;
  // Resolve true on success; the modal stays open (with the error shown by the page) otherwise
  onSave: (updated: TemplateItem) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

// Mounted per template (keyed by id), so its state starts from that template
export default function EditTemplateModal({ template, categories, onClose, onSave, onDelete }: EditTemplateModalProps) {
  const [name, setName] = useState(template.name);
  const [cat, setCat] = useState({ categoryId: template.categoryId, subcategoryId: template.subcategoryId });
  const [imageKey, setImageKey] = useState<string | null>(template.imageKey);
  const [isPublished, setIsPublished] = useState(template.status === "Published");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalid = !name.trim() || !cat.categoryId || !cat.subcategoryId || !imageKey;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || uploading) return;
    setBusy(true);
    const ok = await onSave({ ...template, name: name.trim(), ...cat, imageKey, status: isPublished ? "Published" : "Saved on Draft" });
    setBusy(false);
    if (ok) onClose();
  };

  const remove = async () => {
    setBusy(true);
    const ok = await onDelete(template.id);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-template-title">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 id="edit-template-title" className="text-base font-medium text-gray-900">Edit Template</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={save} className="p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <ImageUploadField value={imageKey} onChange={setImageKey} purpose="TEMPLATE" onUploadingChange={setUploading} />
          <div className="space-y-4 min-w-0">
            <div>
              <label htmlFor="edit-template-name" className="block text-sm font-medium text-gray-900 mb-1.5">
                Template Name<span className="text-[#FF651D] ml-0.5">*</span>
              </label>
              <input
                id="edit-template-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D] text-gray-900"
              />
            </div>
            <CategoryFields api={categories} categoryId={cat.categoryId} subcategoryId={cat.subcategoryId} onChange={setCat} canManage required />
            <div className="flex items-center gap-3">
              <span id="edit-template-publish" className="text-sm font-medium text-gray-900">Publish</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                aria-labelledby="edit-template-publish"
                onClick={() => setIsPublished((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isPublished ? "bg-[#FF651D]" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            {invalid && <p className="text-xs text-[#828282]">Name, category, subcategory and an image are required.</p>}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={busy || uploading || invalid}
                className="px-5 py-2.5 bg-[#FF651D] text-white text-sm font-medium rounded-lg hover:bg-[#E5520F] disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Saving..." : "Save Template"}
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">Delete this template?</span>
                  <button type="button" disabled={busy} onClick={remove} className="font-medium text-rose-600 hover:underline cursor-pointer">Yes, delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-gray-600 hover:underline cursor-pointer">Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-rose-600 hover:underline cursor-pointer">
                  Delete Template
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
