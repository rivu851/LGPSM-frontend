"use client";

import React, { useState } from "react";
import { readPhone } from "@/utils/phoneInput";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "maxLength" | "inputMode"> {
  value: string;
  onValueChange: (digits: string) => void;
  /** Where the message goes when the field sits inside a wrapper of its own (a "+91" prefix, a button): the parent shows it */
  onNote?: (message: string | null) => void;
}

/**
 * A phone number field: 0-9 only, at most 10 digits. Letters and symbols never appear in it; when someone types or pastes one, a short
 * message under the field says only numbers are allowed (it clears with the next valid entry or when the field is left).
 */
export default function PhoneInput({ value, onValueChange, onNote, onBlur, ...props }: PhoneInputProps) {
  const [note, setNote] = useState<string | null>(null);
  const show = (m: string | null) => { setNote(m); onNote?.(m); };
  return (
    <>
      <input
        {...props}
        type="tel"
        inputMode="numeric"
        autoComplete={props.autoComplete ?? "tel"}
        value={value}
        aria-invalid={props["aria-invalid"] ?? (note ? true : undefined)}
        onChange={(e) => {
          const r = readPhone(e.target.value);
          onValueChange(r.value);
          show(r.message);
        }}
        onBlur={(e) => { show(null); onBlur?.(e); }}
      />
      {!onNote && note && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{note}</p>}
    </>
  );
}

/** The message line for a PhoneInput that reports its note to the parent (see `onNote`) */
export function PhoneNote({ message }: { message: string | null }) {
  return message ? <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{message}</p> : null;
}
