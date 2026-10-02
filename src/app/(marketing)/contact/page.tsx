"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import TopBanner from "@/components/TopBanner";
import Navbar from "@/app/navbar/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";

export default function ContactPage() {
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftBoxRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (leftBoxRef.current) {
        gsap.fromTo(
          leftBoxRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
      }
      if (formCardRef.current) {
        gsap.fromTo(
          formCardRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.15, ease: "power3.out" }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setDescription("");
      setSubmitted(false);
    }, 3000);
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-white">
        <TopBanner />
        <Navbar />

        {/* ── Main Contact Hero Section ── */}
        <main className="flex-1 bg-white pt-12 pb-24 overflow-visible relative">
          <div
            ref={containerRef}
            className="max-w-[1140px] mx-auto px-4 sm:px-6 relative flex flex-col md:flex-row items-start justify-center"
          >
            {/* ── Left Box: Light Gray Card with Fine High-Density White Rays & Small Circle Hub ── */}
            <div
              ref={leftBoxRef}
              className="w-full md:w-[540px] h-[360px] sm:h-[400px] bg-[#F4F6F8] rounded-[18px] overflow-hidden relative shrink-0"
            >
              {/* High-density Sunburst SVG */}
              <svg
                className="w-full h-full object-cover select-none pointer-events-none"
                viewBox="0 0 540 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background base */}
                <rect width="540" height="400" fill="#F4F6F8" />

                {/* 22 Fine White Radiating Rays (44 total alternating segments) */}
                {Array.from({ length: 44 }).map((_, i) => {
                  if (i % 2 !== 0) return null;
                  const angleStep = 360 / 66; // ~8.18 deg
                  const centerAngle = 180 + (i / 2) * (360 / 22);
                  const startAngle = centerAngle - angleStep / 2;
                  const endAngle = centerAngle + angleStep / 2;
                  const rad1 = (startAngle * Math.PI) / 180;
                  const rad2 = (endAngle * Math.PI) / 180;
                  const dist = 1000;
                  const cx = 400;
                  const cy = 200;
                  const x1 = cx + dist * Math.cos(rad1);
                  const y1 = cy + dist * Math.sin(rad1);
                  const x2 = cx + dist * Math.cos(rad2);
                  const y2 = cy + dist * Math.sin(rad2);
                  return (
                    <polygon
                      key={i}
                      points={`${cx},${cy} ${x1.toFixed(4)},${y1.toFixed(4)} ${x2.toFixed(4)},${y2.toFixed(4)}`}
                      fill="#FFFFFF"
                    />
                  );
                })}

              </svg>
            </div>

            {/* ── Right Form Card: Sharp Rectangular Card with Thin Border ── */}
            <div
              ref={formCardRef}
              className="w-full md:w-[680px] bg-transparent border border-[#AAAAAA] shadow-sm p-8 sm:p-10 relative z-20 mt-[-40px] md:mt-72 md:-mb-24 md:-ml-6 shrink-0 rounded-none"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <textarea
                  rows={4}
                  placeholder="Describe here"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-[#EBEBEB] text-gray-800 placeholder:text-gray-500 text-sm border-none focus:outline-none focus:bg-[#E5E5E5] transition-all resize-none font-[family-name:var(--font-space-grotesk)] rounded-none"
                  required
                />

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#dd5c1b] hover:bg-[#A83800] text-white text-sm sm:text-base font-bold transition-all shadow-none active:scale-[0.99] font-[family-name:var(--font-space-grotesk)] cursor-pointer rounded-md"
                >
                  {submitted ? "Submitted Successfully!" : "Submit"}
                </button>
              </form>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
