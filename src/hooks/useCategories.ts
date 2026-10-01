"use client";

import { useCallback, useEffect, useState } from "react";
import { categoryService, Category } from "@/services/categoryService";

export interface CategoryOption {
  value: string;
  label: string;
}

// Loads active categories and exposes admin actions that keep the local list in sync with the API.
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
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

  const addCategory = useCallback(async (name: string): Promise<{ ok: true; category: Category } | { ok: false; message: string }> => {
    const res = await categoryService.createCategory({ name: name.trim() });
    if (!res.success || !res.data) return { ok: false, message: res.message || "Failed to add category." };
    const created = res.data;
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return { ok: true, category: created };
  }, []);

  const addSubcategory = useCallback(
    async (categoryId: string, name: string): Promise<{ ok: true; subcategoryId: string } | { ok: false; message: string }> => {
      const res = await categoryService.addSubcategory(categoryId, name.trim());
      if (!res.success || !res.data) return { ok: false, message: res.message || "Failed to add subcategory." };
      const updated = res.data;
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      const created = [...(updated.subcategories || [])].reverse().find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
      return { ok: true, subcategoryId: created?._id || "" };
    },
    []
  );

  const categoryOptions: CategoryOption[] = categories.map((c) => ({ value: c._id, label: c.name }));
  const subcategoryOptionsFor = (categoryId: string): CategoryOption[] =>
    (categories.find((c) => c._id === categoryId)?.subcategories || [])
      .filter((s) => s._id && s.isActive !== false)
      .map((s) => ({ value: s._id as string, label: s.name }));
  const categoryName = (id?: string | null) => categories.find((c) => c._id === id)?.name || "";
  const subcategoryName = (categoryId?: string | null, subId?: string | null) =>
    categories.find((c) => c._id === categoryId)?.subcategories.find((s) => s._id === subId)?.name || "";

  return { categories, loading, error, reload, addCategory, addSubcategory, categoryOptions, subcategoryOptionsFor, categoryName, subcategoryName };
}

export type CategoriesApi = ReturnType<typeof useCategories>;
