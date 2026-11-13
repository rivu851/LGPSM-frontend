"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { eventService } from "@/services/eventService";
import { sessionService } from "@/services/sessionService";
import { inviteeService } from "@/services/inviteeService";
import { assignmentService } from "@/services/assignmentService";

export function notifyDbUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lgpsm-db-update"));
  }
}

type TabId = "overview" | "sessions" | "invitees" | "assign-users";
type Counts = { sessions: number; invitees: number; assignments: number };

// Counts survive tab switches (each tab is its own page, so this component remounts on every click): the
// last known numbers show immediately and are refreshed in the background, and tabs mounting together share one request
const countsCache = new Map<string, Counts>();
const countsInflight = new Map<string, Promise<Counts | null>>();

interface EventSubNavProps {
  eventId: string;
  activeTab: TabId;
  sessionsCount?: number;
  inviteesCount?: number;
  assignmentsCount?: number;
}

export default function EventSubNav({
  eventId,
  activeTab,
  sessionsCount: propSessionsCount,
  inviteesCount: propInviteesCount,
  assignmentsCount: propAssignmentsCount,
}: EventSubNavProps) {
  const cached = countsCache.get(eventId);
  // null = not known yet: shown as a small placeholder, never as a made-up "00". A count already seen on another tab of this
  // event is shown at once.
  const known = (n: number | undefined) => (n !== undefined && n >= 0 ? n : null);
  const [sessionsCount, setSessionsCount] = useState<number | null>(propSessionsCount ?? known(cached?.sessions));
  const [inviteesCount, setInviteesCount] = useState<number | null>(propInviteesCount ?? known(cached?.invitees));
  const [assignmentsCount, setAssignmentsCount] = useState<number | null>(propAssignmentsCount ?? known(cached?.assignments));
  // The clicked tab lights up at once instead of waiting for the next page to render
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const shownTab = pendingTab ?? activeTab;

  // Pages pass their own totals, but usually render before their data has loaded (e.g. sessions.length is 0 at
  // first). Follow the totals whenever they change instead of keeping the value seen on mount.
  const [seenProps, setSeenProps] = useState({ propSessionsCount, propInviteesCount, propAssignmentsCount });
  if (
    seenProps.propSessionsCount !== propSessionsCount ||
    seenProps.propInviteesCount !== propInviteesCount ||
    seenProps.propAssignmentsCount !== propAssignmentsCount
  ) {
    setSeenProps({ propSessionsCount, propInviteesCount, propAssignmentsCount });
    if (propSessionsCount !== undefined) setSessionsCount(propSessionsCount);
    if (propInviteesCount !== undefined) setInviteesCount(propInviteesCount);
    if (propAssignmentsCount !== undefined) setAssignmentsCount(propAssignmentsCount);
  }

  // Fallback counts live in a ref so parent re-renders do not trigger another round of requests
  const fallbackCounts = useRef({ propSessionsCount, propInviteesCount, propAssignmentsCount });
  useEffect(() => {
    fallbackCounts.current = { propSessionsCount, propInviteesCount, propAssignmentsCount };
    // Keep the shared cache in step so the next tab opened starts from the page's latest totals
    const previous = countsCache.get(eventId);
    if (previous) {
      countsCache.set(eventId, {
        sessions: propSessionsCount ?? previous.sessions,
        invitees: propInviteesCount ?? previous.invitees,
        assignments: propAssignmentsCount ?? previous.assignments,
      });
    }
  }, [eventId, propSessionsCount, propInviteesCount, propAssignmentsCount]);

  const fetchUnifiedCounts = useCallback(async (force = false) => {
    const { propSessionsCount, propInviteesCount, propAssignmentsCount } = fallbackCounts.current;
    if (!eventId || eventId === "1" || eventId === "select") return;

    const previous = countsCache.get(eventId);
    const known: Counts = {
      sessions: propSessionsCount ?? (force ? -1 : previous?.sessions ?? -1),
      invitees: propInviteesCount ?? (force ? -1 : previous?.invitees ?? -1),
      assignments: propAssignmentsCount ?? (force ? -1 : previous?.assignments ?? -1),
    };
    countsCache.set(eventId, {
      sessions: known.sessions >= 0 ? known.sessions : previous?.sessions ?? -1,
      invitees: known.invitees >= 0 ? known.invitees : previous?.invitees ?? -1,
      assignments: known.assignments >= 0 ? known.assignments : previous?.assignments ?? -1,
    });
    if (known.sessions >= 0 && known.invitees >= 0 && known.assignments >= 0) {
      setSessionsCount(known.sessions);
      setInviteesCount(known.invitees);
      setAssignmentsCount(known.assignments);
      return;
    }

    let request = countsInflight.get(eventId);
    if (!request) {
      request = (async () => {
        try {
          const cachedCounts = countsCache.get(eventId);
          // One request for all three totals. If it is not available (an older server), fall back to the three list calls.
          const single = await eventService.getEventCounts(eventId);
          let next: Counts;
          if (single.success && single.data) {
            next = {
              sessions: known.sessions >= 0 ? known.sessions : single.data.sessions,
              invitees: known.invitees >= 0 ? known.invitees : single.data.invitees,
              assignments: known.assignments >= 0 ? known.assignments : single.data.assignments,
            };
          } else {
            const [sessRes, invRes, assignRes] = await Promise.all([
              known.sessions < 0 ? sessionService.getSessions(eventId) : Promise.resolve(null),
              known.invitees < 0 ? inviteeService.getInvitees(eventId, { limit: 1 }) : Promise.resolve(null),
              known.assignments < 0 ? assignmentService.getEventAssignments(eventId) : Promise.resolve(null),
            ]);
            const inviteeMeta = (invRes as (typeof invRes & { meta?: { total?: number } }) | null)?.meta;
            next = {
              sessions: known.sessions >= 0 ? known.sessions : sessRes?.success ? (sessRes as any).meta?.total ?? (Array.isArray(sessRes.data) ? sessRes.data.length : 0) : cachedCounts?.sessions ?? -1,
              invitees: known.invitees >= 0 ? known.invitees : invRes?.success ? inviteeMeta?.total ?? (Array.isArray(invRes.data) && invRes.data.length < 1 ? 0 : cachedCounts?.invitees ?? -1) : cachedCounts?.invitees ?? -1,
              assignments: known.assignments >= 0 ? known.assignments : assignRes?.success ? (Array.isArray(assignRes.data) ? assignRes.data.length : 0) : cachedCounts?.assignments ?? -1,
            };
          }
          // The page may have finished loading while this request ran: what it reports now wins over the value seen at the start
          const live = fallbackCounts.current;
          if (live.propSessionsCount !== undefined) next.sessions = live.propSessionsCount;
          if (live.propInviteesCount !== undefined) next.invitees = live.propInviteesCount;
          if (live.propAssignmentsCount !== undefined) next.assignments = live.propAssignmentsCount;
          countsCache.set(eventId, next);
          return next;
        } catch (err) {
          console.error("Error loading subnav counts from database:", err);
          return null;
        } finally {
          countsInflight.delete(eventId);
        }
      })();
      countsInflight.set(eventId, request);
    }

    const counts = await request;
    if (!counts) return;
    const latest = fallbackCounts.current;
    if (latest.propSessionsCount !== undefined) counts.sessions = latest.propSessionsCount;
    if (latest.propInviteesCount !== undefined) counts.invitees = latest.propInviteesCount;
    if (latest.propAssignmentsCount !== undefined) counts.assignments = latest.propAssignmentsCount;
    // -1 marks a count the server did not return: keep what the page passed in
    if (counts.sessions >= 0) setSessionsCount(counts.sessions);
    else if (propSessionsCount !== undefined) setSessionsCount(propSessionsCount);
    if (counts.invitees >= 0) setInviteesCount(counts.invitees);
    else if (propInviteesCount !== undefined) setInviteesCount(propInviteesCount);
    if (counts.assignments >= 0) setAssignmentsCount(counts.assignments);
    else if (propAssignmentsCount !== undefined) setAssignmentsCount(propAssignmentsCount);
  }, [eventId]);

  useEffect(() => {
    fetchUnifiedCounts();

    const handleUpdate = () => {
      fetchUnifiedCounts(true);
    };

    window.addEventListener("lgpsm-db-update", handleUpdate);

    return () => {
      window.removeEventListener("lgpsm-db-update", handleUpdate);
    };
  }, [fetchUnifiedCounts]);

  const withCount = (name: string, count: number | null) => (
    <>
      {name} ({count === null ? <span role="status" aria-label="Loading count" className="inline-block align-middle w-4 h-3 rounded bg-gray-200 animate-pulse" /> : count.toString().padStart(2, "0")})
    </>
  );

  const tabs: { id: TabId; href: string; label: React.ReactNode; icon: string }[] = [
    { id: "overview", href: `/events/${eventId}`, label: "Overview", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "sessions", href: `/events/${eventId}/sessions`, label: withCount("Sessions", sessionsCount), icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "invitees", href: `/events/${eventId}/invitees`, label: withCount("Invitees List", inviteesCount), icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { id: "assign-users", href: `/events/${eventId}/assign-users`, label: withCount("Assign System Users", assignmentsCount), icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-1 text-xs font-semibold overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          prefetch
          // Clicking the tab that is already shown (or already loading) must not queue another navigation
          onClick={(e) => {
            if (tab.id === shownTab) {
              e.preventDefault();
              return;
            }
            setPendingTab(tab.id);
          }}
          className={`px-4 py-2 border-b-2 transition-colors shrink-0 flex items-center gap-2 ${
            shownTab === tab.id
              ? "text-[#C44200] border-[#FF5B22] font-bold"
              : "text-gray-500 hover:text-gray-900 border-transparent"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
          </svg>
          <span>{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
