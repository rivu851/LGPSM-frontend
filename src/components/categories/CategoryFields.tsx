"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import CustomDropdown from "@/components/common/CustomDropdown";
import { CategoriesApi, CategoryOption } from "@/hooks/useCategories";
import { useAlert } from "@/context/AlertContext";

type ModalState = { kind: "category" } | { kind: "subcategory"; categoryId: string } | null;

interface CategoryFieldsProps {
  api: CategoriesApi;
  categoryId: string;
  subcategoryId: string;
  onChange: (next: { categoryId: string; subcategoryId: string }) => void;
  // Admins can create categories/subcategories inline; the action sits inside each dropdown list
  canManage?: boolean;
  required?: boolean;
  /** The subcategory stays optional even when the category is required (events) */
  subcategoryOptional?: boolean;
  categoryLabel?: string;
  subcategoryLabel?: string;
  categoryError?: string;
  subcategoryError?: string;
  labelClassName?: string;
  /** Layout of the two fields; "contents" lets them sit in the parent form's own grid */
  gridClassName?: string;
}

// Category -> Subcategory pair used by event creation and template settings so both behave the same.
export default function CategoryFields({
  api,
  categoryId,
  subcategoryId,
  onChange,
  canManage = false,
  required = false,
  subcategoryOptional = false,
  categoryLabel = "Category",
  subcategoryLabel = "Subcategory",
  categoryError,
  subcategoryError,
  labelClassName = "block text-sm font-medium text-gray-900 mb-1.5",
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 gap-4",
}: CategoryFieldsProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const { confirm, showAlert } = useAlert();
  const subOptions = categoryId ? api.subcategoryOptionsFor(categoryId) : [];
  const subcategoryIsOptional = !required || subcategoryOptional || (!!categoryId && subOptions.length === 0);

  // Organizers can remove their own custom entries from these lists. Nothing that already uses one is harmed: see the message.
  const removable = canManage && api.isOrganizer;
  const stripCustom = (label: string) => label.replace(/ \(custom\)$/, "");
  const deleteCategory = async (option: CategoryOption) => {
    const yes = await confirm({
      title: "Delete custom category",
      message: `Delete "${stripCustom(option.label)}"? It will no longer be offered for new events. Events that already use it keep it, and your templates under it become general templates. Adding the same name again brings it back.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!yes) return;
    const res = await api.removeCategory(option.value);
    if (!res.ok) return showAlert(res.message, "error");
    if (categoryId === option.value) onChange({ categoryId: "", subcategoryId: "" });
  };
  const deleteSubcategory = async (option: CategoryOption) => {
    const yes = await confirm({
      title: "Delete custom subcategory",
      message: `Delete "${stripCustom(option.label)}"? It will no longer be offered for new events. Events that already use it keep it, and your templates under it stay in the category. Adding the same name again brings it back.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!yes) return;
    const res = await api.removeSubcategory(categoryId, option.value);
    if (!res.ok) return showAlert(res.message, "error");
    if (subcategoryId === option.value) onChange({ categoryId, subcategoryId: "" });
  };
  const withDelete = (options: CategoryOption[], remove: (o: CategoryOption) => Promise<void>) =>
    removable ? options.map((o) => (o.custom ? { ...o, onRemove: () => void remove(o), removeLabel: `Delete ${stripCustom(o.label)}` } : o)) : options;
  const starMark = <span className="text-[#FF651D] ml-0.5">*</span>;
  const star = required ? starMark : null;
  // A subcategory can only be required once the chosen category has some; before that (or when it has none) the star would promise a rule that cannot apply
  const subStar = required && !subcategoryOptional && (!categoryId || subOptions.length > 0) ? starMark : null;

  return (
    <>
      <div className={gridClassName}>
        <div>
          <label className={labelClassName}>
            {categoryLabel}
            {star}
          </label>
          <CustomDropdown
            value={categoryId}
            onChange={(v) => onChange({ categoryId: v, subcategoryId: "" })}
            options={withDelete(api.categoryOptions, deleteCategory)}
            placeholder={api.loading ? "Loading..." : api.categoryOptions.length ? "- Category -" : "No categories yet"}
            topAction={canManage ? { label: api.isOrganizer ? "Add custom category" : "Add New Category", onClick: () => setModal({ kind: "category" }) } : undefined}
            invalid={!!categoryError}
            optional={!required}
          />
          {api.error && <p className="mt-1 text-xs font-medium text-rose-600">{api.error}</p>}
          {categoryError && <p className="mt-1 text-xs font-medium text-rose-600">{categoryError}</p>}
        </div>
        <div>
          <label className={labelClassName}>
            {subcategoryLabel}
            {subStar}
            {subcategoryIsOptional && <span className="font-normal text-[#828282]"> (optional)</span>}
          </label>
          <CustomDropdown
            value={subcategoryId}
            onChange={(v) => onChange({ categoryId, subcategoryId: v })}
            options={withDelete(subOptions, deleteSubcategory)}
            disabled={!categoryId}
            placeholder={!categoryId ? "Select a category first" : subOptions.length ? "- Subcategory -" : "No subcategories yet"}
            topAction={canManage && categoryId ? { label: api.isOrganizer ? "Add custom subcategory" : "Add New Subcategory", onClick: () => setModal({ kind: "subcategory", categoryId }) } : undefined}
            emptyMessage={canManage ? "No subcategories yet — add one above" : "No subcategories for this category"}
            invalid={!!subcategoryError}
            optional={subcategoryIsOptional}
          />
          {subcategoryError && <p className="mt-1 text-xs font-medium text-rose-600">{subcategoryError}</p>}
        </div>
      </div>

      {/* Portalled to <body>: this component sits inside the Add Event form, and a <form> may not nest inside a <form> */}
      {modal && createPortal(
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
        />,
        document.body
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
    // React events bubble through a portal to the parent tree, where Add Event's own form would take this submit as "Next"
    e.stopPropagation();
    if (isSub && !parentId) return setError("Choose the category first.");
    if (!name.trim()) return setError(`Enter a ${isSub ? "subcategory" : "category"} name.`);
    // The API asks for 2+ characters on a category; say so here rather than showing a generic validation failure
    if (!isSub && name.trim().length < 2) return setError("A category name needs at least 2 characters.");
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

  // Figma 2050:2411 / 2050:2142: a 486px card in the upper third, a divider above the footer, 47px field, solid Add button
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[14vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
      <div className="w-full max-w-[486px] bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0]">
          <h3 id="category-modal-title" className="text-base font-medium text-[#15191C]">
            {api.isOrganizer ? (isSub ? "Add Custom Subcategory" : "Add Custom Category") : isSub ? "Add Subcategory" : "Add Category"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#15191C] hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="px-6 pt-5 pb-6 space-y-5">
            {api.isOrganizer && <p className="text-xs text-[#828282]">Only you will see this {isSub ? "subcategory" : "category"}. It will not appear for other organizers.</p>}
            {error && <p role="alert" className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</p>}
            {isSub && (
              <div>
                <label className="block text-sm font-medium text-[#15191C] mb-2">Category</label>
                <CustomDropdown value={parentId} onChange={setParentId} options={api.categoryOptions} placeholder="- Category -" compact />
              </div>
            )}
            <div>
              <label htmlFor="category-modal-name" className="block text-sm font-medium text-[#15191C] mb-2">
                {isSub ? "Subcategory Name" : "Category Name"}
              </label>
              <input
                id="category-modal-name"
                autoFocus
                type="text"
                maxLength={api.isOrganizer ? 60 : 100}
                placeholder="Type"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[47px] px-3.5 text-xs border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D] text-gray-900 placeholder:text-[#828282]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0]">
            <button type="button" onClick={onClose} className="px-6 py-[11px] text-base font-semibold text-[#15191C] bg-white border border-[#E0E0E0] rounded-lg hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-[11px] text-base font-semibold text-white bg-[#FF651D] rounded-lg hover:bg-[#E5520F] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
