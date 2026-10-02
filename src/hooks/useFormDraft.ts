"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic custom hook for form draft persistence in localStorage.
 *
 * Form Draft Persistence Lifecycle Rules:
 * - Draft Qualification: Captures in-progress form state (e.g., event wizard step inputs, session lists, selected templates, and media references).
 * - Debounced Auto-Save: Saves user edits to localStorage after a configurable debounce delay (`debounceMs`).
 * - Restoration: Restores stored draft state automatically on client-side mount after hydration.
 * - Clear on Success: Cleared (`clearDraft()`) ONLY when the backend creation/update API call succeeds.
 * - Preserve on Failure: If the API submission fails (e.g. network error, validation rejection), the draft remains intact in localStorage so user input is never lost.
 */

interface StoredDraft<T> {
  version: number;
  savedAt: string;
  // Optional marker of the server record the draft was based on (edit forms); a mismatch means the draft is stale
  baseVersion?: string;
  data: T;
}

export interface UseFormDraftOptions {
  version: number;
  debounceMs?: number;
  maxAgeDays?: number;
  baseVersion?: string;
  // Drafts are only read/written once the key is known (e.g. after the user id is available)
  enabled?: boolean;
}

export interface UseFormDraftHooks<T> {
  // Upgrades a restored draft saved by an older version of the form
  normalize?: (stored: T) => T;
}

export type DraftStatus = "idle" | "restored" | "discarded-stale";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode / quota); the form keeps working without persistence
  }
}

export function useFormDraft<T>(key: string, createInitial: () => T, options: UseFormDraftOptions & UseFormDraftHooks<T>) {
  const { version, debounceMs = 600, maxAgeDays = 14, baseVersion, enabled = true } = options;
  const normalizeRef = useRef(options.normalize);
  useEffect(() => {
    normalizeRef.current = options.normalize;
  }, [options.normalize]);

  const [value, setValue] = useState<T>(createInitial);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dirtyRef = useRef(false);
  const createInitialRef = useRef(createInitial);
  useEffect(() => {
    createInitialRef.current = createInitial;
  }, [createInitial]);

  // Restore once on mount. This must run after hydration (localStorage does not exist on the server),
  // so the stored draft is copied into state from an effect.
  useEffect(() => {
    if (!enabled) return;
    const raw = readStorage(key);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredDraft<T>;
        const ageMs = Date.now() - new Date(stored.savedAt).getTime();
        const expired = !(ageMs >= 0) || ageMs > maxAgeDays * 24 * 3600 * 1000;
        const stale = baseVersion !== undefined && stored.baseVersion !== baseVersion;
        if (stored.version !== version || expired) {
          writeStorage(key, null);
        } else if (stale) {
          writeStorage(key, null);
          setStatus("discarded-stale");
        } else {
          setValue(normalizeRef.current ? normalizeRef.current(stored.data) : stored.data);
          setSavedAt(stored.savedAt);
          setStatus("restored");
          dirtyRef.current = true;
        }
      } catch {
        writeStorage(key, null);
      }
    }
    setHydrated(true);
    // Re-run only when the storage identity changes
  }, [key, enabled, version, maxAgeDays, baseVersion]);

  // Debounced autosave of user edits
  useEffect(() => {
    if (!enabled || !hydrated || !dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      const stamp = new Date().toISOString();
      const payload: StoredDraft<T> = { version, savedAt: stamp, baseVersion, data: value };
      writeStorage(key, JSON.stringify(payload));
      setSavedAt(stamp);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, key, enabled, hydrated, version, baseVersion, debounceMs]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    dirtyRef.current = true;
    setValue(next);
  }, []);

  // Replace the value without marking it as a user edit (e.g. seeding from server data)
  const reset = useCallback((next: T) => {
    dirtyRef.current = false;
    setValue(next);
  }, []);

  const clearDraft = useCallback(() => {
    dirtyRef.current = false;
    writeStorage(key, null);
    setSavedAt(null);
    setStatus("idle");
  }, [key]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setValue(createInitialRef.current());
  }, [clearDraft]);

  return {
    value,
    update,
    reset,
    clearDraft,
    discardDraft,
    status,
    savedAt,
    hydrated,
    dismissStatus: () => setStatus("idle"),
  };
}
