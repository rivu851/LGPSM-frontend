"use client";

import React, { useState } from "react";
import CustomAlertModal, { type AlertType } from "@/components/common/CustomAlertModal";

/**
 * A message shown as a popup (with the close icon) instead of a banner on the page: it appears the moment `message` has text, so
 * nobody has to notice a strip somewhere on the screen. Closing it hides that message until a different one arrives (or the
 * message is cleared and set again); `onClose` is optional and runs as well, for callers that keep the message in their own state.
 * `action` adds a button such as "Try again" that runs and then closes the popup.
 */
export default function PopupMessage({ message, type = "error", title, action, onClose }: { message: string | null | undefined; type?: AlertType; title?: string; action?: { label: string; onClick: () => void }; onClose?: () => void }) {
  const [closed, setClosed] = useState<string | null>(null);
  // once the message is gone, the same text can open the popup again next time
  if (!message && closed !== null) setClosed(null);
  const open = !!message && message !== closed;
  return (
    <CustomAlertModal
      isOpen={open}
      onClose={() => { setClosed(message || null); onClose?.(); }}
      message={message || ""}
      type={type}
      title={title}
      buttonText={action?.label}
      onAction={action?.onClick}
    />
  );
}
