"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import StepHeader from "./StepHeader";
import Step1EventDetails, { EventDateField } from "./Step1EventDetails";
import Step2Settings from "./Step2Settings";
import Step3Sessions, { SessionInviteeFile } from "./Step3Sessions";
import MobileCardPreview from "./MobileCardPreview";
import SelectTemplateModal from "./modals/SelectTemplateModal";
import DateTimePickerModal from "./modals/DateTimePickerModal";
import InviteesPreviewModal from "./modals/InviteesPreviewModal";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { ALL_EVENT_FEATURES, EventFeatureSettings, platformSettingsService } from "@/services/platformSettingsService";
import { rowProblem, rowsToSheetFile } from "@/utils/inviteeSheet";
import { DraftErrors, EventDraft, applyEventWindow, stepOfError, validateEventDraft } from "./eventDraft";
import { DraftStatus } from "@/hooks/useFormDraft";

type PickerTarget =
  | { kind: "event"; field: EventDateField }
  | { kind: "session"; key: string; field: "start" | "end" };

export interface EventWizardSubmit {
  draft: EventDraft;
  sessionFiles: Record<string, SessionInviteeFile | undefined>;
}

interface EventWizardProps {
  heading: string;
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
export default function EventWizard({
  heading,
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
  const { user } = useAuth();
  const categories = useCategories();
  const stepContentRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [features, setFeatures] = useState<EventFeatureSettings>(ALL_EVENT_FEATURES);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<Record<string, SessionInviteeFile | undefined>>({});
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  // Options the admin switched off are hidden from the form (the backend also enforces them)
  useEffect(() => {
    platformSettingsService.getEventFeatures().then((res) => {
      if (res.success && res.data) setFeatures(res.data);
    });
  }, []);

  useEffect(() => {
    if (stepContentRef.current) {
      gsap.fromTo(stepContentRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" });
    }
  }, [currentStep]);

  const subcategoryRequired = !!draft.categoryId && categories.subcategoryOptionsFor(draft.categoryId).length > 0;
  const isAdmin = user?.role === "ADMIN";
  const allErrors = useMemo(() => validateEventDraft(draft, { subcategoryRequired, isAdmin }), [draft, subcategoryRequired, isAdmin]);
  const visibleErrors: DraftErrors = showErrors ? allErrors : {};

  const step1Valid = useMemo(() => !Object.keys(allErrors).some((k) => stepOfError(k) === 1), [allErrors]);
  const step2Valid = useMemo(() => step1Valid && !Object.keys(allErrors).some((k) => stepOfError(k) === 2), [allErrors, step1Valid]);
  const maxUnlockedStep = step2Valid ? 3 : step1Valid ? 2 : 1;

  const patch = (p: Partial<EventDraft>) => setDraft((prev) => ({ ...prev, ...p }));

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

  const discard = () => {
    if (confirm("Discard this draft? The information you entered will be lost.")) {
      setSessionFiles({});
      setShowErrors(false);
      setCurrentStep(1);
      onDiscardDraft();
    }
  };

  const pickerValue = (() => {
    if (!pickerTarget) return null;
    if (pickerTarget.kind === "event") return draft[pickerTarget.field] || draft.start;
    const session = draft.sessions.find((s) => s.key === pickerTarget.key);
    return session ? session[pickerTarget.field] : null;
  })();

  const pickerTitle = (() => {
    if (!pickerTarget) return undefined;
    if (pickerTarget.kind === "event") {
      return pickerTarget.field === "start" ? "Event start" : pickerTarget.field === "end" ? "Event end" : "RSVP last date";
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
      else setDraft((prev) => applyEventWindow(prev, { [target.field]: iso }));
      return;
    }
    setDraft((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.key === target.key ? { ...s, [target.field]: iso, timesLinked: false } : s)),
    }));
  };

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
              <span>Your unsaved draft was restored. Uploaded invitee files need to be attached again.</span>
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
        <div className="border border-[#E0E0E0] rounded-lg overflow-hidden flex flex-col xl:flex-row bg-white">
          <div className="w-full xl:w-[62%] flex flex-col min-w-0">
            <StepHeader currentStep={currentStep} onStepClick={handleStepChange} maxUnlockedStep={maxUnlockedStep} />
            <div ref={stepContentRef} className="flex-1">
              {currentStep === 1 && (
                <Step1EventDetails
                  draft={draft}
                  onChange={patch}
                  onOpenDatePicker={(field) => setPickerTarget({ kind: "event", field })}
                  categories={categories}
                  canManageCategories={isAdmin}
                  isAdmin={isAdmin}
                  rsvpAllowed={features.allowEventRSVP}
                  errors={visibleErrors}
                  onNext={() => handleStepChange(2)}
                  onCancel={onCancel}
                />
              )}
              {currentStep === 2 && (
                <Step2Settings draft={draft} onChange={patch} errors={visibleErrors} features={features} onNext={() => handleStepChange(3)} onBack={() => setCurrentStep(1)} />
              )}
              {currentStep === 3 && (
                <Step3Sessions
                  sessions={draft.sessions}
                  onSessionsChange={(sessions) => patch({ sessions })}
                  sessionFiles={sessionFiles}
                  onSessionFileChange={(key, file) => setSessionFiles((prev) => ({ ...prev, [key]: file || undefined }))}
                  skipInvitees={draft.skipInvitees}
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
          <div className="w-full xl:w-[38%] shrink-0 border-t xl:border-t-0 xl:border-l border-[#E0E0E0]">
            <MobileCardPreview
              template={draft.template}
              eventTitle={draft.title}
              eventStart={draft.start}
              venue={draft.venue}
              logoKey={draft.logoKey}
              categoryName={categories.categoryName(draft.categoryId)}
              subcategoryName={categories.subcategoryName(draft.categoryId, draft.subcategoryId)}
              onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <SelectTemplateModal
        key={isTemplateModalOpen ? "template-open" : "template-closed"}
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(template) => patch({ template })}
        selectedTemplateId={draft.template?.id}
        categoryId={draft.categoryId || undefined}
        subcategoryId={draft.subcategoryId || undefined}
      />

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
          title="Invitees List Preview"
          subtitle={`${previewSession?.name || "Session"} · ${previewFile.name}`}
          rows={previewFile.rows}
          onClose={() => setPreviewKey(null)}
          onSave={(rows) => {
            // Edits replace the uploaded file, so the import receives exactly what was previewed
            const key = previewKey;
            setSessionFiles((prev) => {
              const current = prev[key];
              if (!current) return prev;
              return { ...prev, [key]: { ...current, rows, file: rowsToSheetFile(rows, current.name), problemCount: rows.filter((r) => rowProblem(r)).length } };
            });
          }}
        />
      )}
    </div>
  );
}
