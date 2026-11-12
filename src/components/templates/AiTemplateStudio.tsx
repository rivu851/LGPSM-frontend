"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl } from "@/utils/mediaUrl";
import CustomDropdown from "@/components/common/CustomDropdown";
import {
  GenerationJob,
  GenerationOptions,
  GenerationVariant,
  templateGenerationService,
} from "@/services/templateGenerationService";
import { templateService, type TemplateKind } from "@/services/templateService";
import {
  SLOW_AFTER_MS,
  canSave,
  describeGenerationError,
  isFinished,
  jobSummary,
  newIdempotencyKey,
  pollDelayMs,
  presetLabel,
  variantBadge,
  variantImageKey,
  usageExhausted,
  usageLabel,
  ErrorView,
} from "@/utils/aiTemplate";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";
import DashedBorder from "@/components/common/DashedBorder";
import { formatDate } from "@/utils/dateTime";

const PROMPT_EXAMPLES: Record<TemplateKind, string[]> = {
  INVITATION: ["Elegant black and gold invitation for a corporate awards night", "Playful pastel birthday invitation with balloons", "Warm traditional wedding reception invitation in maroon and gold"],
  POSTER: ["Bold modern poster for a two-day technology summit", "Festive poster for a charity fundraiser dinner", "Minimal poster for an alumni meet-up"],
};

const inputClass = "w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-[#FF651D] focus:outline-none focus:ring-1 focus:ring-[#FF651D]";

type Busy = null | "starting" | "saving" | "discarding";

/** With `editTemplateId` the studio changes a design that is already saved, instead of creating a new one. */
export default function AiTemplateStudio({ editTemplateId }: { editTemplateId?: string }) {
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; imageKey: string | null; kind: TemplateKind } | null>(null);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerationOptions | null>(null);
  // today's allowance, refreshed from the server after every request
  const [usage, setUsage] = useState<GenerationOptions["usage"]>(undefined);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [kind, setKind] = useState<TemplateKind>("INVITATION");
  const [preset, setPreset] = useState("INVITATION_PORTRAIT");
  const [prompt, setPrompt] = useState("");
  const [mood, setMood] = useState("");
  const [colorHint, setColorHint] = useState("");
  const [variantCount, setVariantCount] = useState(2);

  const [job, setJob] = useState<GenerationJob | null>(null);
  const [recent, setRecent] = useState<GenerationJob[]>([]);
  const [error, setError] = useState<ErrorView | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [slow, setSlow] = useState(false);
  const [selected, setSelected] = useState(0);
  const [showConcept, setShowConcept] = useState(false);
  const [changePrompt, setChangePrompt] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string; published: boolean } | null>(null);

  // One key per click of "Generate": a double click or a retry after a dropped connection reuses the same job
  const attemptKey = useRef<string | null>(null);

  useEffect(() => {
    if (!editTemplateId) return;
    let cancelled = false;
    templateService.getTemplateById(editTemplateId).then((res) => {
      if (cancelled) return;
      const t = res.data;
      if (res.success && t) {
        setEditTarget({ id: t._id || t.id || editTemplateId, name: t.name, imageKey: t.previewImageKey || null, kind: t.kind === "POSTER" ? "POSTER" : "INVITATION" });
        setSaveName(t.name);
      } else setEditLoadError(res.message || "This template could not be loaded.");
    });
    return () => {
      cancelled = true;
    };
  }, [editTemplateId]);

  const presets = useMemo(() => (options?.presets || []).filter((p) => p.kind === kind), [options, kind]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([templateGenerationService.getOptions(), templateGenerationService.list(6)]).then(([opt, list]) => {
      if (cancelled) return;
      if (opt.success && opt.data) {
        setOptions(opt.data);
        setUsage(opt.data.usage);
      }
      else setOptionsError(opt.message || "Could not load the design options.");
      if (list.success && Array.isArray(list.data)) {
        setRecent(list.data);
        // Come back to a design that was still being made when the page was closed
        const active = list.data.find((j) => !isFinished(j.status));
        if (active) {
          setJob(active);
          setKind(active.kind);
          setPreset(active.preset);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Switching between invitation and poster changes which sizes apply: fall back to the first valid one
  const effectivePreset = presets.some((p) => p.id === preset) ? preset : presets[0]?.id || preset;

  // Poll the running job until it finishes. The job lives on the server, so this survives reloads and slow providers.
  const jobId = job?.id;
  const jobStatus = job?.status;
  useEffect(() => {
    if (!jobId || isFinished(jobStatus)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    let attempt = 0;
    const tick = async () => {
      const res = await templateGenerationService.get(jobId);
      if (stopped) return;
      if (res.success && res.data) {
        setJob(res.data);
        if (isFinished(res.data.status)) {
          setSelected(Math.max(0, res.data.variants.findIndex((v) => v.ready)));
          setRecent((r) => [res.data!, ...r.filter((j) => j.id !== res.data!.id)].slice(0, 6));
          return;
        }
      } else if (res.status === 404) {
        setJob(null);
        return;
      }
      // a failed poll (offline, 5xx) is not a failed design: keep trying
      if (Date.now() - startedAt > SLOW_AFTER_MS) setSlow(true);
      timer = setTimeout(tick, pollDelayMs(attempt++));
    };
    timer = setTimeout(tick, 1500);
    return () => {
      stopped = true;
      clearTimeout(timer);
      setSlow(false);
    };
  }, [jobId, jobStatus]);

  const begin = (res: Awaited<ReturnType<typeof templateGenerationService.create>>) => {
    if (res.usage) setUsage(res.usage);
    if (res.code === "QUOTA_EXCEEDED") setUsage((u) => (u ? { ...u, remaining: 0 } : u));
    if (res.success && res.data) {
      setJob(res.data);
      setError(null);
      setSaved(null);
      setSelected(0);
      setShowConcept(false);
      attemptKey.current = null;
    } else {
      attemptKey.current = null;
      setError(describeGenerationError({ code: res.code, message: res.message, status: res.status }));
    }
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !options) return;
    setBusy("starting");
    attemptKey.current = attemptKey.current || newIdempotencyKey();
    if (editTarget) {
      const edited = await templateGenerationService.editSaved(editTarget.id, prompt.trim(), attemptKey.current);
      setBusy(null);
      begin(edited);
      return;
    }
    const res = await templateGenerationService.create({
      kind,
      preset: effectivePreset,
      prompt: prompt.trim(),
      style: { ...(mood ? { mood } : {}), ...(colorHint.trim() ? { colorHint: colorHint.trim() } : {}) },
      variantCount,
      idempotencyKey: attemptKey.current,
    });
    setBusy(null);
    begin(res);
  };

  const change = async (mode: "edit" | "variations") => {
    if (!job || busy || changePrompt.trim().length < 5) return;
    setBusy("starting");
    const res =
      mode === "edit"
        ? await templateGenerationService.edit(job.id, selected, changePrompt.trim(), newIdempotencyKey())
        : await templateGenerationService.variations(job.id, selected, changePrompt.trim(), Math.min(2, options?.limits.maxVariants || 2), newIdempotencyKey());
    setBusy(null);
    if (res.success) setChangePrompt("");
    begin(res);
  };

  const save = async (publish: boolean, replace = false) => {
    if (!job || busy) return;
    const name = saveName.trim() || `AI ${kind === "POSTER" ? "poster" : "invitation"} ${formatDate(new Date())}`;
    setBusy("saving");
    const res = await templateGenerationService.save(job.id, selected, { name, publish, ...(replace && editTarget ? { replaceTemplateId: editTarget.id } : {}) });
    setBusy(null);
    if (res.success && res.data) {
      const t = res.data as { _id?: string; id?: string; name: string; isPublished?: boolean };
      setSaved({ id: t._id || t.id || "", name: t.name, published: t.isPublished === true });
      setJob({ ...job, variants: job.variants.map((v) => (v.index === selected ? { ...v, templateId: t._id || t.id } : v)) });
      setError(null);
    } else {
      setError(describeGenerationError({ code: res.code, message: res.message, status: res.status }));
    }
  };

  const discard = async () => {
    if (!job || busy) return;
    setBusy("discarding");
    await templateGenerationService.remove(job.id);
    setBusy(null);
    setRecent((r) => r.filter((j) => j.id !== job.id));
    setJob(null);
    setSaved(null);
    setError(null);
  };

  const variant: GenerationVariant | undefined = job?.variants.find((v) => v.index === selected);
  const running = !!job && !isFinished(job.status);
  const promptTooShort = prompt.trim().length < (options?.limits.promptMin || 10);
  const promptMax = options?.limits.promptMax || 800;

  if (optionsError) {
    const missing = /route not found|not found/i.test(optionsError);
    return <Panel tone={missing ? "info" : "error"} title="AI design is not available" message={missing ? "There was a problem with the AI design service." : optionsError} />;
  }
  if (!options) return <SkeletonRegion label="Loading" className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40" /><Skeleton className="h-12 w-40" /></SkeletonRegion>;
  if (!options.available) {
    return <Panel tone="info" title="AI design is not available right now" message="The design service is not set up on this server. You can still use the ready-made templates." action={{ href: "/templates", label: "Browse templates" }} />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
      <form onSubmit={generate} className="bg-white border border-[#E0E0E0] rounded-lg p-5 space-y-5 xl:sticky xl:top-24" aria-label="Describe your design">
        <div>
          <h2 className="text-base font-medium text-gray-900">{editTarget ? "Edit your design" : "Describe your design"}</h2>
          <p className="text-sm text-[#6B6B6B] mt-0.5">We design the look. Your event details are filled in automatically every time you use it.</p>
        </div>

        {editTarget ? (
          <>
            <div className="flex items-start gap-3 rounded-md border border-[#E0E0E0] bg-[#FAFAFA] p-3">
              {resolveImageUrl(editTarget.imageKey) && (
                <div className="relative h-24 w-14 shrink-0 overflow-hidden rounded border border-[#E0E0E0] bg-[#F4F5F8]">
                  <Image src={resolveImageUrl(editTarget.imageKey) as string} alt={`${editTarget.name} current design`} fill unoptimized sizes="56px" className="object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-[#6B6B6B]">Editing</p>
                <p className="text-sm font-medium text-gray-900 break-words">{editTarget.name}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">Your original stays as it is until you choose to replace it.</p>
              </div>
            </div>
            <div>
              <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-900 mb-1.5">What should change?</label>
              <textarea id="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={options?.limits.changeMax || 500} placeholder="e.g. Use a deep blue background and make the title larger" className={inputClass} />
              <div className="mt-1 flex justify-between text-xs text-[#6B6B6B]"><span>{prompt.length > 0 && prompt.trim().length < 10 ? <span className="text-rose-600">Add a little more detail (10+ characters)</span> : "Describe only what you want different."}</span><span className="tabular-nums">{prompt.length}/{options?.limits.changeMax || 500}</span></div>
            </div>
          </>
        ) : editTemplateId && !editLoadError ? (
          <SkeletonRegion label="Loading the design to edit" className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32" /></SkeletonRegion>
        ) : editLoadError ? (
          <ErrorBanner error={{ title: "This design cannot be edited", message: editLoadError, retryable: false, kind: "validation" }} />
        ) : (
          <>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-900 mb-1.5">What are you making?</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["INVITATION", "POSTER"] as TemplateKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-md border px-3 py-2.5 text-sm font-medium cursor-pointer ${kind === k ? "border-[#FF651D] bg-[#FFF3EC] text-[#C2410C]" : "border-[#D9D9D9] text-gray-700 hover:bg-gray-50"}`}>
                {k === "INVITATION" ? "Invitation" : "Poster"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1.5">{kind === "INVITATION" ? "Each guest gets their own check-in QR code on it." : "Carries a registration QR code you choose when you download it."}</p>
        </fieldset>

        <div>
          <span className="block text-sm font-medium text-gray-900 mb-1.5">Size</span>
          <CustomDropdown ariaLabel="Size" value={effectivePreset} onChange={setPreset} options={presets.map((p) => ({ value: p.id, label: presetLabel(p) }))} />
        </div>

        <div>
          <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-900 mb-1.5">Describe the look</label>
          <textarea id="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={promptMax} placeholder={PROMPT_EXAMPLES[kind][0]} className={inputClass} aria-describedby="ai-prompt-help" />
          <div id="ai-prompt-help" className="mt-1 flex items-start justify-between gap-3 text-xs text-[#6B6B6B]">
            <span>{prompt.length > 0 && promptTooShort ? <span className="text-rose-600">Add a little more detail ({options.limits.promptMin}+ characters)</span> : "Mention occasion, mood and colours."}</span>
            <span className="shrink-0 tabular-nums">{prompt.length}/{promptMax}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROMPT_EXAMPLES[kind].map((ex) => (
              <button key={ex} type="button" onClick={() => setPrompt(ex)} className="rounded-full border border-[#E0E0E0] px-2.5 py-1 text-xs text-gray-700 hover:border-[#FF651D] cursor-pointer text-left">
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Mood</span>
            <CustomDropdown ariaLabel="Mood" value={mood} onChange={setMood} options={[{ value: "", label: "Any" }, ...options.moods.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))]} />
          </div>
          <div>
            <label htmlFor="ai-colors" className="block text-sm font-medium text-gray-900 mb-1.5">Colours</label>
            <input id="ai-colors" value={colorHint} onChange={(e) => setColorHint(e.target.value)} maxLength={40} placeholder="e.g. navy & gold" className={inputClass} />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-900 mb-1.5">Options to generate</span>
          <CustomDropdown ariaLabel="Options to generate" value={String(variantCount)} onChange={(v) => setVariantCount(Number(v))} options={Array.from({ length: options.limits.maxVariants }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
        </div>

          </>
        )}

        {error && !job && <ErrorBanner error={error} />}

        <button type="submit" disabled={busy !== null || running || promptTooShort || usageExhausted(usage) || (!!editTemplateId && !editTarget)} className="w-full rounded-md bg-[#C65318] hover:bg-[#A83800] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-3 cursor-pointer">
          {busy === "starting" ? "Starting…" : running ? "Designing…" : editTarget ? "Apply edit" : "Generate designs"}
        </button>
        <p className={`text-xs text-center ${usageExhausted(usage) ? "text-amber-700 font-medium" : "text-[#6B6B6B]"}`} aria-live="polite">{usageLabel(usage) || `Up to ${options.limits.dailyQuota} generations per day.`}</p>
      </form>

      <section aria-live="polite" aria-label="Designs" className="min-w-0 space-y-5">
        {!job && (
          <div className="relative rounded-lg bg-[#FAFAFA] py-16 px-6 text-center">
            <DashedBorder width={1} radius={8} className="text-[#D9D9D9]" />
            <p className="text-base font-medium text-gray-900">Your designs will appear here</p>
            <p className="text-sm text-[#6B6B6B] mt-1 max-w-md mx-auto">Describe the look you want and choose Generate. A design usually takes about a minute.</p>
          </div>
        )}

        {recent.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B6B6B] mb-2">Recent</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recent.map((j) => (
                <button key={j.id} type="button" onClick={() => { setJob(j); setSelected(Math.max(0, j.variants.findIndex((v) => v.ready))); setSaved(null); setError(null); setKind(j.kind); setPreset(j.preset); }} className={`shrink-0 max-w-[220px] text-left rounded-md border px-3 py-2 cursor-pointer ${job?.id === j.id ? "border-[#FF651D] bg-[#FFF3EC]" : "border-[#E0E0E0] hover:border-[#FF651D]"}`}>
                  <span className="block text-xs font-medium text-gray-900 truncate">{j.prompt}</span>
                  <span className="block text-xs text-[#6B6B6B]">{jobSummary(j)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {job && running && (
          <div className="rounded-lg border border-[#E0E0E0] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-[#FF651D] border-t-transparent animate-spin" aria-hidden />
              <p className="text-sm font-medium text-gray-900">{jobSummary(job)}</p>
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4" aria-hidden>
              {Array.from({ length: job.variantCount }, (_, i) => (
                <div key={i} className="aspect-[9/16] rounded-md bg-gradient-to-b from-[#F4F5F8] to-[#ECEDF1] animate-pulse" />
              ))}
            </div>
            {slow && <p className="mt-4 text-sm text-[#6B6B6B]">This is taking longer than usual. It keeps running on our servers, so you can leave this page and come back.</p>}
          </div>
        )}

        {job && job.status === "FAILED" && (
          <div className="space-y-3">
            <ErrorBanner error={describeGenerationError(job.error || {})} />
            <div className="flex gap-3">
              <button type="button" onClick={discard} className="text-sm text-gray-700 underline cursor-pointer">Clear</button>
            </div>
          </div>
        )}

        {job && (job.status === "SUCCEEDED" || job.status === "CONCEPT_ONLY") && (
          <>
            {job.status === "CONCEPT_ONLY" && (
              <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">We could draw the idea, but not turn it into a usable template.</p>
                <p className="mt-1">The picture below is only a concept: it can&apos;t be used for invitations or posters. Ask for changes or generate again.</p>
              </div>
            )}

            {job.mode === "CREATE" && job.variants.length < job.variantCount && (
              <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                You asked for {job.variantCount} options, but only {job.variants.length} could be created this time. Use &ldquo;More like this&rdquo; to try for more.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {job.variants.map((v) => {
                const src = resolveImageUrl(variantImageKey(v));
                const badge = variantBadge(v);
                const active = v.index === selected;
                return (
                  <button key={v.index} type="button" onClick={() => { setSelected(v.index); setShowConcept(false); setSaved(null); setError(null); }} aria-pressed={active} className={`text-left rounded-lg border-2 overflow-hidden bg-white cursor-pointer ${active ? "border-[#FF651D]" : "border-[#E0E0E0] hover:border-[#FF651D]/60"}`}>
                    <div className="relative w-full aspect-[9/16] bg-[#F4F5F8]">
                      {src ? <Image src={src} alt={`Design option ${v.index + 1}`} fill unoptimized sizes="(max-width: 640px) 50vw, 240px" className="object-contain" /> : <span className="absolute inset-0 flex items-center justify-center text-xs text-[#6B6B6B]">No preview</span>}
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">Option {v.index + 1}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${badge.tone === "concept" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{badge.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {variant && (
              <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-6">
                  <div>
                    <div className="relative w-full aspect-[9/16] bg-[#F4F5F8] rounded-md overflow-hidden border border-[#E0E0E0]">
                      {(() => {
                        const key = showConcept ? variant.conceptImageKey : variantImageKey(variant);
                        const src = resolveImageUrl(key);
                        return src ? <Image src={src} alt={showConcept ? "Original concept" : "Template preview with sample details"} fill unoptimized sizes="280px" className="object-contain" /> : null;
                      })()}
                    </div>
                    {variant.ready && variant.conceptImageKey && (
                      <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-[#F4F5F8] p-1 text-xs" role="tablist">
                        <button type="button" role="tab" aria-selected={!showConcept} onClick={() => setShowConcept(false)} className={`rounded px-2 py-1.5 cursor-pointer ${!showConcept ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}>Your template</button>
                        <button type="button" role="tab" aria-selected={showConcept} onClick={() => setShowConcept(true)} className={`rounded px-2 py-1.5 cursor-pointer ${showConcept ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}>Original concept</button>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-[#6B6B6B]">{variant.ready ? "Preview uses sample details. Your real event, venue and QR code are filled in when you use it." : "Concept only, not a template."}</p>
                  </div>

                  <div className="space-y-5 min-w-0">
                    {variant.notes.length > 0 && (
                      <ul className="text-xs text-[#4B4F52] space-y-1 list-disc pl-4">
                        {variant.notes.map((n) => <li key={n}>{n}</li>)}
                      </ul>
                    )}

                    {saved ? (
                      <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-3">
                        <p className="font-medium">&ldquo;{saved.name}&rdquo; is saved{saved.published ? " and ready to use" : " as a draft"}.</p>
                        <div className="flex flex-wrap gap-3">
                          {saved.published && <Link href={`/events/add?template=${saved.id}`} className="px-4 py-2 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md">Create an event with it</Link>}
                          <Link href="/templates?view=mine" className="px-4 py-2 border border-gray-300 hover:bg-white text-gray-800 text-sm font-medium rounded-md">Go to my templates</Link>
                        </div>
                      </div>
                    ) : canSave(variant) ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="ai-name" className="block text-sm font-medium text-gray-900 mb-1.5">Template name</label>
                          <input id="ai-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={100} placeholder="e.g. Gala gold invitation" className={inputClass} />
                        </div>
                        {editTarget && (
                          <div className="flex flex-wrap gap-3">
                            <button type="button" disabled={busy !== null} onClick={() => save(false, true)} className="px-5 py-2.5 bg-[#C65318] hover:bg-[#A83800] disabled:opacity-50 text-white text-sm font-medium rounded-md cursor-pointer">{busy === "saving" ? "Saving…" : `Replace “${editTarget.name}”`}</button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button type="button" disabled={busy !== null} onClick={() => save(true)} className="px-5 py-2.5 bg-[#C65318] hover:bg-[#A83800] disabled:opacity-50 text-white text-sm font-medium rounded-md cursor-pointer">{busy === "saving" ? "Saving…" : editTarget ? "Save as new template" : "Save and use"}</button>
                          <button type="button" disabled={busy !== null} onClick={() => save(false)} className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 text-sm font-medium rounded-md cursor-pointer">{editTarget ? "Save new one as draft" : "Save as draft"}</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">This concept can&apos;t be saved as a template. Try &ldquo;Adjust&rdquo; below, or generate new options.</p>
                    )}

                    {error && <ErrorBanner error={error} />}

                    <div className="border-t border-[#E5E5E5] pt-4 space-y-3">
                      <label htmlFor="ai-change" className="block text-sm font-medium text-gray-900">Adjust this design</label>
                      <textarea id="ai-change" value={changePrompt} onChange={(e) => setChangePrompt(e.target.value)} rows={2} maxLength={options.limits.changeMax} placeholder="e.g. Make the heading larger and use a deeper blue" className={inputClass} />
                      <div className="flex flex-wrap gap-3">
                        <button type="button" disabled={busy !== null || changePrompt.trim().length < 5} onClick={() => change("edit")} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 text-sm font-medium rounded-md cursor-pointer">Apply changes</button>
                        <button type="button" disabled={busy !== null || changePrompt.trim().length < 5} onClick={() => change("variations")} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 text-sm font-medium rounded-md cursor-pointer">More like this</button>
                        <button type="button" disabled={busy !== null} onClick={discard} className="px-4 py-2 text-sm text-rose-700 hover:underline cursor-pointer">Discard these designs</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ErrorBanner({ error }: { error: ErrorView }) {
  const tone = error.kind === "quota" || error.kind === "unavailable" || error.kind === "busy" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-800";
  return (
    <div role="alert" className={`rounded-md border p-3 text-sm ${tone}`}>
      <p className="font-medium">{error.title}</p>
      <p className="mt-0.5 break-words">{error.message}</p>
      {error.retryable && <p className="mt-1 text-xs opacity-80">You can try again.</p>}
    </div>
  );
}

function Panel({ tone, title, message, action }: { tone: "error" | "info"; title: string; message: string; action?: { href: string; label: string } }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border p-8 text-center ${tone === "error" ? "border-rose-200 bg-rose-50" : "border-[#E0E0E0] bg-[#FAFAFA]"}`}>
      <p className="text-base font-medium text-gray-900">{title}</p>
      <p className="text-sm text-[#4B4F52] mt-1 max-w-md mx-auto">{message}</p>
      {action && <Link href={action.href} className="inline-block mt-4 px-5 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md">{action.label}</Link>}
    </div>
  );
}
