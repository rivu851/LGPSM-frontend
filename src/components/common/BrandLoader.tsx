import React from "react";
import Image from "next/image";

// Full-screen loading state for session checks (first load, after sign-out): the EventQRapp mark pulses inside a sweeping ring.
// Deliberately wordless, so it never flashes copy such as "verifying" at someone who is only signing in or out.
export default function BrandLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="min-h-screen flex items-center justify-center bg-white">
      <div className="relative size-[88px]">
        <svg className="brand-loader-ring absolute inset-0" viewBox="0 0 88 88" fill="none" aria-hidden>
          <circle cx="44" cy="44" r="40" stroke="#D6E4FF" strokeWidth="4" />
          <path d="M44 4a40 40 0 0 1 40 40" stroke="#1F65FF" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <Image src="/favicon.svg" alt="" width={40} height={40} priority className="brand-loader-mark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
