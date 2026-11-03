"use client";

import React, { useEffect, useRef, useState } from "react";
import { invitationService } from "@/services/invitationService";

// Each preview is a server-side render, so a long event list only renders the cards that scroll into view,
// at most four at a time.
const MAX_CONCURRENT = 4;
let running = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

interface EventCardThumbnailProps {
  eventId: string;
  label: string;
}

/** Small invitation-card thumbnail for the organizer event cards (Figma 217:22622: 56px wide, full card height). */
export default function EventCardThumbnail({ eventId, label }: EventCardThumbnailProps) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    withSlot(() => invitationService.previewCard(eventId, undefined, { width: 168 }))
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // The grey placeholder stays; the card itself is still usable
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, eventId]);

  return (
    <div ref={box} className="relative w-14 shrink-0 self-stretch overflow-hidden rounded-[4px] border-[0.5px] border-[#DADADA] bg-[#E2E2E2]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL rendered by the API
        <img src={url} alt={`${label} invitation card`} className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]" />
      )}
    </div>
  );
}
