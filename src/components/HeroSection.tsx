import type React from "react";
import Image from "next/image";
import { OutlineLink, PrimaryLink } from "@/components/landing/BlueButton";

// Landing hero (Figma "EventQRapp — Landing Page-Ver2", node 66:119)
export default function HeroSection() {
  return (
    <section id="home" className="scroll-mt-[69px] relative w-full overflow-hidden bg-[#F6F6FF]">
      {/* faint grid lines behind the headline */}
      <Image src="/images/landing/hero-lines.svg" alt="" aria-hidden width={1633} height={681} unoptimized className="pointer-events-none absolute left-[-67px] top-[186px] hidden max-w-none lg:block" />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 px-4 pt-10 sm:px-6 lg:px-12">
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <div className="hero-anim inline-flex items-center gap-2 rounded-full border border-[#E1E7F2] bg-white py-[7px] pl-2 pr-3.5" style={{ "--d": "0ms" } as React.CSSProperties}>
            <span className="flex size-[22px] items-center justify-center rounded-full bg-[#EAF1FF]">
              <Image src="/images/landing/hero-badge-icon.svg" alt="" width={13} height={13} />
            </span>
            <span className="text-[13px] sm:text-[15px] text-[#4A5470]">Event invitations, RSVP and entry control in one place</span>
          </div>

          <h1 style={{ "--d": "110ms" } as React.CSSProperties} className="hero-anim font-[family-name:var(--font-dm-sans)] text-[34px] leading-[40px] tracking-[-1px] text-[#000B2C] sm:text-[46px] sm:leading-[52px] lg:text-[58px] lg:leading-[64px] lg:tracking-[-2.24px]">
            From invitation to entry, manage every guest and every session with ease.
          </h1>

          <p style={{ "--d": "220ms" } as React.CSSProperties} className="hero-anim max-w-[1100px] text-[15px] leading-relaxed text-[#4A5470] sm:text-[17px] lg:px-10">
            EventQRapp lets you design a QR invitation card, upload your guest list from Excel, set who can enter which session, and send every invite by email and WhatsApp in one click. On the day, your staff scan guests in while you watch attendance live.
          </p>

          <div style={{ "--d": "330ms" } as React.CSSProperties} className="hero-anim flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <PrimaryLink href="/signup">Create your first event</PrimaryLink>
            <OutlineLink href="/#how-it-works">
              See how it works
              <Image src="/images/landing/play-circle.svg" alt="" width={24} height={24} />
            </OutlineLink>
          </div>

          <p style={{ "--d": "410ms" } as React.CSSProperties} className="hero-anim text-[15px] text-[#4A5470]">No subscription. Pay only for the guests you invite.</p>
        </div>

        {/* product shot on a blue stage */}
        <div style={{ "--d": "480ms" } as React.CSSProperties} className="hero-anim hero-anim-stage relative h-[230px] w-full overflow-hidden rounded-t-[20px] bg-[#1F65FF] sm:h-[400px] lg:h-[593px]">
          <Image src="/images/landing/hero-wave-1.svg" alt="" aria-hidden width={470} height={693} unoptimized className="pointer-events-none absolute left-[-8px] top-[-190px] max-w-none opacity-80" />
          <Image src="/images/landing/hero-wave-2.svg" alt="" aria-hidden width={1240} height={650} unoptimized className="pointer-events-none absolute left-[-47px] top-[-40px] hidden max-w-none lg:block" />
          <div className="absolute left-1/2 top-[6%] aspect-[964/602] w-[88%] max-w-[964px] -translate-x-1/2 overflow-hidden rounded-t-md">
            <Image src="/images/landing/organiser-dashboard.jpg" alt="The EventQRapp organiser dashboard: creating an event with a live QR invitation card preview" width={1440} height={1034} priority sizes="(max-width: 1024px) 88vw, 964px" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
