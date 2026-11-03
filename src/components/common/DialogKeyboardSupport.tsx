"use client";

import { useEffect } from "react";

// The app has many modal overlays written at different times; most had no keyboard behaviour. This gives all of them the same one, without
// touching how they look: focus moves in when one opens and returns when it closes, Tab stays inside, and Escape uses the dialog's own
// Cancel/Close button, so a dialog that is busy (its button disabled) or has no way out cannot be dismissed by accident.
const OVERLAY = '[role="dialog"], .fixed.inset-0';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CLOSE_NAME = /^(close|cancel|dismiss|no|not now|keep|back)\b/i;

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};

const focusablesIn = (el: Element) => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);

/** The dialog on top: the last open overlay in the page that has something to interact with (a bare click-catcher does not count). */
function topDialog(): HTMLElement | null {
  const open = [...document.querySelectorAll<HTMLElement>(OVERLAY)].filter((el) => isVisible(el) && focusablesIn(el).length > 0);
  return open[open.length - 1] ?? null;
}

function closeControl(dialog: Element): HTMLElement | undefined {
  return [...dialog.querySelectorAll<HTMLElement>("button:not([disabled])")].filter(isVisible).find((b) => CLOSE_NAME.test((b.getAttribute("aria-label") || b.textContent || "").trim()));
}

export default function DialogKeyboardSupport() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let returnFocusTo: HTMLElement | null = null;

    const sync = () => {
      const dialog = topDialog();
      if (dialog === active) return;
      if (dialog) {
        if (!active) returnFocusTo = document.activeElement as HTMLElement | null;
        if (!dialog.getAttribute("role")) dialog.setAttribute("role", "dialog");
        if (!dialog.getAttribute("aria-modal")) dialog.setAttribute("aria-modal", "true");
        if (!dialog.contains(document.activeElement)) (dialog.querySelector<HTMLElement>("[autofocus]") ?? focusablesIn(dialog)[0])?.focus();
      } else if (returnFocusTo?.isConnected) {
        returnFocusTo.focus();
        returnFocusTo = null;
      }
      active = dialog;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    // On window, so a dialog that handles these keys itself goes first and can say so with preventDefault
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const dialog = topDialog();
      if (!dialog) return;
      if (e.key === "Escape") {
        const close = closeControl(dialog);
        if (close) { e.preventDefault(); close.click(); }
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusablesIn(dialog);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!current || !dialog.contains(current)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && current === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { observer.disconnect(); window.removeEventListener("keydown", onKeyDown); };
  }, []);
  return null;
}
