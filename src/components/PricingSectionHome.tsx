"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function PricingSectionHome() {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      if (containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 40, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Rounded Card Container with last_page.png as CSS Background */}
        <div
          ref={containerRef}
          className="relative rounded-[32px] overflow-hidden shadow-2xl p-8 sm:p-12 lg:p-16 text-center text-white"
          style={{
            backgroundImage: "url('/images/home/last_hero.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none z-0" />

          <div className="relative z-10 max-w-5xl mx-auto">
            
            {/* Header: PRICING badge & Title */}
            <div className="text-center mb-10 space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
                  <rect x="9" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
                  <rect x="2" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
                  <rect x="9" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
                </svg>
                <span>PRICING</span>
              </div>

              <h2 ref={titleRef} className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight font-[family-name:var(--font-space-grotesk)]">
                Our Pricing
              </h2>
            </div>

            {/* Dual Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch text-left">
              
              {/* Card 1: Main Pricing Offer Card (White) */}
              <div className="lg:col-span-7 bg-white text-gray-900 rounded-md p-6 sm:p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                    
                    {/* Left Column: Pricing Tag */}
                    <div className="sm:col-span-6 space-y-1.5 border-b sm:border-b-0 sm:border-r border-gray-100 pb-5 sm:pb-0 sm:pr-6">
                      <span className="text-sm font-bold text-gray-800 font-[family-name:var(--font-space-grotesk)]">
                        Starting from just
                      </span>
                      
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-gray-900 tracking-tight font-[family-name:var(--font-space-grotesk)]">
                          ₹11.99
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          / each Invitations
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 font-medium leading-relaxed pt-1">
                        Register now and receive 20 free guest registrations.
                      </p>
                    </div>

                    {/* Right Column: Feature Checklist */}
                    <div className="sm:col-span-6 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-700 leading-snug">
                          Register now and create your first event.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-700 leading-snug">
                          Invite your guests in a smarter way.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-700 leading-snug">
                          Real time analytics for planning ahead.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Sign Up Free CTA Button */}
                <div className="mt-6">
                  <a
                    href="#signup"
                    className="block w-full text-center py-3 px-6 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs sm:text-sm rounded-md shadow-md transition-colors font-[family-name:var(--font-space-grotesk)] cursor-pointer"
                  >
                    Sign Up Free
                  </a>
                </div>
              </div>

              {/* Card 2: Contact Us Card (Dark Card Background) */}
              <div id="contact" className="lg:col-span-5 bg-[#1C2228] text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col justify-between border border-gray-800/60">
                <div>
                  {/* Address Book Icon */}
                  <div className="mb-4">
                    <svg className="w-8 h-8 text-[#FF5B22]" viewBox="0 0 32 32" fill="none">
                      <rect x="9" y="4" width="18" height="24" rx="4" stroke="#FF5B22" strokeWidth="2.2" />
                      <path d="M6 9h4M6 16h4M6 23h4" stroke="#FF5B22" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="18" cy="12" r="3.5" stroke="#FF5B22" strokeWidth="2" />
                      <path d="M13 22a5 5 0 0110 0" stroke="#FF5B22" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 font-[family-name:var(--font-space-grotesk)]">
                    Contact Us
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed font-[family-name:var(--font-space-grotesk)]">
                    If you are considering a high-volume purchase and need more details, we would be happy to assist you.
                  </p>
                </div>

                {/* Contact Us Button */}
                <div className="mt-6">
                  <button
                    onClick={() => setContactSubmitted(true)}
                    className="w-full py-3 px-6 bg-white hover:bg-gray-100 text-[#FF5B22] font-bold text-xs sm:text-sm rounded-md transition-colors shadow-md font-[family-name:var(--font-space-grotesk)] cursor-pointer"
                  >
                    {contactSubmitted ? "Message Sent!" : "Contact Us"}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
