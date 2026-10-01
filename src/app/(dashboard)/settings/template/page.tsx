"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/common/PageHeader";
import AddNewTemplateCard, { NewTemplateInput } from "@/components/settings/AddNewTemplateCard";
import TemplateFilterGrid from "@/components/settings/TemplateFilterGrid";
import EditTemplateModal from "@/components/settings/modals/EditTemplateModal";
import { useCategories } from "@/hooks/useCategories";
import { templateService, Template } from "@/services/templateService";
import { TemplateItem } from "@/types/settings";

function toItem(t: Template): TemplateItem {
  return {
    id: t._id || t.id || "",
    name: t.name,
    categoryId: typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "",
    subcategoryId: t.subcategoryId || "",
    imageKey: t.previewImageKey || null,
    status: t.isPublished === false ? "Saved on Draft" : "Published",
    createdAt: t.createdAt || "",
  };
}

// Admin-only screen (route guard + backend): manage templates and their categories
export default function TemplateSettingsPage() {
  const categories = useCategories();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [editing, setEditing] = useState<TemplateItem | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await templateService.getTemplates();
    if (res.success && Array.isArray(res.data)) setTemplates(res.data.map(toItem));
    else setFeedback({ type: "error", message: res.message || "Failed to load templates." });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleAdd = async (input: NewTemplateInput) => {
    const res = await templateService.createTemplate(input);
    if (!res.success) {
      setFeedback({ type: "error", message: res.message || "Failed to create template." });
      return false;
    }
    setFeedback({ type: "success", message: `Template "${input.name}" ${input.isPublished ? "published" : "saved as draft"}.` });
    await loadTemplates();
    return true;
  };

  const handleSave = async (t: TemplateItem) => {
    const res = await templateService.updateTemplate(t.id, {
      name: t.name,
      categoryId: t.categoryId,
      subcategoryId: t.subcategoryId,
      previewImageKey: t.imageKey || undefined,
      isPublished: t.status === "Published",
    });
    if (!res.success) {
      setFeedback({ type: "error", message: res.message || "Failed to update template." });
      return false;
    }
    setFeedback({ type: "success", message: "Template updated." });
    await loadTemplates();
    return true;
  };

  const handleDelete = async (id: string) => {
    const res = await templateService.deleteTemplate(id);
    if (!res.success) {
      setFeedback({ type: "error", message: res.message || "Failed to delete template." });
      return false;
    }
    setFeedback({ type: "success", message: "Template deleted." });
    await loadTemplates();
    return true;
  };

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Template Settings" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            className={`p-3 rounded-md text-sm flex items-center justify-between gap-3 border ${
              feedback.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <span className="break-words min-w-0">{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="font-medium shrink-0 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
        <AddNewTemplateCard categories={categories} onAddTemplate={handleAdd} />
        <TemplateFilterGrid templates={templates} categories={categories} loading={loading} onEditTemplate={setEditing} />
      </div>
      {editing && (
        <EditTemplateModal
          key={editing.id}
          template={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
