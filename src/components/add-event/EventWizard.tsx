"use client";

import { templateColumnsFor } from "@/utils/inviteeTemplate";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import StepHeader from "./StepHeader";
import Step1EventDetails, { EventDateField } from "./Step1EventDetails";
import Step2Settings from "./Step2Settings";
import Step3Sessions, { SessionInviteeFile } from "./Step3Sessions";
import MobileCardPreview from "./MobileCardPreview";
import SelectTemplateModal from "./modals/SelectTemplateModal";
import DateTimePickerModal from "./modals/DateTimePickerModal";
import ListResetWarningModal from "./modals/ListResetWarningModal";
import InviteesPreviewModal from "./modals/InviteesPreviewModal";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useCategories, ExtraCategory } from "@/hooks/useCategories";
import { EventFeatureSettings, platformSettingsService } from "@/services/platformSettingsService";
import { templateService } from "@/services/templateService";
import { suggestTemplate, SuggestableTemplate } from "@/utils/templateSuggestion";
import { rowProblem, rowsToSheetFile } from "@/utils/inviteeSheet";
import { excelColumnsFor, headerFor } from "@/utils/inviteeFields";
import { inviteeService, type InviteeSetInfo } from "@/services/inviteeService";
import { CARD_DISPLAY_DEFAULTS, DraftErrors, EventDraft, SelectedTemplate, applyEventWindow, stepOfError, validateEventDraft } from "./eventDraft";
import { DraftStatus } from "@/hooks/useFormDraft";
import { useAlert } from "@/context/AlertContext";

type PickerTarget =
  | { kind: "event"; field: EventDateField }
  | { kind: "session"; key: string; field: "start" | "end" };

export interface EventWizardSubmit {
  draft: EventDraft;
  sessionFiles: Record<string, SessionInviteeFile | undefined>;
}

interface EventWizardProps {
  heading: string;
  /** Set when editing a saved event */
  eventId?: string;
  /** The event's own category, for an account whose list does not include it */
  extraCategory?: ExtraCategory | null;
  /** Add Event: whether the saved draft has been read back yet, so the template dialog does not open over a draft that already has one */
  draftHydrated?: boolean;
  draft: EventDraft;
  setDraft: (updater: (prev: EventDraft) => EventDraft) => void;
  draftStatus: DraftStatus;
  draftSavedAt: string | null;
  onDismissDraftStatus: () => void;
  onDiscardDraft: () => void;
  canDiscard: boolean;
  submitLabel: string;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (input: EventWizardSubmit) => void;
  onCancel: () => void;
}

// Shared create/edit event wizard. The page owns the draft (and its persistence); the steps are controlled.
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The dashboard page scrolls inside <main data-page-reveal>, not the window
const scrollPageTo = (top: number) =>
  document.querySelector<HTMLElement>("[data-page-reveal]")?.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });

export default function EventWizard({
  heading,
  eventId,
  extraCategory,
  draftHydrated = true,
  draft,
  setDraft,
  draftStatus,
  draftSavedAt,
  onDismissDraftStatus,
  onDiscardDraft,
  canDiscard,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: EventWizardProps) {
  const { confirm } = useAlert();
  const { user } = useAuth();
  const categories = useCategories(extraCategory);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  // Bumped each time a forward move is blocked by validation, so the page can bring the problem into view
  const [blockedCount, setBlockedCount] = useState(0);
  const isFirstStepRender = useRef(true);
  const [features, setFeatures] = useState<EventFeatureSettings | null>(null);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  // Set while "Customize Information" is open: the payload the card preview was rendering
  // The columns of the Excel sample when it was last downloaded here: changing a custom title afterwards earns a warning
  const [downloadedColumns, setDownloadedColumns] = useState<string[] | null>(null);
  // "Additional Information" changed after the Excel sample was downloaded: the change waits here until the organizer confirms
  const [pendingCardInfo, setPendingCardInfo] = useState<EventDraft["cardInfo"] | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // Editing: invitee lists the event already has
  const [existingLists, setExistingLists] = useState<InviteeSetInfo[]>([]);
  useEffect(() => {
    if (!eventId) return;
    let live = true;
    inviteeService.getInviteeSets(eventId).then((res) => { if (live && res.success && res.data) setExistingLists(res.data.sets.filter((x) => x.total > 0)); }).catch(() => {});
    return () => { live = false; };
  }, [eventId]);
  const [sessionFiles, setSessionFiles] = useState<Record<string, SessionInviteeFile | undefined>>({});
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  // Options the admin switched off are hidden from the form (the backend also enforces them)
  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    setFeaturesError(null);
    try {
      const res = await platformSettingsService.getEventFeatures();
      if (!res.success || !res.data) throw new Error(res.message || "Could not load event settings.");
      setFeatures(res.data);
    } catch (error) {
      setFeaturesError(error instanceof Error ? error.message : "Could not load event settings.");
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatures();
  }, [loadFeatures]);

  useEffect(() => {
    if (stepContentRef.current) {
      gsap.fromTo(stepContentRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" });
    }
  }, [currentStep]);

  // The page scrolls inside the dashboard's <main>, so a step change would otherwise leave the user at the
  // old scroll position (the bottom of the previous step) instead of the top of the new one.
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    scrollPageTo(0);
  }, [currentStep]);

  // When "Next" is refused, the warning banner and the invalid fields can be far above the button the user just
  // pressed. Scroll to the first invalid field (or the top of the page when none is on screen yet).
  useEffect(() => {
    if (blockedCount === 0) return;
    const invalid = stepContentRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      invalid.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      invalid.focus({ preventScroll: true });
    } else {
      scrollPageTo(0);
    }
  }, [blockedCount]);

  // the same field definition the Excel sample, the preview and the manual Add Invitee form use
  const inviteeConfig = templateColumnsFor({ cardInfo: draft.cardInfo, dietaryEnabled: draft.dietaryEnabled, corporate: /corporate/i.test(categories.categoryName(draft.categoryId) || "") });
  const subcategoryRequired = !!draft.categoryId && categories.subcategoryOptionsFor(draft.categoryId).length > 0;
  // A restored draft, or a template, can name a category or subcategory that is no longer offered (deleted or deactivated since). The
  // field would look empty yet count as filled in, so it is cleared and the person is asked to choose again.
  const listReady = !categories.loading && !categories.error;
  const categoryGone = listReady && !!draft.categoryId && !categories.categoryOptions.some((o) => o.value === draft.categoryId);
  const subcategoryGone = listReady && !categoryGone && !!draft.subcategoryId && !categories.subcategoryOptionsFor(draft.categoryId).some((o) => o.value === draft.subcategoryId);
  useEffect(() => {
    if (categoryGone) setDraft((prev) => ({ ...prev, categoryId: "", subcategoryId: "" }));
    else if (subcategoryGone) setDraft((prev) => ({ ...prev, subcategoryId: "" }));
  }, [categoryGone, subcategoryGone, setDraft]);
  const isAdmin = user?.role === "ADMIN";
  const allErrors = useMemo(() => validateEventDraft(draft, { subcategoryRequired, templateRequired: !eventId }), [draft, subcategoryRequired, eventId]);
  const visibleErrors: DraftErrors = showErrors ? allErrors : {};

  const step1Valid = useMemo(() => !Object.keys(allErrors).some((k) => stepOfError(k) === 1), [allErrors]);
  const step2Valid = useMemo(() => step1Valid && !Object.keys(allErrors).some((k) => stepOfError(k) === 2), [allErrors, step1Valid]);
  const maxUnlockedStep = step2Valid ? 3 : step1Valid ? 2 : 1;

  // Choosing an event type pre-selects the template made for it. Only a template this form chose itself is ever
  // replaced: once the organizer picks one by hand, their choice stays.
  const availableTemplates = useRef<SuggestableTemplate[]>([]);
  const autoTemplateId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    templateService.getTemplates().then((res) => {
      if (!cancelled && res.success && Array.isArray(res.data)) availableTemplates.current = res.data;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (p: Partial<EventDraft>) => {
    let templatePatch: Partial<EventDraft> = {};
    if (("categoryId" in p || "subcategoryId" in p) && (!draft.template || draft.template.id === autoTemplateId.current)) {
      const category = "categoryId" in p ? p.categoryId || "" : draft.categoryId;
      const subcategory = "subcategoryId" in p ? p.subcategoryId || "" : draft.subcategoryId;
      const suggestion = suggestTemplate(availableTemplates.current, category, subcategory);
      autoTemplateId.current = suggestion ? suggestion._id : null;
      templatePatch = { template: suggestion ? { id: suggestion._id, name: suggestion.name, previewKey: suggestion.previewImageKey || null } : null };
    }
    setDraft((prev) => ({ ...prev, ...p, ...templatePatch }));
  };

  // A new event starts by choosing a template (the dialog cannot be closed until one is chosen); the template then
  // sets the event category and subcategory. Editing a saved event does not ask again.
  const mustPickTemplate = !eventId && draftHydrated && !draft.template;
  const chooseTemplate = (template: SelectedTemplate | null, suggested?: { categoryId: string; subcategoryId: string }) => {
    // an explicit choice is never swapped out by the automatic suggestion that follows a category change
    autoTemplateId.current = null;
    setDraft((prev) => ({
      ...prev,
      template,
      // the template's event type fills the category and subcategory; a general template leaves what is there
      ...(suggested?.categoryId ? { categoryId: suggested.categoryId, subcategoryId: suggested.subcategoryId } : {}),
    }));
  };

  // Invitee files cannot be kept in a saved draft: after a restore, name the ones that have to be attached again (none, no mention)
  const missingFiles = Object.entries(draft.inviteeFileNames || {}).filter(([key, name]) => !!name && !sessionFiles[key]).map(([, name]) => name);

  const handleStepChange = (targetStep: number) => {
    if (targetStep === currentStep) return;

    // Moving backward is always allowed
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // Moving forward (targetStep > currentStep): Check all prior steps
    const blockingKeys = Object.keys(allErrors).filter((k) => stepOfError(k) < targetStep);

    if (blockingKeys.length > 0) {
      setShowErrors(true);
      setBlockedCount((n) => n + 1);
      const earliestStepWithErrors = Math.min(...blockingKeys.map(stepOfError));
      setCurrentStep(earliestStepWithErrors);
      return;
    }

    setCurrentStep(targetStep);
  };

  const handleFinish = () => {
    const keys = Object.keys(allErrors);
    if (keys.length > 0) {
      setShowErrors(true);
      setCurrentStep(Math.min(...keys.map(stepOfError)));
      return;
    }
    onSubmit({ draft, sessionFiles });
  };

  const discard = async () => {
    const confirmed = await confirm({
      title: "Discard this draft?",
      message: "The information you entered will be lost.",
      confirmText: "Discard",
      cancelText: "Keep editing",
      tone: "danger",
    });
    if (!confirmed) return;
    setSessionFiles({});
    setShowErrors(false);
    setCurrentStep(1);
    onDiscardDraft();
  };

  const pickerValue = (() => {
    if (!pickerTarget) return null;
    if (pickerTarget.kind === "event") return (draft[pickerTarget.field] || draft.start) as string | null;
    const session = draft.sessions.find((s) => s.key === pickerTarget.key);
    return session ? session[pickerTarget.field] : null;
  })();

  const pickerTitle = (() => {
    if (!pickerTarget) return undefined;
    if (pickerTarget.kind === "event") {
      return { start: "Event start", end: "Event end", rsvpDeadline: "RSVP last date" }[pickerTarget.field];
    }
    const session = draft.sessions.find((s) => s.key === pickerTarget.key);
    return `${session?.name || "Session"} ${pickerTarget.field === "start" ? "start" : "end"}`;
  })();

  // Writes the picked instant to exactly the field that opened the picker
  const handlePickerSave = (iso: string) => {
    const target = pickerTarget;
    if (!target) return;
    if (target.kind === "event") {
      if (target.field === "rsvpDeadline") patch({ rsvpDeadline: iso });
      // choosing the start sets the end to the same time the next day; the end can still be changed afterwards
      else if (target.field === "start") setDraft((prev) => applyEventWindow(prev, { start: iso, end: new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000).toISOString() }));
      else setDraft((prev) => applyEventWindow(prev, { [target.field]: iso }));
      return;
    }
    setDraft((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.key === target.key ? { ...s, [target.field]: iso, timesLinked: false } : s)),
    }));
  };

  // The invitee lists were filled in from the Excel sample: changing the card's guest details afterwards means they no longer fit
  const listsBuiltFromSample = !!draft.sampleDownloaded || !!downloadedColumns || existingLists.length > 0 || Object.values(sessionFiles).some(Boolean);
  const step2Change = (p: Partial<EventDraft>) => {
    if (p.cardInfo !== undefined && listsBuiltFromSample && JSON.stringify(p.cardInfo) !== JSON.stringify(draft.cardInfo)) {
      setResetError(null);
      setPendingCardInfo(p.cardInfo);
      return;
    }
    patch(p);
  };
  const confirmListReset = async () => {
    if (pendingCardInfo === null) return;
    // an event being edited already has its lists on the server: they are deleted first (refused once anything was sent)
    if (eventId && existingLists.length > 0) {
      setResetBusy(true);
      const res = await inviteeService.clearUnusedLists(eventId);
      setResetBusy(false);
      if (!res.success) { setResetError(res.message || "The invitee lists could not be deleted."); return; }
      setExistingLists([]);
    }
    setSessionFiles({});
    setDownloadedColumns(null);
    setDraft((prev) => ({ ...prev, cardInfo: pendingCardInfo, inviteeFileNames: {}, sampleDownloaded: false }));
    setPendingCardInfo(null);
  };

  // one stable object per choice, so the card preview is only redrawn when a tick actually changes
  const cd = { ...CARD_DISPLAY_DEFAULTS, ...(draft.cardDisplay || {}) };
  const cardDisplay = useMemo(() => ({ title: cd.title, qr: cd.qr, dateTime: cd.dateTime, location: cd.location }), [cd.title, cd.qr, cd.dateTime, cd.location]);

  const previewSession = previewKey ? draft.sessions.find((s) => s.key === previewKey) : undefined;
  const previewFile = previewKey ? sessionFiles[previewKey] : undefined;

  const currentStepHasErrors = showErrors && Object.keys(allErrors).some((k) => stepOfError(k) === currentStep);

  return (
    <div className="w-full flex-1 flex flex-col bg-white">
      <PageHeader title={heading} />

      {(draftStatus !== "idle" || draftSavedAt || submitError || currentStepHasErrors) && (
        <div className="px-4 sm:px-6 pt-4 space-y-2">
          {currentStepHasErrors && (
            <div role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Please complete all required details on Step {currentStep} before proceeding to the next step.</span>
              </div>
              <button type="button" onClick={() => setShowErrors(false)} className="text-amber-700 hover:text-amber-900 font-medium text-xs cursor-pointer shrink-0">Dismiss</button>
            </div>
          )}
          {draftStatus === "restored" && (
            <div role="status" className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                Your unsaved draft was restored.
                {missingFiles.length > 0 && (
                  <> The invitee file {missingFiles.length === 1 ? <>&ldquo;{missingFiles[0]}&rdquo; needs</> : <>{missingFiles.map((n) => `“${n}”`).join(", ")} need</>} to be attached again.</>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={onDismissDraftStatus} className="font-medium cursor-pointer">OK</button>
                {canDiscard && (
                  <button type="button" onClick={discard} className="font-medium text-rose-600 cursor-pointer">Discard draft</button>
                )}
              </div>
            </div>
          )}
          {draftStatus === "discarded-stale" && (
            <div role="status" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm flex items-center justify-between gap-2">
              <span>An older unsaved draft was discarded because this event was changed since it was saved.</span>
              <button type="button" onClick={onDismissDraftStatus} className="font-medium cursor-pointer shrink-0">OK</button>
            </div>
          )}
          {submitError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm break-words">
              {submitError} Your entries are kept, so you can fix the problem and try again.
            </div>
          )}
          {draftSavedAt && draftStatus !== "restored" && (
            <p className="text-xs text-[#828282]">
              Draft saved on this device at {new Date(draftSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {canDiscard && (
                <>
                  {" · "}
                  <button type="button" onClick={discard} className="underline cursor-pointer hover:text-rose-600">Discard draft</button>
                </>
              )}
            </p>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6 flex-1">
        {/* overflow-clip (not hidden, which would break the sticky header and preview) trims the white header and the beige
            preview column to the rounded border, so no square corners poke past it */}
        <div className="border border-[#E0E0E0] rounded-lg overflow-clip flex flex-col xl:flex-row bg-white">
          <div className="w-full xl:w-[62%] flex flex-col min-w-0">
            <StepHeader currentStep={currentStep} onStepClick={handleStepChange} maxUnlockedStep={maxUnlockedStep} />
            <div ref={stepContentRef} className="flex-1">
              {featuresLoading ? (
                <div className="p-8 text-center text-sm text-[#667085]" role="status">Loading saved event settings…</div>
              ) : featuresError || !features ? (
                <div className="p-8 text-center space-y-3" role="alert">
                  <p className="text-sm text-rose-700">{featuresError || "Event settings are unavailable."} The event form needs the saved platform settings before you can continue.</p>
                  <button type="button" onClick={() => void loadFeatures()} className="px-4 py-2 border border-[#FF651D] rounded-md text-sm font-medium text-[#E5520F]">Retry</button>
                </div>
              ) : currentStep === 1 ? (
                <Step1EventDetails
                  draft={draft}
                  onChange={patch}
                  onOpenDatePicker={(field) => setPickerTarget({ kind: "event", field })}
                  categories={categories}
                  canManageCategories={isAdmin || user?.role === "ORGANIZER"}
                  isAdmin={isAdmin}
                  isEditing={!!eventId}
                  rsvpAllowed={features.allowEventRSVP}
                  errors={visibleErrors}
                  onNext={() => handleStepChange(2)}
                  onCancel={onCancel}
                />
              ) : currentStep === 2 ? (
                <Step2Settings draft={draft} onChange={step2Change} errors={visibleErrors} features={features} sampleColumnsChanged={!!downloadedColumns && downloadedColumns.join("|") !== excelColumnsFor(inviteeConfig).join("|")} onNext={() => handleStepChange(3)} onBack={() => setCurrentStep(1)} />
              ) : (
                <Step3Sessions
                  sessions={draft.sessions}
                  onSessionsChange={(sessions) => patch({ sessions })}
                  sessionFiles={sessionFiles}
                  existingLists={existingLists}
                  onSampleDownloaded={() => { setDownloadedColumns(excelColumnsFor(inviteeConfig)); patch({ sampleDownloaded: true }); }}
                  onSessionFileChange={(key, file) => {
                    setSessionFiles((prev) => ({ ...prev, [key]: file || undefined }));
                    // remembered in the draft so a restore can say exactly which file has to be attached again
                    setDraft((prev) => {
                      const names = { ...(prev.inviteeFileNames || {}) };
                      if (file) names[key] = file.name; else delete names[key];
                      return { ...prev, inviteeFileNames: names };
                    });
                  }}
                  skipInvitees={draft.skipInvitees}
                  templateColumns={inviteeConfig}
                  onSkipInviteesChange={(skipInvitees) => patch({ skipInvitees })}
                  eventStart={draft.start}
                  eventEnd={draft.end}
                  errors={visibleErrors}
                  onOpenSessionPicker={(key, field) => setPickerTarget({ kind: "session", key, field })}
                  onOpenInviteesPreview={setPreviewKey}
                  onFinish={handleFinish}
                  onBack={() => setCurrentStep(2)}
                  submitting={submitting}
                  submitLabel={submitLabel}
                />
              )}
            </div>
          </div>
          {/* The column runs the full height of the form; only its contents stick, 16px below the 68px sticky page
              header, so the preview stays in view however long the current step is (admin feedback: sticky preview). It never scrolls itself:
              the card is sized to fit the space below the header, so the form is the only thing that scrolls. */}
          <div className="w-full xl:w-[38%] shrink-0 border-t xl:border-t-0 xl:border-l border-[#E0E0E0] bg-[#F7F3F0]">
            <div className="xl:sticky xl:top-[84px]">
            <MobileCardPreview
              template={draft.template}
              eventTitle={draft.title}
              eventStart={draft.start}
              eventEnd={draft.end}
              venue={draft.venue}
              contactNumber={draft.contactNumber}
              logoKey={draft.logoKey}
              categoryName={categories.categoryName(draft.categoryId)}
              subcategoryName={categories.subcategoryName(draft.categoryId, draft.subcategoryId)}
              onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
              cardInfo={draft.cardInfo ?? null}
              cardDisplay={cardDisplay}
              awaitingTemplate={!eventId && !draft.template}
            />
            </div>
          </div>
        </div>
      </div>

      <SelectTemplateModal
        key={isTemplateModalOpen || mustPickTemplate ? "template-open" : "template-closed"}
        isOpen={isTemplateModalOpen || mustPickTemplate}
        required={mustPickTemplate}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={chooseTemplate}
        onLeave={onCancel}
        extraCategory={extraCategory}
        selectedTemplateId={draft.template?.id}
        categoryId={draft.categoryId || undefined}
        subcategoryId={draft.subcategoryId || undefined}
      />

      {pendingCardInfo !== null && (
        <ListResetWarningModal busy={resetBusy} error={resetError} onCancel={() => setPendingCardInfo(null)} onConfirm={() => void confirmListReset()} />
      )}

      <DateTimePickerModal
        key={pickerTarget ? `${JSON.stringify(pickerTarget)}-${pickerValue ?? ""}` : "picker-closed"}
        isOpen={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        onSave={handlePickerSave}
        value={pickerValue}
        title={pickerTitle}
      />

      {previewKey && previewFile && (
        <InviteesPreviewModal
          title="Invitee Preview List"
          subtitle={`${previewSession?.name || "Session"} · ${previewFile.name}`}
          rows={previewFile.rows}
          showCompany={!!inviteeConfig.company || previewFile.rows.some((r) => r.company)}
          identityLabel={inviteeConfig.identityLabel}
          identity2Label={inviteeConfig.identity2 ? headerFor("identity2", inviteeConfig) : undefined}
          showIdentity={!!inviteeConfig.identity || previewFile.rows.some((r) => r.identity)}
          onClose={() => setPreviewKey(null)}
          onSave={async (rows) => {
            // Edits replace the uploaded file, so the import receives exactly what was previewed
            const key = previewKey;
            const name = sessionFiles[key]?.name;
            if (!name) return;
            const file = await rowsToSheetFile(rows, name);
            setSessionFiles((prev) => {
              const current = prev[key];
              if (!current) return prev;
              return { ...prev, [key]: { ...current, rows, file, problemCount: rows.filter((r) => rowProblem(r)).length } };
            });
          }}
        />
      )}
    </div>
  );
}
