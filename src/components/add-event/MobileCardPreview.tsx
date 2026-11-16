"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SelectedTemplate, cardDisplayForServer } from "./eventDraft";
import { templateService, TemplatePreviewPayload } from "@/services/templateService";
import CustomDropdown from "@/components/common/CustomDropdown";
import { resolveImageUrl } from "@/utils/mediaUrl";

interface MobileCardPreviewProps {
  template: SelectedTemplate | null;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  venue: string;
  contactNumber?: string;
  cardDisplay?: TemplatePreviewPayload["cardDisplay"];
  logoKey: string | null;
  categoryName: string;
  subcategoryName: string;
  onOpenTemplateModal: () => void;
  /** Saved "Additional Info" choice (null = not set), printed on the preview with sample labels */
  cardInfo?: TemplatePreviewPayload["cardInfo"] | null;
  /** Opens "Customize Information" with the payload this preview renders */
  onOpenAdditionalInfo?: (payload: TemplatePreviewPayload) => void;
  /** Add Event before a template is chosen: nothing is drawn, a "selecting template" loader stands in */
  awaitingTemplate?: boolean;
}

const ZOOM_SCALE: Record<string, number> = { "100%": 1, "75%": 0.75, "50%": 0.5 };

function formatEventDateRange(start: string, end: string): string | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const format = (date: Date) => new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return format(startDate) === format(endDate) ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}

export default function MobileCardPreview({
  template,
  eventTitle,
  eventStart,
  eventEnd,
  venue,
  contactNumber,
  cardDisplay,
  logoKey,
  categoryName,
  subcategoryName,
  onOpenTemplateModal,
  cardInfo,
  onOpenAdditionalInfo,
  awaitingTemplate = false,
}: MobileCardPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState("100%");
  // An uploaded design is the card exactly as it is: no data is drawn on it, so there is nothing to render. Its own picture is shown.
  const staticUrl = template?.staticCard ? resolveImageUrl(template.previewKey) : null;

  // The card is always the real one: the server renders the chosen template with what has been entered so far (title,
  // dates, address, event type, image), so the wording written for this kind of event is visible while filling in the
  // form and follows every change. Nothing static or made up is shown in its place.
  const payload = useMemo<TemplatePreviewPayload>(
    () => ({
      title: eventTitle.trim() || undefined,
      startIso: eventStart || undefined,
      endIso: eventEnd || undefined,
      venue: venue.trim() || undefined,
      contactNumber: contactNumber?.trim() || undefined,
      categoryName: categoryName || undefined,
      subcategoryName: subcategoryName || undefined,
      logoKey: logoKey && /^media:[0-9a-fA-F]{24}$/.test(logoKey) ? logoKey : undefined,
      ...(cardInfo ? { cardInfo } : {}),
      ...(cardDisplay ? { cardDisplay: cardDisplayForServer(cardDisplay) } : {}),
    }),
    [eventTitle, eventStart, eventEnd, venue, contactNumber, categoryName, subcategoryName, logoKey, cardInfo, cardDisplay]
  );
  // the parent builds cardDisplay/cardInfo afresh on every render, so the payload's identity changes constantly even when nothing was
  // typed: depend on its content, or the card is re-requested (and the spinner flashes) over and over
  const payloadKey = JSON.stringify(payload);
  const payloadRef = useRef(payload);
  const [live, setLive] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const liveUrl = useRef<string | null>(null);

  useEffect(() => { payloadRef.current = payload; });

  useEffect(() => {
    // No template chosen: the card is still shown, in the design that suits the event type
    // nothing is drawn until the template has been chosen: no stand-in design is shown meanwhile
    if (awaitingTemplate || staticUrl) return;
    const templateId = template?.id ?? null;
    const key = templateId ?? "by-event-type";
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      templateService
        .previewCard(templateId, payloadRef.current, controller.signal)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
          liveUrl.current = url;
          setLive({ key, url });
          setFailed(false);
        })
        .catch(() => {
          // a card that no longer matches what has been entered is worse than none: drop it and offer "Try again"
          if (controller.signal.aborted) return;
          if (liveUrl.current) { URL.revokeObjectURL(liveUrl.current); liveUrl.current = null; }
          setLive(null);
          setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [template?.id, payloadKey, attempt, awaitingTemplate, staticUrl]);

  useEffect(
    () => () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    },
    []
  );

  const showLive = !awaitingTemplate && !staticUrl && live?.key === (template?.id ?? "by-event-type");
  const hasCard = (showLive && !!live) || !!staticUrl;
  const usesSamplePhoto = !payload.logoKey;
  const eventDateRange = formatEventDateRange(eventStart, eventEnd);

  return (
    <div className="h-full bg-[#F7F3F0] p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-900">Card Preview</h2>
        <div className="w-28">
          <CustomDropdown
            value={zoomLevel}
            onChange={setZoomLevel}
            options={Object.keys(ZOOM_SCALE).map((z) => ({ value: z, label: z }))}
            ariaLabel="Preview zoom"
          />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div
          className={`relative w-[250px] max-w-full aspect-[9/17] bg-[#1E2A33] rounded-[38px] p-2 shadow-xl origin-top transition-transform`}
          style={{ transform: `scale(${ZOOM_SCALE[zoomLevel] ?? 1})` }}
          aria-label="Invitation card preview"
        >
          <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[#EFEFEF] flex items-center justify-center">
            {/* the phone takes the card's own proportions (it is taller when the guest name band and details are added) and the card is
                sized to the space available, so all of it is visible without any scrolling */}
            {hasCard && (
              // eslint-disable-next-line @next/next/no-img-element -- invitation card is a blob URL rendered by the API, or the uploaded design
              <img src={staticUrl ?? live!.url} alt={`${template?.name || "Template"} invitation card`} className="block h-full w-full object-cover object-top" />
            )}
            {!awaitingTemplate && loading && (
              <div role="status" aria-label="Updating preview" className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/90 shadow flex items-center justify-center">
                <svg className="h-4 w-4 animate-spin text-[#C44200]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              </div>
            )}
            {awaitingTemplate && (
              <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]">
                <svg className="h-9 w-9 animate-spin text-[#C44200]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                <p className="text-xs font-medium text-[#4B4F52]">Selecting template…</p>
                <p className="text-[11px] text-[#6B6B6B]">Your card appears here once you choose one.</p>
              </div>
            )}
            {!awaitingTemplate && !staticUrl && !showLive && !failed && <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]" />}
            {!awaitingTemplate && !staticUrl && !showLive && failed && (
              <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
                <p className="text-xs text-[#4B4F52]">The card preview could not be loaded.</p>
                <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-gray-50">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Figma Event_Add event-1: "Change Template" and "Additional Info" side by side ("Edit Additional Info" once set) */}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onOpenTemplateModal}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-gray-900 text-sm font-medium rounded-md cursor-pointer"
          >
            {template ? "Change Template" : "Select Template"}
          </button>
          {onOpenAdditionalInfo && (
            <button
              type="button"
              onClick={() => onOpenAdditionalInfo(payload)}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-gray-900 text-sm font-medium rounded-md cursor-pointer"
            >
              {cardInfo ? "Edit Additional Info" : "Additional Info"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-[#4B4F52] text-center break-words">
          {awaitingTemplate
            ? "Choose a template to see your invitation card."
            : template
            ? `Template: ${template.name}`
            : categoryName
              ? `No template chosen: the design follows the event type (${[categoryName, subcategoryName].filter(Boolean).join(" › ")}).`
              : "No event type chosen yet, so this is a sample design. Choose a category, or select a template, to see the real card."}
        </p>
        {eventDateRange && (
          <p className="mt-1 text-xs font-medium text-[#25216F] text-center" aria-label="Event date range">
            {eventDateRange}
          </p>
        )}
        {(showLive || staticUrl) && (
          <p className="mt-1 text-[11px] text-[#6B6B6B] text-center max-w-[260px]">
            {staticUrl ? "Your uploaded design is used as it is for every guest." : <>{usesSamplePhoto ? "Sample photo, guest and QR. Add an event image to use your own." : "Sample guest and QR."} Each guest gets their own QR when invitations are sent.</>}
          </p>
        )}
        <p className="text-xs text-[#4B4F52] mt-3 text-center">
          Looking for custom card design?{" "}
          <Link href="/contact" className="text-[#15803D] font-medium underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
