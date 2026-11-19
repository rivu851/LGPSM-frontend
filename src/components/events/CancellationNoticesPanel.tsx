"use client";

import React, { useCallback, useEffect, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import { CancellationNotices, eventService } from "@/services/eventService";
import { UNKNOWN_WARNING, channelLine, safeRetryCount, unknownCount } from "@/utils/cancellationSummary";

/** What happened to the "event cancelled" messages for a cancelled event: counts per channel, the ones that did not go, and a retry. */
export default function CancellationNoticesPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<CancellationNotices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [acceptDuplicate, setAcceptDuplicate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await eventService.getCancellationNotices(eventId);
      if (res.success && res.data) { setData(res.data); setError(null); } else setError(res.message || "Could not load the cancellation notices.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the cancellation notices.");
    }
  }, [eventId]);

  // Loaded once per event. Depending on `data` here would reload forever, because every load replaces it.
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  // Messages are sent a moment after cancelling: look again only while some are still waiting
  const waiting = !!data && data.channels.email.PENDING + data.channels.email.SENDING + data.channels.whatsapp.PENDING + data.channels.whatsapp.SENDING > 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  const retry = async (includeUnknown = false) => {
    setRetrying(true);
    try {
      const res = await eventService.retryCancellationNotices(eventId, { includeUnknown });
      setAcceptDuplicate(false);
      if (res.success && res.data) setData(res.data); else setError(res.message || "Retry failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    }
    setRetrying(false);
  };

  return (
    <section aria-labelledby="cancel-notices-title" className="border border-[#E0E0E0] rounded-lg p-5 space-y-3 bg-white">
      <h3 id="cancel-notices-title" className="text-base font-medium text-gray-900">Cancellation notices</h3>
      <PopupMessage message={error} />
      {!data && !error && <p className="text-sm text-[#6B6B6B]">Loading…</p>}
      {data && (
        <>
          {data.guests === 0 ? (
            <p className="text-sm text-[#4B4F52]">No guests had been sent an invitation, so no notices were needed.</p>
          ) : (
            <ul className="text-sm text-[#4B4F52] space-y-1">
              <li>{data.guests} {data.guests === 1 ? "guest" : "guests"} to notify</li>
              {[channelLine("Email", data.channels.email), channelLine("WhatsApp", data.channels.whatsapp)].filter(Boolean).map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
          {data.problems.some((p) => p.status !== "UNKNOWN") && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              <p className="font-medium">Not sent</p>
              <ul className="space-y-0.5">
                {data.problems.filter((p) => p.status !== "UNKNOWN").map((p) => (
                  <li key={`${p.inviteeId}-${p.channel}`} className="break-words">{p.name || "Guest"} — {p.channel === "email" ? "email" : "WhatsApp"}: {p.reason || (p.status === "FAILED" ? "failed" : "unavailable")}</li>
                ))}
              </ul>
            </div>
          )}
          {safeRetryCount(data) > 0 && (
            <button type="button" onClick={() => retry(false)} disabled={retrying} className="px-4 py-2 border border-[#FF651D] text-[#C44200] hover:bg-[#EEF3FF] rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">
              {retrying ? "Retrying…" : "Retry unsent notices"}
            </button>
          )}
          {unknownCount(data) > 0 && (
            <div role="group" aria-label="Notices with an unknown outcome" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 space-y-2">
              <p className="font-medium">Outcome unknown ({unknownCount(data)})</p>
              <p>{UNKNOWN_WARNING}</p>
              <ul className="space-y-0.5">
                {data.problems.filter((p) => p.status === "UNKNOWN").map((p) => (
                  <li key={`${p.inviteeId}-${p.channel}`} className="break-words">{p.name || "Guest"} — {p.channel === "email" ? "email" : "WhatsApp"}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={acceptDuplicate} onChange={(e) => setAcceptDuplicate(e.target.checked)} className="mt-0.5 size-4 accent-rose-600" />
                <span>I understand a guest may receive this message twice.</span>
              </label>
              <button type="button" onClick={() => retry(true)} disabled={retrying || !acceptDuplicate} className="px-4 py-2 border border-rose-600 text-rose-700 hover:bg-rose-100 rounded-md text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {retrying ? "Retrying…" : "Retry these anyway"}
              </button>
            </div>
          )}
          <p className="text-xs text-[#6B6B6B]">“Accepted by the provider” means the email or WhatsApp service took the message; delivery to the guest is not confirmed. Messages already accepted are never sent again.</p>
        </>
      )}
    </section>
  );
}
