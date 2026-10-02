"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Smart QR Invitations",
    description:
      "Generate personalized QR invitations that guests can scan instantly to view event details.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Corner Brackets */}
        <path d="M10 14V11a2 2 0 012-2h3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 14V11a2 2 0 00-2-2h-3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M10 26v3a2 2 0 002 2h3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 26v3a2 2 0 01-2 2h-3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        {/* Orange Horizontal Scanner Beam Line */}
        <line x1="12" y1="20" x2="28" y2="20" stroke="#FF5B22" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "RSVP Management",
    description:
      "Track confirmations, guest responses, and attendance in real-time.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Envelope */}
        <path d="M7 14l13 9 13-9" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="7" y="14" width="26" height="17" rx="3" stroke="#1C2228" strokeWidth="2.5" />
        {/* Heart with Orange Outline inside top flap */}
        <path d="M20 18.5c-1.3-1.8-3.8-1.8-5.1 0-1.2 1.6-.2 3.6 1.2 4.8l3.9 3.2 3.9-3.2c1.4-1.2 2.4-3.2 1.2-4.8-1.3-1.8-3.8-1.8-5.1 0z" stroke="#FF5B22" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    title: "Customizable Designs",
    description:
      "Choose from beautiful templates and customize colors, fonts, and layouts.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Pencil on right */}
        <path d="M26 9l5 5L17 28h-5v-5L26 9z" stroke="#1C2228" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 12l5 5" stroke="#1C2228" strokeWidth="2" />
        {/* Gear wheel on left attached to pencil with orange outline */}
        <path d="M14 11a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" stroke="#FF5B22" strokeWidth="2.2" fill="none" />
        <path d="M14 8.5v2.5M14 20v2.5M8.5 15.5h2.5M20 15.5h2.5M10.1 11.6l1.8 1.8M16.1 17.6l1.8 1.8M10.1 19.4l1.8-1.8M16.1 13.4l1.8-1.8" stroke="#FF5B22" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Guest List Management",
    description:
      "Easily upload and organize your guest list from one dashboard.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Left head (orange circle) */}
        <circle cx="15" cy="14" r="4.5" stroke="#FF5B22" strokeWidth="2.5" fill="none" />
        <path d="M7 30v-1.5a5.5 5.5 0 015.5-5.5h5a5.5 5.5 0 015.5 5.5V30" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        {/* Right head (dark circle) */}
        <circle cx="26" cy="16" r="4" stroke="#1C2228" strokeWidth="2.5" fill="none" />
        <path d="M23 30v-1a4.5 4.5 0 014.5-4.5h2a4.5 4.5 0 014.5 4.5V30" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Instant Sharing",
    description:
      "Send invitations through WhatsApp, Email, SMS, or social media.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Network connection lines */}
        <line x1="20" y1="13" x2="13" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="13" x2="27" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="13" y1="27" x2="27" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        {/* Top Orange Node Circle */}
        <circle cx="20" cy="12" r="3.5" stroke="#FF5B22" strokeWidth="2.5" fill="none" />
        {/* Lower Left Dark Node Circle */}
        <circle cx="12" cy="27" r="3.5" stroke="#1C2228" strokeWidth="2.5" fill="none" />
        {/* Lower Right Dark Node Circle */}
        <circle cx="28" cy="27" r="3.5" stroke="#1C2228" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    title: "Event Dashboard",
    description:
      "Monitor guest responses, invitations sent, and event engagement all in one place.",
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        {/* Top Left Square */}
        <rect x="9" y="9" width="9" height="9" rx="2.5" stroke="#1C2228" strokeWidth="2.5" />
        {/* Top Right Orange Square */}
        <rect x="22" y="9" width="9" height="9" rx="2.5" stroke="#FF5B22" strokeWidth="2.5" fill="none" />
        {/* Bottom Left Square */}
        <rect x="9" y="22" width="9" height="9" rx="2.5" stroke="#1C2228" strokeWidth="2.5" />
        {/* Bottom Right Square */}
        <rect x="22" y="22" width="9" height="9" rx="2.5" stroke="#1C2228" strokeWidth="2.5" />
      </svg>
    ),
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: titleRef.current,
              start: "top 85%",
            },
          }
        );
      }

      if (descRef.current) {
        gsap.fromTo(
          descRef.current,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: descRef.current,
              start: "top 88%",
            },
          }
        );
      }

      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current.children,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="py-20 lg:py-28 bg-white">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          {/* FEATURES badge */}
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C44200]">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="#C44200" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="#C44200" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="#C44200" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="#C44200" />
            </svg>
            <span>FEATURES</span>
          </div>

          {/* Title */}
          <h2 ref={titleRef} className="text-3xl sm:text-4xl lg:text-[46px] font-medium tracking-tight leading-[1.15] font-[family-name:var(--font-space-grotesk)]">
            <span className="text-[#0D0D0D]">Everything You Need to</span>
            <br />
            <span className="text-gray-600 font-normal">Manage Invitations</span>
          </h2>

          {/* Description */}
          <p ref={descRef} className="max-w-2xl mx-auto text-sm sm:text-base text-gray-500 font-normal leading-relaxed font-[family-name:var(--font-space-grotesk)]">
            LGPSM provides all the essential tools you need to create, send, and manage digital invitations effortlessly. From designing beautiful invitations and generating QR codes to organizing guest lists and tracking RSVPs, everything is available in one simple dashboard.
          </p>
        </div>

        {/* 3×2 Features Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center flex flex-col items-center gap-4 group cursor-pointer"
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-1 transition-transform group-hover:scale-110 group-hover:-translate-y-1 duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-[#0D0D0D] tracking-tight font-[family-name:var(--font-space-grotesk)] group-hover:text-[#FF5B22] transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 font-normal leading-relaxed max-w-[270px] font-[family-name:var(--font-space-grotesk)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}


