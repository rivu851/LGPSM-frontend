"use client";

import React, { useEffect, useState } from "react";
import { templateService, DefaultTemplatePlan } from "@/services/templateService";
import { useAlert } from "@/context/AlertContext";

// Offers the invitation designs the designers made (birthday, wedding, rice ceremony, corporate) as ready-to-use
// templates. Shown only while some of them are missing, and nothing existing is ever changed by adding them.
export default function DefaultTemplatesPanel({ onInstalled }: { onInstalled: () => void | Promise<void> }) {
  const { confirm, showAlert } = useAlert();
  const [plan, setPlan] = useState<DefaultTemplatePlan | null>(null);
  const [busy, setBusy] = useState(false);
  // bumped after an install so the list of what is still missing is fetched again
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    templateService.previewDefaults().then((res) => {
      if (!cancelled) setPlan(res.success && res.data ? res.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (!plan || plan.templatesToCreate.length === 0) return null;

  const handleInstall = async () => {
    const lines = [
      `${plan.templatesToCreate.length} template${plan.templatesToCreate.length === 1 ? "" : "s"} will be added.`,
      plan.categoriesToCreate.length ? `New categories: ${plan.categoriesToCreate.join(", ")}.` : "",
      plan.subcategoriesToCreate.length ? `New subcategories: ${plan.subcategoriesToCreate.map((s) => `${s.category} › ${s.subcategory}`).join(", ")}.` : "",
      "Nothing that already exists is changed or removed.",
    ].filter(Boolean);
    const ok = await confirm({ title: "Add the default templates?", message: lines.join(" "), confirmText: "Add templates" });
    if (!ok) return;
    setBusy(true);
    const res = await templateService.installDefaults();
    setBusy(false);
    if (!res.success || !res.data) {
      showAlert(res.message || "The default templates could not be added. Please try again.", "error");
      return;
    }
    showAlert(`${res.data.created.length} template${res.data.created.length === 1 ? "" : "s"} added. Organizers can now pick them when they create an event.`, "success");
    await onInstalled();
    setRefresh((n) => n + 1);
  };

  return (
    <section aria-labelledby="default-templates-title" className="border border-[#FFD9C2] bg-[#FFF8F3] rounded-lg p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id="default-templates-title" className="text-base font-semibold text-gray-900">Invitation designs from the design team</h2>
        <p className="mt-1 text-sm text-[#4B4F52]">
          {plan.templatesToCreate.length} ready-made invitation design{plan.templatesToCreate.length === 1 ? " is" : "s are"} not in your list yet. Each card is filled in automatically from the event, so a birthday reads like a birthday and a summit like a summit.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {plan.templatesToCreate.map((t) => (
            <li key={t.name} className="text-xs bg-white border border-[#F0D9C8] rounded-full px-3 py-1 text-gray-800">
              <span className="font-medium">{t.name}</span>
              <span className="text-[#6B6B6B]"> · {t.category}{t.subcategory ? ` › ${t.subcategory}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        disabled={busy}
        className="shrink-0 px-5 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "Adding..." : "Add default templates"}
      </button>
    </section>
  );
}
