import Image from "next/image";
import type { ReactNode } from "react";

// Shared pieces of the landing page (EventQRapp brand design)
export const INK = "#000B2C";
export const BODY = "#4A5470";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-12 ${className}`}>{children}</div>;
}

/** Headline in DM Sans, as every section of the design uses */
export function Headline({ children, className = "", as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h1" | "h2" | "h3" }) {
  return (
    <Tag className={`font-[family-name:var(--font-dm-sans)] text-[32px] leading-[1.1] tracking-[-0.9px] sm:text-[40px] lg:text-[48px] ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionHeading({ title, subtitle, dark = false, className = "" }: { title: string; subtitle?: string; dark?: boolean; className?: string }) {
  return (
    <div className={`mx-auto flex max-w-[900px] flex-col items-center gap-4 text-center ${className}`}>
      <Headline className={dark ? "text-white" : "text-[#000B2C]"}>{title}</Headline>
      {subtitle ? <p className={`max-w-[640px] text-[16px] leading-[1.6] sm:text-[17px] ${dark ? "text-[#C3CCE6]" : "text-[#4A5470]"}`}>{subtitle}</p> : null}
    </div>
  );
}

export function Tick({ className = "" }: { className?: string }) {
  return <Image src="/images/landing/tick.svg" alt="" width={20} height={20} className={`shrink-0 ${className}`} />;
}

export function CheckList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3 text-[16px] leading-[1.5] text-[#4A5470] sm:text-[17px]">
          <Tick className="mt-0.5" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
