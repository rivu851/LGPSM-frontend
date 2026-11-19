"use client";

import React, { useEffect, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import { ApiResponse } from "@/services/apiClient";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

interface SettingsToggleListProps<K extends string> {
  title: string;
  description?: string;
  items: { key: K; label: string; help?: string }[];
  load: () => Promise<ApiResponse<Record<K, boolean>>>;
  save: (values: Record<K, boolean>) => Promise<ApiResponse<Record<K, boolean>>>;
}

// Loads boolean settings from the API, edits them locally, and saves them back.
// The "Saved" message only appears after the backend confirms the change.
export default function SettingsToggleList<K extends string>({ title, description, items, load, save }: SettingsToggleListProps<K>) {
  const [saved, setSaved] = useState<Record<K, boolean> | null>(null);
  const [values, setValues] = useState<Record<K, boolean> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoadError(null);
    const res = await load();
    if (res.success && res.data) {
      setSaved(res.data);
      setValues(res.data);
    } else {
      setLoadError(res.message || "Settings could not be loaded.");
    }
  }, [load]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const dirty = !!values && !!saved && items.some((i) => values[i.key] !== saved[i.key]);

  const handleSave = async () => {
    if (!values) return;
    // what the person is about to change, so the confirmation says exactly that
    const turnedOn = items.filter((i) => saved && !saved[i.key] && values[i.key]).map((i) => i.label);
    const turnedOff = items.filter((i) => saved && saved[i.key] && !values[i.key]).map((i) => i.label);
    setSaving(true);
    setStatus(null);
    const res = await save(values);
    setSaving(false);
    if (res.success && res.data) {
      setSaved(res.data);
      setValues(res.data);
      setStatus({ type: "success", message: ["Settings updated.", turnedOn.length ? `Turned on: ${turnedOn.join(", ")}.` : "", turnedOff.length ? `Turned off: ${turnedOff.join(", ")}.` : ""].filter(Boolean).join("\n") });
    } else {
      setStatus({ type: "error", message: res.message || "Settings could not be saved. Your changes are still here." });
    }
  };

  return (
    // Figma settings frames (2074:297, 2083:364): a 576px bordered card holding the title and plain label/toggle rows
    <section className="max-w-[576px] space-y-6" aria-labelledby="settings-list-title">
      <div className="border border-[#E0E0E0] rounded-lg p-5 pb-8 space-y-5">
      <div>
        <h2 id="settings-list-title" className="text-[22px] font-medium text-[#15191C]">{title}</h2>
        {description && <p className="text-xs text-[#6B6B6B] mt-1">{description}</p>}
      </div>
      <PopupMessage message={loadError} action={{ label: "Try again", onClick: fetchSettings }} />
      {loadError ? null : !values ? (
        <SkeletonRegion label="Loading settings" className="space-y-[18px]">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</SkeletonRegion>
      ) : (
          <ul className="space-y-[18px]">
            {items.map((item) => {
              const id = `setting-${item.key}`;
              return (
                <li key={item.key} className="flex items-center justify-between gap-4">
                  <label htmlFor={id} title={item.help} className="min-w-0 cursor-pointer text-sm text-[#4B4F52]">
                    {item.label}
                  </label>
                  <button
                    id={id}
                    type="button"
                    role="switch"
                    aria-checked={values[item.key]}
                    onClick={() => setValues((v) => (v ? { ...v, [item.key]: !v[item.key] } : v))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${values[item.key] ? "bg-[#FF651D]" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${values[item.key] ? "translate-x-5" : ""}`} />
                  </button>
                </li>
              );
            })}
          </ul>
      )}
      </div>
      {values && !loadError && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-4 py-[9px] bg-[#C65318] hover:bg-[#A83800] text-white text-base font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {dirty && !saving && (
              <button type="button" onClick={() => setValues(saved)} className="text-sm text-gray-700 hover:underline cursor-pointer">
                Discard changes
              </button>
            )}
            <PopupMessage message={status?.message} type={status?.type === "error" ? "error" : "success"} />
          </div>
      )}
    </section>
  );
}
