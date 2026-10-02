"use client";

import React, { useState } from "react";
import { TemplateItem } from "@/types/settings";
import TemplateGridItem from "./TemplateGridItem";
import CustomDropdown from "@/components/common/CustomDropdown";
import { CategoriesApi } from "@/hooks/useCategories";

interface TemplateFilterGridProps {
  templates: TemplateItem[];
  categories: CategoriesApi;
  loading?: boolean;
  // Omitted for read-only viewers (template management is admin-only)
  onEditTemplate?: (template: TemplateItem) => void;
}

export default function TemplateFilterGrid({ templates, categories, loading = false, onEditTemplate }: TemplateFilterGridProps) {
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = templates.filter(
    (t) =>
      (!selectedCat || t.categoryId === selectedCat) &&
      (!selectedSub || t.subcategoryId === selectedSub) &&
      (!statusFilter || t.status === statusFilter)
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</label>
          <CustomDropdown
            value={selectedCat}
            onChange={(v) => {
              setSelectedCat(v);
              setSelectedSub("");
            }}
            options={[{ value: "", label: "All Categories" }, ...categories.categoryOptions]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Subcategory</label>
          <CustomDropdown
            value={selectedSub}
            onChange={setSelectedSub}
            disabled={!selectedCat}
            placeholder={selectedCat ? "All Subcategories" : "Select a category first"}
            options={selectedCat ? [{ value: "", label: "All Subcategories" }, ...categories.subcategoryOptionsFor(selectedCat)] : []}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Template Status</label>
          <CustomDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All Status" },
              { value: "Published", label: "Published" },
              { value: "Saved on Draft", label: "Saved on Draft" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#828282]">Loading templates...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-[#E0E0E0] p-8 text-center text-sm text-[#828282]">
          {templates.length === 0 ? "No templates have been added yet." : "No templates match the selected filters."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((t) => (
            <TemplateGridItem
              key={t.id}
              template={t}
              onEdit={onEditTemplate}
              categoryLabel={[categories.categoryName(t.categoryId), categories.subcategoryName(t.categoryId, t.subcategoryId)].filter(Boolean).join(" · ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
