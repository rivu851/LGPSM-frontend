"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
        );
      }

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out", delay: 0.1 }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Signing up with: ${email}`);
    setEmail("");
  };

  return (
    <section id="home" className="w-full pt-4 pb-12 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Responsive Grid Hero Container */}
        <div 
          ref={heroRef}
          className="relative w-full rounded-[15px] overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[420px] sm:min-h-[520px] lg:min-h-[620px] items-center"
        >
          <Image
            src="/images/home/top_hero.webp"
            alt="Digital Invitations Hero"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 1240px"
            className="object-cover object-left lg:object-center -z-0"
          />
          
          {/* Left Side: Clean HTML Text, Subtitle & Interactive Form Overlay */}
          <div ref={contentRef} className="lg:col-span-6 z-10 p-8 sm:p-12 lg:p-16 space-y-6 sm:space-y-8 bg-transparent">
            
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-medium text-[#0D0D0D] tracking-tight leading-[1.12] font-[family-name:var(--font-space-grotesk)]">
              Digital Invitations for Today’s Events
            </h1>

            {/* Subtitle / Paragraph */}
            <p className="text-sm sm:text-base lg:text-lg text-[#1A1A1A] font-medium leading-relaxed max-w-md font-[family-name:var(--font-space-grotesk)]">
              Design, customize, and share stunning QR-based invitations for events and celebrations all in one simple platform.
            </p>

            {/* Email Label + Form Bar & Button */}
            <form onSubmit={handleSubmit} className="space-y-2 pt-2 max-w-md">
              <label className="block text-xs font-semibold text-[#1A1A1A] font-[family-name:var(--font-space-grotesk)]">
                Email Address
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5B22] text-sm border border-gray-200/60 shadow-sm font-[family-name:var(--font-space-grotesk)]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#dd5c1b] hover:bg-[#A83800] text-white font-bold text-sm rounded-md shadow-md transition-all hover:scale-105 active:scale-95 whitespace-nowrap font-[family-name:var(--font-space-grotesk)] cursor-pointer"
                >
                  Sign Up Free
                </button>
              </div>
            </form>

          </div>

          {/* Right Side: Background space */}
          <div className="hidden lg:block lg:col-span-6"></div>

        </div>

      </div>
    </section>
  );
}

