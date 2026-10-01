"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CustomDropdown from "@/components/common/CustomDropdown";
import TemplateThumb from "@/components/settings/TemplateThumb";
import { templateService, Template } from "@/services/templateService";
import { useCategories } from "@/hooks/useCategories";
import { SelectedTemplate } from "../eventDraft";

interface SelectTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: SelectedTemplate | null) => void;
  selectedTemplateId?: string | null;
  // Pre-filter by the event's category/subcategory when chosen
  categoryId?: string;
  subcategoryId?: string;
}

const templateCategoryId = (t: Template) => (typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "");

// The parent remounts this modal (via key) each time it opens, so its state starts from the props
export default function SelectTemplateModal({ isOpen, onClose, onSelectTemplate, selectedTemplateId, categoryId, subcategoryId }: SelectTemplateModalProps) {
  const categories = useCategories();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(isOpen);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState(categoryId || "");
  const [filterSub, setFilterSub] = useState(subcategoryId || "");
  const [pendingId, setPendingId] = useState<string | null>(selectedTemplateId || null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    templateService.getTemplates().then((res) => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) setTemplates(res.data.filter((t) => t.isPublished !== false));
      else setLoadError(res.message || "Failed to load templates.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const visible = templates.filter(
    (t) => (!filterCategory || templateCategoryId(t) === filterCategory) && (!filterSub || t.subcategoryId === filterSub)
  );

  const handleSave = () => {
    const chosen = templates.find((t) => t._id === pendingId);
    onSelectTemplate(chosen ? { id: chosen._id, name: chosen.name, previewKey: chosen.previewImageKey || null } : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="select-template-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h2 id="select-template-title" className="text-base font-medium text-gray-900">Select Template</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</span>
            <CustomDropdown
              value={filterCategory}
              onChange={(v) => {
                setFilterCategory(v);
                setFilterSub("");
              }}
              options={[{ value: "", label: "All categories" }, ...categories.categoryOptions]}
              ariaLabel="Filter templates by category"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Event Subcategory</span>
            <CustomDropdown
              value={filterSub}
              onChange={setFilterSub}
              disabled={!filterCategory}
              placeholder={filterCategory ? "All subcategories" : "Select a category first"}
              options={filterCategory ? [{ value: "", label: "All subcategories" }, ...categories.subcategoryOptionsFor(filterCategory)] : []}
              ariaLabel="Filter templates by subcategory"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[220px]">
          {loading ? (
            <p className="text-sm text-[#828282] py-10 text-center">Loading templates...</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-rose-600 py-10 text-center break-words">{loadError}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-[#828282] py-10 text-center">
              {templates.length === 0 ? "No templates have been published yet." : "No templates for this category. Try another category or clear the filter."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visible.map((t) => {
                const selected = pendingId === t._id;
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => setPendingId(selected ? null : t._id)}
                    aria-pressed={selected}
                    className={`text-left rounded-md overflow-hidden border-2 cursor-pointer ${selected ? "border-[#FF651D]" : "border-transparent hover:border-gray-300"}`}
                  >
                    <TemplateThumb imageKey={t.previewImageKey} name={t.name} />
                    <span className="block px-1.5 py-1 text-xs font-medium text-gray-900 truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E5E5] flex flex-wrap justify-between items-center gap-3">
          <p className="text-xs text-[#4B4F52]">
            Need a custom design?{" "}
            <Link href="/contact" className="text-[#16A34A] font-medium underline">Contact us</Link>
          </p>
          <div className="flex items-center gap-3">
            {pendingId && (
              <button type="button" onClick={() => setPendingId(null)} className="text-sm text-gray-700 hover:underline cursor-pointer">
                Clear selection
              </button>
            )}
            <button type="button" onClick={handleSave} className="px-6 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
