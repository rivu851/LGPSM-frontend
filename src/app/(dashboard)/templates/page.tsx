"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import CustomDropdown from "@/components/common/CustomDropdown";
import TemplateThumb from "@/components/settings/TemplateThumb";
import { useCategories } from "@/hooks/useCategories";
import { templateService, Template } from "@/services/templateService";

interface TemplateCard {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  imageKey: string | null;
  isDraft: boolean;
}

// Browse templates; organizers see published ones (backend-enforced), admins also see drafts
export default function TemplatesPage() {
  const { user } = useAuth();
  const categories = useCategories();
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplateCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templateService.getTemplates().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setTemplates(
          res.data.map((t: Template) => ({
            id: t._id || t.id || "",
            name: t.name,
            categoryId: typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "",
            subcategoryId: t.subcategoryId || "",
            imageKey: t.previewImageKey || null,
            isDraft: t.isPublished === false,
          }))
        );
      } else {
        setLoadError(res.message || "Failed to load templates.");
      }
      setLoading(false);
    });
  }, []);

  const visible = templates.filter(
    (t) => (!selectedCategory || t.categoryId === selectedCategory) && (!selectedSubcategory || t.subcategoryId === selectedSubcategory)
  );
  const labelFor = (t: TemplateCard) =>
    [categories.categoryName(t.categoryId), categories.subcategoryName(t.categoryId, t.subcategoryId)].filter(Boolean).join(" · ") || "Uncategorized";

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Templates" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</label>
            <CustomDropdown
              value={selectedCategory}
              onChange={(v) => {
                setSelectedCategory(v);
                setSelectedSubcategory("");
              }}
              options={[{ value: "", label: "All Categories" }, ...categories.categoryOptions]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Subcategory</label>
            <CustomDropdown
              value={selectedSubcategory}
              onChange={setSelectedSubcategory}
              disabled={!selectedCategory}
              placeholder={selectedCategory ? "All Subcategories" : "Select a category first"}
              options={selectedCategory ? [{ value: "", label: "All Subcategories" }, ...categories.subcategoryOptionsFor(selectedCategory)] : []}
            />
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-[#828282]">Loading templates...</p>
        ) : loadError ? (
          <p role="alert" className="py-16 text-center text-sm text-rose-600 break-words">{loadError}</p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#828282]">
            {templates.length === 0 ? "No templates are available yet." : "No templates match the selected category."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {visible.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreview(t)}
                className="text-left bg-white border border-[#E0E0E0] rounded-md overflow-hidden hover:border-[#FF651D] transition-colors cursor-pointer"
              >
                <div className="relative">
                  <TemplateThumb imageKey={t.imageKey} name={t.name} />
                  {t.isDraft && <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 border border-gray-200 text-xs text-gray-700">Draft</span>}
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-[#828282] truncate">{labelFor(t)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full my-auto">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 id="template-preview-title" className="text-base font-medium text-gray-900">Template Preview</h3>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <TemplateThumb imageKey={preview.imageKey} name={preview.name} className="rounded-md border border-[#E0E0E0]" />
              <div className="space-y-4 min-w-0">
                <div>
                  <h4 className="text-xl font-medium text-gray-900 break-words">{preview.name}</h4>
                  <p className="text-sm text-[#4B4F52] mt-1">{labelFor(preview)}</p>
                </div>
                <p className="text-sm text-gray-800 bg-[#FEF9C3] border border-[#FEF08A] rounded-md p-3">
                  Create an event with this template to preview it with your event details.
                </p>
                {preview.isDraft ? (
                  <p className="text-sm text-[#828282]">This template is a draft. Publish it from Template Settings before organizers can use it.</p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {!preview.isDraft && (
                    <Link href={`/events/add?template=${preview.id}`} className="px-5 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md">
                      Create an Event
                    </Link>
                  )}
                  {user?.role === "ADMIN" && (
                    <Link href="/settings/template" className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-md">
                      Manage Templates
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
