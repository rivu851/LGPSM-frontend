"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

// Landing page navigation (EventQRapp brand design): the sections live on the home page, so the links work from any public page.
const LINKS = [
  { href: "/#features", label: "Features", section: "features", page: "/features" },
  { href: "/#how-it-works", label: "How it works", section: "how-it-works", page: "" },
  { href: "/#clients", label: "Clients", section: "clients", page: "" },
  { href: "/#pricing", label: "Pricing", section: "pricing", page: "/pricing" },
  { href: "/#faq", label: "FAQ", section: "faq", page: "" },
];

// The sections in the order they appear down the home page (the menu order differs)
const SECTION_ORDER = ["clients", "how-it-works", "features", "pricing", "faq"];

// On the home page the link of the section being read is the current one; on its own page (Features, Pricing) that page's link is.
function useCurrentSection(): string {
  const pathname = usePathname();
  const [section, setSection] = useState("");
  useEffect(() => {
    if (pathname !== "/") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // the last section whose top has passed just under the sticky bar; above the first one (the hero) nothing is current
      let current = "";
      for (const id of SECTION_ORDER) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setSection(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [pathname]);
  if (pathname === "/") return section;
  return LINKS.find((l) => l.page && pathname.startsWith(l.page))?.section ?? "";
}

const BLUE_GRADIENT = "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const current = useCurrentSection();

  return (
    <header className="hero-anim hero-anim-nav w-full sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-[#E1EAF8]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="EventQRapp home">
          <Image src="/images/branding/eventqrapp-logo.svg" alt="EventQRapp" width={180} height={32} priority className="h-8 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-[30px]">
          {LINKS.map((l) => {
            const on = current === l.section;
            return (
              <Link key={l.label} href={l.href} aria-current={on ? "true" : undefined} className={`relative py-1 text-[15px] font-medium transition-colors ${on ? "text-[#1F65FF]" : "text-[#4A5470] hover:text-[#1F65FF]"}`}>
                {l.label}
                {/* the underline marks where you are, so it is clear even when the pointer is elsewhere */}
                <span aria-hidden className={`absolute inset-x-0 -bottom-[13px] h-[2px] rounded-full bg-[#1F65FF] transition-opacity duration-200 ${on ? "opacity-100" : "opacity-0"}`} />
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/signin?mode=organizer" className="px-3.5 py-3 text-[15px] font-semibold text-[#000B2C] hover:text-[#1F65FF] transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            style={{ backgroundImage: BLUE_GRADIENT }}
            className="h-11 px-6 inline-flex items-center justify-center rounded-xl text-[15px] font-semibold text-white hover:brightness-95 active:scale-[0.98] transition"
          >
            Start your first event
          </Link>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className="lg:hidden p-2 text-[#4A5470] focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E1EAF8] px-4 pt-3 pb-6 space-y-1">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)} aria-current={current === l.section ? "true" : undefined} className={`block py-2.5 text-[15px] font-medium ${current === l.section ? "text-[#1F65FF]" : "text-[#4A5470]"}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-[#E1EAF8]">
            <Link href="/signin?mode=organizer" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 text-[15px] font-semibold text-[#000B2C] border border-[#E1EAF8] rounded-xl hover:bg-[#EAF1FF] transition-colors">Organizer log in</Link>
            <Link href="/signin?mode=admin" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 text-[15px] font-semibold text-[#000B2C] border border-[#E1EAF8] rounded-xl hover:bg-[#EAF1FF] transition-colors">Super Admin log in</Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} style={{ backgroundImage: BLUE_GRADIENT }} className="w-full block text-center py-3 text-[15px] font-semibold text-white rounded-xl">Start your first event</Link>
          </div>
        </div>
      )}
    </header>
  );
}
