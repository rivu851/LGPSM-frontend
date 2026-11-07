"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryService, Category } from "@/services/categoryService";
import { useAuth } from "@/context/AuthContext";

export interface CategoryOption {
  value: string;
  label: string;
  /** the organizer's own custom entry, which they may delete */
  custom?: boolean;
}

// Several parts of a screen hold their own copy of the list (the Add Event form, the template window, the upload dialog). When one of
// them changes it, all of them fetch it again, so a new or deleted category never looks different from one part of the screen to another.
const CATEGORIES_CHANGED = "lgpsm:categories-changed";
const announceChange = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(CATEGORIES_CHANGED)); };

/**
 * The category an event already has, for someone whose list does not include it: an admin opening an organizer's event that uses the
 * organizer's custom category or subcategory, or anyone opening an event whose category was since deactivated.
 */
export interface ExtraCategory {
  id: string;
  name: string;
  isCustom?: boolean;
  subcategory?: { id: string; name: string; isCustom?: boolean } | null;
}

// Loads active categories and exposes admin actions that keep the local list in sync with the API.
export function useCategories(extra?: ExtraCategory | null) {
  // Organizers add their own (private) categories; administrators add to the platform's list
  const isOrganizer = useAuth().user?.role === "ORGANIZER";
  const [loaded, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await categoryService.getCategories();
    if (res.success && Array.isArray(res.data)) {
      setCategories(res.data);
      setError(null);
    } else {
      setError(res.message || "Failed to load categories.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChange = () => { void reload(); };
    window.addEventListener(CATEGORIES_CHANGED, onChange);
    return () => window.removeEventListener(CATEGORIES_CHANGED, onChange);
  }, [reload]);

  const addCategory = useCallback(async (name: string): Promise<{ ok: true; category: Category } | { ok: false; message: string }> => {
    const res = await (isOrganizer ? categoryService.createCustomCategory(name.trim()) : categoryService.createCategory({ name: name.trim() }));
    if (!res.success || !res.data) return { ok: false, message: res.message || "Failed to add category." };
    const created = res.data;
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    announceChange();
    return { ok: true, category: created };
  }, [isOrganizer]);

  const addSubcategory = useCallback(
    async (categoryId: string, name: string): Promise<{ ok: true; subcategoryId: string } | { ok: false; message: string }> => {
      const res = await (isOrganizer ? categoryService.addCustomSubcategory(categoryId, name.trim()) : categoryService.addSubcategory(categoryId, name.trim()));
      if (!res.success || !res.data) return { ok: false, message: res.message || "Failed to add subcategory." };
      const updated = res.data;
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      announceChange();
      const created = [...(updated.subcategories || [])].reverse().find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
      return { ok: true, subcategoryId: created?._id || "" };
    },
    [isOrganizer]
  );

  const removeCategory = useCallback(async (categoryId: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    const res = await categoryService.deleteCustomCategory(categoryId);
    if (!res.success) return { ok: false, message: res.message || "Failed to delete the category." };
    setCategories((prev) => prev.filter((c) => c._id !== categoryId));
    announceChange();
    return { ok: true };
  }, []);

  const removeSubcategory = useCallback(async (categoryId: string, subcategoryId: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    const res = await categoryService.deleteCustomSubcategory(categoryId, subcategoryId);
    if (!res.success) return { ok: false, message: res.message || "Failed to delete the subcategory." };
    setCategories((prev) => prev.map((c) => (c._id === categoryId ? { ...c, subcategories: c.subcategories.filter((s) => s._id !== subcategoryId) } : c)));
    announceChange();
    return { ok: true };
  }, []);

  const extraId = extra?.id;
  const extraName = extra?.name;
  const extraCustom = extra?.isCustom;
  const extraSubId = extra?.subcategory?.id;
  const extraSubName = extra?.subcategory?.name;
  const extraSubCustom = extra?.subcategory?.isCustom;
  const categories = useMemo<Category[]>(() => {
    if (!extraId) return loaded;
    const sub = extraSubId ? { _id: extraSubId, name: extraSubName || "", isCustom: extraSubCustom, fromEvent: true } : null;
    const known = loaded.find((c) => c._id === extraId);
    if (!known) return [...loaded, { _id: extraId, name: extraName || "", isCustom: extraCustom, fromEvent: true, isActive: true, createdAt: "", updatedAt: "", subcategories: sub ? [sub] : [] }];
    // a subcategory since deleted is still in the list, marked inactive: for this event it stays selectable
    if (!sub || (known.subcategories || []).some((s) => s._id === sub._id && s.isActive !== false)) return loaded;
    return loaded.map((c) => (c._id === extraId ? { ...c, subcategories: [...(c.subcategories || []).filter((s) => s._id !== sub._id), sub] } : c));
  }, [loaded, extraId, extraName, extraCustom, extraSubId, extraSubName, extraSubCustom]);

  const categoryOptions: CategoryOption[] = categories.map((c) => ({ value: c._id, label: c.isCustom ? `${c.name} (custom)` : c.name, custom: !!c.isCustom && !c.fromEvent }));
  const subcategoryOptionsFor = (categoryId: string): CategoryOption[] =>
    (categories.find((c) => c._id === categoryId)?.subcategories || [])
      .filter((s) => s._id && s.isActive !== false)
      .map((s) => ({ value: s._id as string, label: s.isCustom ? `${s.name} (custom)` : s.name, custom: !!s.isCustom && !s.fromEvent }));
  const categoryName = (id?: string | null) => categories.find((c) => c._id === id)?.name || "";
  const subcategoryName = (categoryId?: string | null, subId?: string | null) =>
    categories.find((c) => c._id === categoryId)?.subcategories.find((s) => s._id === subId)?.name || "";

  return { isOrganizer, categories, loading, error, reload, addCategory, addSubcategory, removeCategory, removeSubcategory, categoryOptions, subcategoryOptionsFor, categoryName, subcategoryName };
}

export type CategoriesApi = ReturnType<typeof useCategories>;
