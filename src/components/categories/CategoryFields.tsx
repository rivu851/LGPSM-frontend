"use client";

import React, { useState } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import { CategoriesApi } from "@/hooks/useCategories";

type ModalState = { kind: "category" } | { kind: "subcategory"; categoryId: string } | null;

interface CategoryFieldsProps {
  api: CategoriesApi;
  categoryId: string;
  subcategoryId: string;
  onChange: (next: { categoryId: string; subcategoryId: string }) => void;
  // Admins can create categories/subcategories inline; the action sits inside each dropdown list
  canManage?: boolean;
  required?: boolean;
  categoryLabel?: string;
  subcategoryLabel?: string;
  categoryError?: string;
  subcategoryError?: string;
  labelClassName?: string;
}

// Category -> Subcategory pair used by event creation and template settings so both behave the same.
export default function CategoryFields({
  api,
  categoryId,
  subcategoryId,
  onChange,
  canManage = false,
  required = false,
  categoryLabel = "Category",
  subcategoryLabel = "Subcategory",
  categoryError,
  subcategoryError,
  labelClassName = "block text-sm font-medium text-gray-900 mb-1.5",
}: CategoryFieldsProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const subOptions = categoryId ? api.subcategoryOptionsFor(categoryId) : [];
  const star = required ? <span className="text-[#FF651D] ml-0.5">*</span> : null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>
            {categoryLabel}
            {star}
          </label>
          <CustomDropdown
            value={categoryId}
            onChange={(v) => onChange({ categoryId: v, subcategoryId: "" })}
            options={api.categoryOptions}
            placeholder={api.loading ? "Loading..." : api.categoryOptions.length ? "- Category -" : "No categories yet"}
            topAction={canManage ? { label: "Add New Category", onClick: () => setModal({ kind: "category" }) } : undefined}
            invalid={!!categoryError}
          />
          {api.error && <p className="mt-1 text-xs font-medium text-rose-600">{api.error}</p>}
          {categoryError && <p className="mt-1 text-xs font-medium text-rose-600">{categoryError}</p>}
        </div>
        <div>
          <label className={labelClassName}>
            {subcategoryLabel}
            {star}
          </label>
          <CustomDropdown
            value={subcategoryId}
            onChange={(v) => onChange({ categoryId, subcategoryId: v })}
            options={subOptions}
            disabled={!categoryId}
            placeholder={!categoryId ? "Select a category first" : subOptions.length ? "- Subcategory -" : "No subcategories yet"}
            topAction={canManage && categoryId ? { label: "Add New Subcategory", onClick: () => setModal({ kind: "subcategory", categoryId }) } : undefined}
            emptyMessage={canManage ? "No subcategories yet — add one above" : "No subcategories for this category"}
            invalid={!!subcategoryError}
          />
          {subcategoryError && <p className="mt-1 text-xs font-medium text-rose-600">{subcategoryError}</p>}
        </div>
      </div>

      {modal && (
        <CategoryModal
          key={modal.kind === "category" ? "category" : `sub-${modal.categoryId}`}
          api={api}
          state={modal}
          onClose={() => setModal(null)}
          onCreated={(created) => {
            setModal(null);
            if (created.kind === "category") onChange({ categoryId: created.id, subcategoryId: "" });
            else onChange({ categoryId: created.categoryId, subcategoryId: created.id });
          }}
        />
      )}
    </>
  );
}

type Created = { kind: "category"; id: string } | { kind: "subcategory"; id: string; categoryId: string };

export function CategoryModal({
  api,
  state,
  onClose,
  onCreated,
}: {
  api: CategoriesApi;
  state: { kind: "category" } | { kind: "subcategory"; categoryId: string };
  onClose: () => void;
  onCreated: (created: Created) => void;
}) {
  const [parentId, setParentId] = useState(state.kind === "subcategory" ? state.categoryId : "");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSub = state.kind === "subcategory";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (isSub && !parentId)) return;
    setSubmitting(true);
    setError(null);
    if (isSub) {
      const res = await api.addSubcategory(parentId, name);
      setSubmitting(false);
      if (!res.ok) return setError(res.message);
      onCreated({ kind: "subcategory", id: res.subcategoryId, categoryId: parentId });
    } else {
      const res = await api.addCategory(name);
      setSubmitting(false);
      if (!res.ok) return setError(res.message);
      onCreated({ kind: "category", id: res.category._id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 id="category-modal-title" className="text-base font-medium text-gray-900">
            {isSub ? "Add Subcategory" : "Add Category"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p role="alert" className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</p>}
          {isSub && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Category</label>
              <CustomDropdown value={parentId} onChange={setParentId} options={api.categoryOptions} placeholder="- Category -" />
            </div>
          )}
          <div>
            <label htmlFor="category-modal-name" className="block text-sm font-medium text-gray-900 mb-1.5">
              {isSub ? "Subcategory Name" : "Category Name"}
              <span className="text-[#FF651D] ml-0.5">*</span>
            </label>
            <input
              id="category-modal-name"
              autoFocus
              type="text"
              required
              maxLength={100}
              placeholder="Type"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D] text-gray-900"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || (isSub && !parentId)}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF651D] rounded-lg hover:bg-[#E5520F] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
