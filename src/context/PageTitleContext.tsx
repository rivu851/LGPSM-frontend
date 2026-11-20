"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { eventService } from "@/services/eventService";
import { eventIdFromPath } from "@/utils/eventRoute.mjs";

interface PageTitleContextType {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
  cacheEventTitle: (eventId: string, title: string) => void;
  getEventTitle: (eventId: string) => string | null;
}

const PageTitleContext = createContext<PageTitleContextType>({
  customTitle: null,
  setCustomTitle: () => {},
  cacheEventTitle: () => {},
  getEventTitle: () => null,
});

const BRAND_SUFFIX = " · EventQRapp";

function formatFullTitle(raw: string): string {
  if (!raw) return "EventQRapp · QR Invitations, RSVP & Event Entry";
  if (raw.includes("EventQRapp")) return raw;
  return `${raw}${BRAND_SUFFIX}`;
}

/**
 * In-memory map of known event titles, backed by sessionStorage for instant tab titles across navigations.
 */
const inMemoryEventCache = new Map<string, string>();

function getStoredEventTitle(eventId: string): string | null {
  if (!eventId) return null;
  if (inMemoryEventCache.has(eventId)) {
    return inMemoryEventCache.get(eventId)!;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`lgpsm_evt_title_${eventId}`);
      if (stored) {
        inMemoryEventCache.set(eventId, stored);
        return stored;
      }
    } catch {
      // sessionStorage unavailable
    }
  }
  return null;
}

function storeEventTitle(eventId: string, title: string) {
  if (!eventId || !title) return;
  inMemoryEventCache.set(eventId, title);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`lgpsm_evt_title_${eventId}`, title);
    } catch {
      // sessionStorage unavailable
    }
  }
}

/**
 * Derives a context-rich tab title from the current pathname and query parameters.
 */
function resolveRouteTitle(
  pathname: string,
  searchParams: URLSearchParams,
  eventTitle: string | null
): string {
  if (pathname === "/") return "EventQRapp · QR Invitations, RSVP & Event Entry";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/events") return "Events";
  if (pathname === "/events/add") return "Create Event";
  if (pathname === "/billing") return "Billing & Subscriptions";
  if (pathname === "/earnings") return "Earnings & Payouts";
  if (pathname === "/reports") return "Reports & Analytics";
  if (pathname === "/templates") return "Templates";
  if (pathname === "/templates/ai") return "Design with AI";
  if (pathname === "/notifications" || pathname === "/notification") return "Notifications";
  if (pathname === "/event-organizer") return "Event Organizers";
  if (pathname === "/event-organizer/add") return "Add Organizer";
  if (pathname === "/user-management") return "User Management";
  if (pathname === "/user-management/add") return "Add User";
  if (pathname === "/user-management/assign") return "Assign Users";

  // Settings routes
  if (pathname === "/settings") return "Settings";
  if (pathname === "/settings/account") return "Account Settings";
  if (pathname === "/settings/event") return "Event Settings";
  if (pathname === "/settings/notification") return "Notification Settings";
  if (pathname === "/settings/price-rate") return "Price Rate Settings";
  if (pathname === "/settings/template") return "Template Settings";

  // Marketing
  if (pathname === "/features") return "Features";
  if (pathname === "/pricing") return "Pricing Plans";
  if (pathname === "/contact") return "Contact Us";

  // Auth routes
  if (pathname === "/forgot-password") return "Forgot Password";
  if (pathname === "/verify-email") return "Verify Email";
  if (pathname === "/signup") return "Create Account";
  if (pathname === "/signin") {
    const mode = searchParams.get("mode");
    if (mode === "admin") return "Admin Sign In";
    if (mode === "organizer") return "Organizer Sign In";
    return "Sign In";
  }

  // Dynamic Event Routes: /events/:id or /events/:id/:sub
  const eventMatch = pathname.match(/^\/events\/([^/]+)(?:\/(edit|sessions|invitees|assign-users))?$/);
  if (eventMatch) {
    const [, , sub] = eventMatch;
    const name = eventTitle;

    if (!sub) {
      return name ? name : "Event Details";
    }
    if (sub === "edit") {
      return name ? `Edit: ${name}` : "Edit Event";
    }
    if (sub === "sessions") {
      return name ? `Sessions · ${name}` : "Event Sessions";
    }
    if (sub === "invitees") {
      return name ? `Invitees · ${name}` : "Event Invitees";
    }
    if (sub === "assign-users") {
      return name ? `Assign Users · ${name}` : "Assign Users";
    }
  }

  // Dynamic Organizer Route: /event-organizer/:id
  const orgMatch = pathname.match(/^\/event-organizer\/([^/]+)$/);
  if (orgMatch) {
    return "Organizer Details";
  }

  // Dynamic Invitation Route: /invitation/:token
  const invMatch = pathname.match(/^\/invitation\/([^/]+)$/);
  if (invMatch) {
    return "Event Invitation";
  }

  return "EventQRapp";
}

function TitleWatcher({
  customTitle,
  cacheEventTitle,
}: {
  customTitle: string | null;
  cacheEventTitle: (eventId: string, title: string) => void;
}) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  // Extract eventId if on an event route
  // Only real event ids: /events/add and the sidebar's /events/select/... are route names, not events to fetch
  const currentEventId = eventIdFromPath(pathname);
  const isExcludedId = !currentEventId;

  const [fetchedEventTitle, setFetchedEventTitle] = useState<string | null>(() => {
    return isExcludedId ? null : getStoredEventTitle(currentEventId);
  });

  const lastEventIdRef = useRef<string | null>(null);

  // Background fetch event title if cold-navigating to an event route
  useEffect(() => {
    if (isExcludedId || !currentEventId) {
      setFetchedEventTitle(null);
      lastEventIdRef.current = null;
      return;
    }

    if (lastEventIdRef.current === currentEventId && fetchedEventTitle) {
      return;
    }
    lastEventIdRef.current = currentEventId;

    const cached = getStoredEventTitle(currentEventId);
    if (cached) {
      setFetchedEventTitle(cached);
      return;
    }

    let isSubscribed = true;
    eventService
      .getEvent(currentEventId)
      .then((res) => {
        if (!isSubscribed) return;
        if (res.success && res.data?.title) {
          const t = res.data.title;
          cacheEventTitle(currentEventId, t);
          setFetchedEventTitle(t);
        }
      })
      .catch(() => {
        // Silently ignore fetch errors in title resolver
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentEventId, isExcludedId, cacheEventTitle, fetchedEventTitle]);

  // Synchronize document.title
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (customTitle && customTitle.trim()) {
      document.title = formatFullTitle(customTitle.trim());
      return;
    }

    const routeTitle = resolveRouteTitle(
      pathname,
      searchParams || new URLSearchParams(),
      fetchedEventTitle
    );

    document.title = formatFullTitle(routeTitle);
  }, [pathname, searchParams, customTitle, fetchedEventTitle]);

  return null;
}

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  const cacheEventTitle = useCallback((eventId: string, title: string) => {
    storeEventTitle(eventId, title);
  }, []);

  const getEventTitle = useCallback((eventId: string) => {
    return getStoredEventTitle(eventId);
  }, []);

  return (
    <PageTitleContext.Provider
      value={{
        customTitle,
        setCustomTitle,
        cacheEventTitle,
        getEventTitle,
      }}
    >
      <Suspense fallback={null}>
        <TitleWatcher
          customTitle={customTitle}
          cacheEventTitle={cacheEventTitle}
        />
      </Suspense>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleContext() {
  return useContext(PageTitleContext);
}

/**
 * Hook for pages and components to dynamically set the browser tab title.
 * Automatically clears the custom title when the component unmounts.
 */
export function usePageTitle(title?: string | null) {
  const { setCustomTitle } = usePageTitleContext();

  useEffect(() => {
    if (title && title.trim()) {
      setCustomTitle(title.trim());
    } else {
      setCustomTitle(null);
    }

    return () => {
      setCustomTitle(null);
    };
  }, [title, setCustomTitle]);
}
