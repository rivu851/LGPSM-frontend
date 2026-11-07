"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import CustomDropdown from "@/components/common/CustomDropdown";
import TemplateThumb from "@/components/settings/TemplateThumb";
import { templateService, Template } from "@/services/templateService";
import { useCategories, ExtraCategory } from "@/hooks/useCategories";
import { SelectedTemplate } from "../eventDraft";
import { eventTypeForChoice, eventTypeForTemplate } from "@/utils/templateEventType";
import UploadTemplateModal from "@/components/templates/UploadTemplateModal";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/context/AlertContext";

interface SelectTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `suggested` is the event type the template was made for, so the form can follow the choice */
  onSelectTemplate: (template: SelectedTemplate | null, suggested?: { categoryId: string; subcategoryId: string }) => void;
  selectedTemplateId?: string | null;
  // Pre-filter by the event's category/subcategory when chosen
  categoryId?: string;
  subcategoryId?: string;
  /** A new event starts here: a template must be chosen, and the dialog cannot be cleared or skipped until it is */
  required?: boolean;
  /** Where "Leave Add Event" goes, when someone closes the window with no template chosen */
  onLeave?: () => void;
  /** The event's own category, for an account whose list does not include it */
  extraCategory?: ExtraCategory | null;
}

const templateCategoryId = (t: Template) => (typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "");

// The parent remounts this modal (via key) each time it opens, so its state starts from the props
export default function SelectTemplateModal({ isOpen, onClose, onSelectTemplate, selectedTemplateId, categoryId, subcategoryId, required = false, onLeave, extraCategory }: SelectTemplateModalProps) {
  const categories = useCategories(extraCategory);
  const { user } = useAuth();
  const { confirm, showAlert } = useAlert();
  // everything about templates is done here: pick, upload, and remove the ones the organizer made
  const [scope, setScope] = useState<"all" | "mine">("all");
  const isMine = (t: Template) => !!user?._id && t.ownerId === user._id;
  // an admin's list holds every template, organizers' private ones too, and those cannot serve this event: they are not offered
  // (the one the event already uses stays, so it is still shown as selected)
  const offered = (t: Template) => !t.ownerId || isMine(t) || t.isSystemTemplate || t._id === selectedTemplateId;
  // a design shared with all organizers is managed on the Templates page, not removed from a picker
  const canDelete = (t: Template) => isMine(t) && !t.isSystemTemplate;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(isOpen);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosenCategory, setFilterCategory] = useState(categoryId || "");
  const [chosenSub, setFilterSub] = useState(subcategoryId || "");
  // A filter on a category or subcategory that is no longer offered would hide templates behind an empty-looking dropdown
  const filterCategory = !categories.loading && chosenCategory && !categories.categoryOptions.some((o) => o.value === chosenCategory) ? "" : chosenCategory;
  const filterSub = !filterCategory || (!categories.loading && chosenSub && !categories.subcategoryOptionsFor(filterCategory).some((o) => o.value === chosenSub)) ? "" : chosenSub;
  const [pendingId, setPendingId] = useState<string | null>(selectedTemplateId || null);
  const [uploadOpen, setUploadOpen] = useState(false);
  // The app's dialog keyboard support moves focus to the first control when a dialog opens, which here is the category dropdown and
  // shows it with a focus ring as if it were being edited. The window itself takes the focus instead (Tab still reaches every control).
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) cardRef.current?.focus({ preventScroll: true });
  }, [isOpen]);
  // bumped after an upload so the list is fetched again and shows the new template
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [isOpen, reloadKey]);

  if (!isOpen) return null;

  // A template with no category suits every event type, so it is always offered; a category filter narrows the rest.
  // Within a category, templates made for a specific subcategory only show for that subcategory, general ones always do.
  const mineCount = templates.filter((t) => isMine(t)).length;
  const visible = templates.filter(
    (t) =>
      offered(t) &&
      (scope === "all" || isMine(t)) &&
      (!templateCategoryId(t) ||
      ((!filterCategory || templateCategoryId(t) === filterCategory) && (!filterSub || !t.subcategoryId || t.subcategoryId === filterSub)))
  );

  const removeOwn = async (t: Template) => {
    if (!(await confirm({ title: "Delete template", message: `Delete "${t.name}"? Events already using it will switch to the default design for their type.`, confirmText: "Delete", tone: "danger" }))) return;
    const res = await templateService.deleteTemplate(t._id);
    if (!res.success) return showAlert(res.message || "The template could not be deleted.", "error");
    if (pendingId === t._id) setPendingId(null);
    // the event must not keep pointing at a template that no longer exists
    if (selectedTemplateId === t._id) onSelectTemplate(null);
    setReloadKey((n) => n + 1);
  };

  // The window is how an event gets its template, so it cannot be dismissed empty-handed while one is still required
  const requestClose = async () => {
    if (!(required && !selectedTemplateId)) return onClose();
    // the window covers the whole screen, so someone who does not want to add an event after all also needs a way out
    const leave = await confirm({
      title: "A template is required",
      message: pendingId
        ? "You have selected a template. Press “Use this template” to continue, or leave Add Event if you do not want to create an event now."
        : "Please select a template to continue. A template is required to create an event. You can also leave Add Event if you do not want to create one now.",
      confirmText: "Leave Add Event",
      cancelText: "Choose a template",
    });
    if (leave) onLeave?.();
  };

  const handleSave = () => {
    const chosen = templates.find((t) => t._id === pendingId);
    if (required && !chosen) return;
    onSelectTemplate(
      chosen ? { id: chosen._id, name: chosen.name, previewKey: chosen.previewImageKey || null } : null,
      chosen ? eventTypeForChoice(eventTypeForTemplate(chosen, categories.categoryOptions, categories.subcategoryOptionsFor), filterCategory, filterSub) ?? undefined : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay" role="dialog" aria-modal="true" aria-labelledby="select-template-title">
      <div ref={cardRef} tabIndex={-1} className="bg-white rounded-lg shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] animate-modal outline-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h2 id="select-template-title" className="text-base font-medium text-gray-900">{required ? "Choose a template to start your event" : "Select Template"}</h2>
          <button type="button" onClick={() => void requestClose()} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {required && <p className="px-6 pt-3 text-sm text-[#4B4F52]">The template decides how every guest&apos;s card looks and sets the event category and subcategory for you. You can change the template later while creating the event.</p>}

        <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</span>
            <CustomDropdown portal
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
            <CustomDropdown portal
              value={filterSub}
              onChange={setFilterSub}
              disabled={!filterCategory}
              placeholder={filterCategory ? "All subcategories" : "Select a category first"}
              options={filterCategory ? [{ value: "", label: "All subcategories" }, ...categories.subcategoryOptionsFor(filterCategory)] : []}
              ariaLabel="Filter templates by subcategory"
            />
          </div>
        </div>

        {/* outside the scrolling list, and always there, including when My templates is empty: there is always a way back to All templates */}
        <div className="px-6 pt-3 shrink-0">
        <div role="tablist" aria-label="Which templates" className="flex gap-2">
                {([["all", "All templates"], ["mine", `My templates${mineCount ? ` (${mineCount})` : ""}`]] as const).map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={scope === key} onClick={() => setScope(key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${scope === key ? "bg-[#FF651D] border-[#FF651D] text-white" : "bg-white border-[#E0E0E0] text-[#4B4F52] hover:border-gray-400"}`}>{label}</button>
                ))}
              </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4 min-h-[220px]">
          {loading ? (
            <SkeletonRegion label="Loading templates" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[302/524]" />)}
</SkeletonRegion>
          ) : loadError ? (
            <p role="alert" className="text-sm text-rose-600 py-10 text-center break-words">{loadError}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-[#828282] py-10 text-center">
              {scope === "mine" && mineCount === 0 ? "You have not uploaded a template yet. Use “Upload your own template” below." : templates.length === 0 ? "No templates have been published yet." : "No templates for this category. Try another category or clear the filter."}
            </p>
          ) : (
            // Figma 217:7912: a heading for the chosen subcategory, then a 6-up grid of small cards; the name shows on hover
            <>
              <p className="text-sm font-medium text-[#15191C] mb-2">{(filterCategory && categories.subcategoryName(filterCategory, filterSub)) || (filterCategory && categories.categoryName(filterCategory)) || (scope === "mine" ? "My templates" : "All templates")}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {visible.map((t) => {
                  const selected = pendingId === t._id;
                  return (
                    <div key={t._id} className="relative">
                      <button
                        type="button"
                        onClick={() => setPendingId(selected ? null : t._id)}
                        aria-pressed={selected}
                        aria-label={t.name}
                        title={t.name}
                        className={`block w-full rounded-md overflow-hidden border-2 cursor-pointer ${selected ? "border-[#FF651D]" : "border-transparent hover:border-gray-300"}`}
                      >
                        <TemplateThumb imageKey={t.previewImageKey} name={t.name} className="aspect-[2/3]!" />
                      </button>
                      {isMine(t) && <span className="pointer-events-none absolute left-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Own</span>}
                      {canDelete(t) && (
                        <>
                          <button type="button" onClick={() => void removeOwn(t)} aria-label={`Delete ${t.name}`} title="Delete this template" className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow hover:bg-rose-50 cursor-pointer">
                            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E5E5] flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#4B4F52]">
            <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#E5520F] hover:underline cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" /></svg>
              Upload your own template
            </button>
            <span>
              Need a custom design?{" "}
              <Link href="/contact" className="text-[#16A34A] font-medium underline">Contact us</Link>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {pendingId && !required && (
              <button type="button" onClick={() => setPendingId(null)} className="text-sm text-gray-700 hover:underline cursor-pointer">
                Clear selection
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={required && !pendingId} className="px-6 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {required ? "Use this template" : "Save"}
            </button>
          </div>
        </div>
      </div>
      {uploadOpen && (
        <UploadTemplateModal
          onClose={() => setUploadOpen(false)}
          onCreated={(t) => {
            // the new template is chosen for this event straight away
            setUploadOpen(false);
            setFilterCategory("");
            setFilterSub("");
            setPendingId(t._id);
            setReloadKey((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
