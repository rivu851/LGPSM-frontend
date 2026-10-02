"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TopBanner from "@/components/TopBanner";
import Navbar from "@/app/navbar/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

/* ───────────── feature data ───────────── */
interface FeatureBlock {
  title: string;
  paragraphs: string[];
  bullets?: { label: string; text: string }[];
  image: string;
  imageAlt: string;
  /** true  → text LEFT  / image RIGHT
   *  false → image LEFT / text RIGHT  */
  textFirst: boolean;
}

const featureBlocks: FeatureBlock[] = [
  {
    title: "Secured Access",
    paragraphs: [
      "This platform ensures that only authorized individuals gain access, preventing gate-crashers or unauthorized personnel from entering. Every ticket issued is backed by secure, encrypted data, making fraudulent duplication virtually impossible.",
      "Our robust validation system empowers your on-ground crew to instantly verify attendees, streamline entry points, and eliminate security bottlenecks. Protect your event's revenue, ensure guest safety, and maintain complete control over your guest list with absolute confidence.",
    ],
    image: "/images/features/Features_1.webp",
    imageAlt: "Secured Access – payment and verification flow",
    textFirst: true,
  },
  {
    title: "Session-wise control",
    paragraphs: [
      "This platform offers advanced access control features, including the ability to set specific access levels across different segments of your event. You can grant attendees one-time entry or multiple entries using dynamically updated QR codes.",
    ],
    bullets: [
      {
        label: "Granular Access Levels:",
        text: "Seamlessly manage entry for VIP zones, workshops, meals, or breakout tracks.",
      },
      {
        label: "Flexible Entry Rules:",
        text: "Configure custom permissions for single-use, multi-entry, or time-bound session access.",
      },
    ],
    image: "/images/features/Features_2.webp",
    imageAlt: "Session-wise control – breakfast, lunch, drink & gaming sessions",
    textFirst: false,
  },
  {
    title: "Real-time Reporting",
    paragraphs: [
      "This platform ensures that only authorized individuals gain access, preventing gate-crashers or unauthorized personnel from entering. Every ticket issued is backed by secure, encrypted data, making fraudulent duplication virtually impossible.",
      "Our robust validation system empowers your on-ground crew to instantly verify attendees, streamline entry points, and eliminate security bottlenecks. Protect your event's revenue, ensure guest safety, and maintain complete control over your guest list with absolute confidence.",
    ],
    image: "/images/features/Features_3.webp",
    imageAlt: "Real-time Reporting – dashboard with system user logs and invitees vs attendees",
    textFirst: true,
  },
  {
    title: "System User Registration",
    paragraphs: [
      "This platform ensures that only authorized individuals gain access, preventing gate-crashers or unauthorized personnel from entering. Every ticket issued is backed by secure, encrypted data, making fraudulent duplication virtually impossible.",
      "Our robust validation system empowers your on-ground crew to instantly verify attendees, streamline entry points, and eliminate security bottlenecks. Protect your event's revenue, ensure guest safety, and maintain complete control over your guest list with absolute confidence.",
    ],
    image: "/images/features/Features_4.webp",
    imageAlt: "System User Registration – account creation form with QR code scans",
    textFirst: false,
  },
];

/* ───────────── component ───────────── */
export default function FeaturesPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      /* hero title fade-in */
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
          }
        );
      }

      /* each feature block stagger */
      blocksRef.current.forEach((block) => {
        if (!block) return;

        const textCol = block.querySelector(".feat-text");
        const imgCol = block.querySelector(".feat-img");

        if (textCol) {
          gsap.fromTo(
            textCol,
            { opacity: 0, x: -40 },
            {
              opacity: 1,
              x: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: block, start: "top 78%" },
            }
          );
        }

        if (imgCol) {
          gsap.fromTo(
            imgCol,
            { opacity: 0, x: 40 },
            {
              opacity: 1,
              x: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: block, start: "top 78%" },
            }
          );
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-white">
        <TopBanner />
        <Navbar />

        <main className="flex-1">
          {/* ─── Hero Title ─── */}
          <section className="pt-12 pb-6 lg:pt-20 lg:pb-10">
            <div
              ref={heroRef}
              className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 text-center"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-medium tracking-tight leading-[1.15] font-[family-name:var(--font-space-grotesk)] text-[#0D0D0D]">
                Why choose LGPSM for your events?
              </h1>
            </div>
          </section>

          {/* ─── Feature Blocks ─── */}
          {featureBlocks.map((feat, idx) => (
            <section
              key={idx}
              ref={(el) => {
                blocksRef.current[idx] = el;
              }}
              className="py-12 lg:py-20"
            >
              <div
                className={`max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${
                  feat.textFirst
                    ? "lg:flex-row"
                    : "lg:flex-row-reverse"
                } items-center gap-10 lg:gap-16`}
              >
                {/* ── Text Column ── */}
                <div className="feat-text w-full lg:w-[45%] space-y-5">
                  <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-medium tracking-tight leading-tight font-[family-name:var(--font-space-grotesk)] text-[#0D0D0D]">
                    {feat.title}
                  </h2>

                  {feat.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-sm sm:text-[15px] text-gray-500 leading-relaxed font-[family-name:var(--font-space-grotesk)]"
                    >
                      {p}
                    </p>
                  ))}

                  {feat.bullets && feat.bullets.length > 0 && (
                    <ul className="space-y-3 pt-1">
                      {feat.bullets.map((b, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2.5 text-sm sm:text-[15px] text-gray-500 leading-relaxed font-[family-name:var(--font-space-grotesk)]"
                        >
                          {/* orange bullet dot */}
                          <span className="mt-[7px] w-2 h-2 rounded-full bg-[#FF5B22] shrink-0" />
                          <span>
                            <span className="font-semibold text-[#0D0D0D]">
                              {b.label}
                            </span>{" "}
                            {b.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ── Image Column ── */}
                <div className="feat-img w-full lg:w-[55%] flex justify-center">
                  <div className="relative w-full max-w-[560px]">
                    <Image
                      src={feat.image}
                      alt={feat.imageAlt}
                      width={560}
                      height={420}
                      className="w-full h-auto object-contain"
                      priority={idx === 0}
                    />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
