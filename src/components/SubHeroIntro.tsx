"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SubHeroIntro() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const arrowContainerRef = useRef<HTMLDivElement>(null);
  const arrowPathRef = useRef<SVGPathElement>(null);
  const arrowTipRef = useRef<SVGPathElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Heading & Paragraph Scroll Reveal Animation
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
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
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            delay: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: descRef.current,
              start: "top 88%",
            },
          }
        );
      }
      // 1. SVG Arrow Path Drawing animation starts right when arrow enters viewport
      if (arrowPathRef.current && arrowContainerRef.current) {
        const length = arrowPathRef.current.getTotalLength();
        gsap.set(arrowPathRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(arrowPathRef.current, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: arrowContainerRef.current,
            start: "top 80%", // Starts exactly when arrow enters viewport
            end: "top 30%",   // Finishes drawing well before leaving viewport
            scrub: 1,        // Smooth 1s scrub speed
          },
        });
      }

      // 2. Arrowhead tip reveal scrubbed near end of tail draw
      if (arrowTipRef.current && arrowContainerRef.current) {
        gsap.fromTo(
          arrowTipRef.current,
          { opacity: 0, scale: 0.2 },
          {
            opacity: 1,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: arrowContainerRef.current,
              start: "top 45%",
              end: "top 30%",
              scrub: 0.5,
            },
          }
        );
      }

      // 3. Smooth scale reveal on Dashboard preview — GPU-promoted for 60fps scrub
      if (dashboardRef.current) {
        // Promote to compositing layer before the scrubbed animation begins
        gsap.set(dashboardRef.current, { force3D: true });
        gsap.fromTo(
          dashboardRef.current,
          { scale: 0.94, opacity: 0.75, y: 30 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: dashboardRef.current,
              start: "top 88%",
              end: "top 45%",
              scrub: 0.4,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pt-16 pb-12 bg-white text-center">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Title */}
        <h2 ref={titleRef} className="text-4xl sm:text-5xl lg:text-[52px] font-medium tracking-tight leading-[1.15] font-[family-name:var(--font-space-grotesk)]">
          <span className="text-[#0D0D0D]">Everything you need in</span>
          <br />
          <span className="text-gray-400 font-normal">a simple, intuitive design.</span>
        </h2>

        {/* Description */}
        <p ref={descRef} className="max-w-2xl mx-auto text-sm sm:text-base text-gray-500 font-normal leading-relaxed font-[family-name:var(--font-space-grotesk)]">
          LGPSM helps you create elegant digital invitations with QR codes, RSVP tracking, guest management, and instant sharing. Perfect for weddings, birthdays, corporate events, and special occasions.
        </p>

        {/* Book a Demo Button & Animated Spiralled Arrow SVG */}
        <div className="pt-2 flex flex-col items-center justify-center relative">
          <button className="px-6 py-2.5 bg-[#171D22] hover:bg-[#0F1418] text-white text-sm font-normal rounded-[10px] shadow-sm transition-all hover:scale-105 active:scale-95 font-sans tracking-wide cursor-pointer">
            Book a Demo
          </button>
          
          {/* Orange Spiralled Arrow SVG matching Figma design */}
          <div ref={arrowContainerRef} className="mt-0 text-[#FF5B22] flex justify-center z-10">
            <svg
              className="w-14 h-20 text-[#FF5B22]"
              viewBox="0 0 60 80"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Arching line with smooth spiral loop */}
              <path
                ref={arrowPathRef}
                d="M 38 2 C 24 4, 14 14, 14 26 C 14 36, 26 34, 24 24 C 22 16, 12 20, 11 30 C 10 42, 13 56, 14 66"
              />
              {/* Arrowhead */}
              <path ref={arrowTipRef} d="M 8 58 L 14 67 L 20 58" />
            </svg>
          </div>
        </div>

        {/* Dashboard Preview Image */}
        <div ref={dashboardRef} className="pt-2 max-w-[900px] mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100 transition-shadow hover:shadow-xl">
            <Image
              src="/images/home/mid_hero.webp"
              alt="LGPSM Interactive App Dashboard Preview"
              width={1200}
              height={700}
              loading="eager"
              sizes="(max-width: 768px) 100vw, 900px"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  );
}

