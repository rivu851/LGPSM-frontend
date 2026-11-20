import Link from "next/link";
import type { ReactNode } from "react";

// The brand's blue button and its outlined sibling, shared by every landing section
export const BLUE_GRADIENT = "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)";

export function PrimaryLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} style={{ backgroundImage: BLUE_GRADIENT }} className={`inline-flex h-[54px] items-center justify-center rounded-xl px-6 text-base font-semibold text-white hover:brightness-95 active:scale-[0.98] transition ${className}`}>
      {children}
    </Link>
  );
}

export function OutlineLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex h-[54px] items-center justify-center gap-2 rounded-xl border border-[#000B2C] bg-white px-6 text-base font-semibold text-[#000B2C] hover:bg-[#EAF1FF] transition-colors ${className}`}>
      {children}
    </Link>
  );
}
