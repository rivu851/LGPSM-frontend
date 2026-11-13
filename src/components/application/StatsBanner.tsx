"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function StatsBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const statsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Heading Fade & Slide Up Animation
      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current.children,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 85%",
            },
          }
        );
      }

      // 2. 2x2 Stat Cards Staggered Entrance Animation
      if (statsGridRef.current) {
        gsap.fromTo(
          statsGridRef.current.children,
          { opacity: 0, y: 30, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.12,
            ease: "back.out(1.2)",
            scrollTrigger: {
              trigger: statsGridRef.current,
              start: "top 85%",
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16 lg:py-20 font-[family-name:var(--font-space-grotesk)]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Headings & Subtitle */}
        <div ref={headingRef} className="lg:col-span-6 flex flex-col justify-between h-full">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Gain unlimited
            </h2>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-500 leading-tight">
              hours per month
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-12 sm:mt-16">
            Trusted by thousands of event planners and families.
          </p>
        </div>

        {/* Right Side: 2x2 Grid of Stat Boxes */}
        <div className="lg:col-span-6">
          <div
            ref={statsGridRef}
            className="grid grid-cols-2 border border-gray-600 divide-x divide-y divide-gray-600 overflow-hidden"
          >
            <div className="p-6 sm:p-8 flex flex-col justify-between min-h-[140px]">
              <span className="text-xs text-gray-500 font-medium">Invitations Created</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
                100K+
              </span>
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between min-h-[140px]">
              <span className="text-xs text-gray-500 font-medium">Events Managed</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
                25K+
              </span>
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between min-h-[140px]">
              <span className="text-xs text-gray-500 font-medium">Guests Invited</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
                1M+
              </span>
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between min-h-[140px]">
              <span className="text-xs text-gray-500 font-medium">RSVP Responses Collected</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
                500K+
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
