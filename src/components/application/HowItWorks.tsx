"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stepsData } from "./stepsData";

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header entrance animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headerRef.current,
              start: "top 85%",
            },
          }
        );
      }

      // Left column text content entrance
      if (textRef.current) {
        gsap.fromTo(
          textRef.current,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            delay: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: textRef.current,
              start: "top 85%",
            },
          }
        );
      }

      // Right column mockup card entrance
      if (mockupRef.current) {
        gsap.fromTo(
          mockupRef.current,
          { opacity: 0, scale: 0.92, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            delay: 0.35,
            ease: "power3.out",
            scrollTrigger: {
              trigger: mockupRef.current,
              start: "top 85%",
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Smooth fade-in effect when switching active step
  const handleStepChange = (idx: number) => {
    if (idx === activeStep) return;
    if (textRef.current) {
      gsap.to(textRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        onComplete: () => {
          setActiveStep(idx);
          gsap.to(textRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
          });
        },
      });
    } else {
      setActiveStep(idx);
    }
  };

  return (
    <section ref={containerRef} className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16 lg:py-24 font-[family-name:var(--font-space-grotesk)]">
      {/* Header Badge & Title */}
      <div ref={headerRef} className="text-center mb-14 lg:mb-18">
        <div className="inline-flex items-center gap-2 mb-3">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF5B22]">
            APPLICATION
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
          How LGPSM Works
        </h2>
      </div>

      {/* 2-Column Interactive Step Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left Column: Title & Current Step Description */}
        <div ref={textRef} className="lg:col-span-6 space-y-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stepsData[activeStep].titleLine1}
            </h3>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stepsData[activeStep].titleLine2}
            </h3>
          </div>

          <div className="pt-4">
            <h4 className="text-base sm:text-lg font-semibold text-white mb-3">
              {stepsData[activeStep].step}
            </h4>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
              {stepsData[activeStep].desc}
            </p>
          </div>
        </div>

        {/* Right Column: Mockup Card + Vertical Slider Indicator */}
        <div ref={mockupRef} className="lg:col-span-6 flex items-center gap-6 sm:gap-8">
          <div className="flex-1 relative rounded-2xl p-2 sm:p-3 bg-gradient-to-r from-[#FF7338] via-[#FF5B22] to-[#FF8546] shadow-2xl overflow-hidden">
            <div className="relative rounded-md overflow-hidden bg-gray-900 aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center group cursor-pointer">
              <Image
                src="/images/auth/Auth.webp"
                alt="LGPSM Step Preview"
                fill
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-cover object-center opacity-90 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-2xl flex items-center justify-center text-gray-900 transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Vertical Step Number Indicator */}
          <nav aria-label="How It Works steps" className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-white" aria-hidden="true">01</span>
            <div className="w-[2px] h-28 bg-gray-800 relative rounded-full overflow-hidden flex flex-col justify-between">
              {stepsData.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStepChange(idx)}
                  aria-label={`Go to step ${idx + 1}: ${step.step}`}
                  aria-current={activeStep === idx ? "true" : undefined}
                  className={`w-full h-5 transition-colors cursor-pointer ${activeStep === idx ? "bg-white" : "bg-transparent hover:bg-gray-600"
                    }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-500" aria-hidden="true">05</span>
          </nav>
        </div>
      </div>
    </section>
  );
}

