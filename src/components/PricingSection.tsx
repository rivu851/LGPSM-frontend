"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"yearly" | "monthly">("yearly");
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const arrowPathRef = useRef<SVGPathElement>(null);
  const arrowHeadRef = useRef<SVGPathElement>(null);
  const handwrittenTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Header text reveal
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

      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: subtitleRef.current,
              start: "top 88%",
            },
          }
        );
      }

      // Feature badges stagger
      if (badgesRef.current) {
        gsap.fromTo(
          badgesRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: badgesRef.current,
              start: "top 90%",
            },
          }
        );
      }

      // Handwritten Callout & SVG Arrow Animation
      if (arrowPathRef.current && arrowHeadRef.current && handwrittenTextRef.current) {
        const pathLen = arrowPathRef.current.getTotalLength();
        const headLen = arrowHeadRef.current.getTotalLength();

        gsap.set(arrowPathRef.current, {
          strokeDasharray: pathLen,
          strokeDashoffset: pathLen,
        });
        gsap.set(arrowHeadRef.current, {
          strokeDasharray: headLen,
          strokeDashoffset: headLen,
        });

        const arrowTl = gsap.timeline({
          scrollTrigger: {
            trigger: toggleRef.current,
            start: "top 85%",
          },
        });

        // 1. Text reveals smoothly as if handwritten from left to right
        arrowTl
          .fromTo(
            handwrittenTextRef.current,
            {
              clipPath: "polygon(0 -20%, 0 -20%, 0 120%, 0 120%)",
              opacity: 0,
              scale: 0.88,
              rotate: -16,
            },
            {
              clipPath: "polygon(-10% -20%, 125% -20%, 125% 120%, -10% 120%)",
              opacity: 1,
              scale: 1,
              rotate: -12,
              duration: 2.0,
              ease: "sine.inOut",
              onComplete: () => {
                if (handwrittenTextRef.current) {
                  handwrittenTextRef.current.style.clipPath = "none";
                }
              },
            }
          )
          // 2. SVG arrow curve draws smoothly
          .to(
            arrowPathRef.current,
            {
              strokeDashoffset: 0,
              duration: 1.8,
              ease: "power2.inOut",
            },
            "-=1.2"
          )
          // 3. Arrowhead tip draws into place
          .to(
            arrowHeadRef.current,
            {
              strokeDashoffset: 0,
              duration: 0.6,
              ease: "power2.out",
            },
            "-=0.2"
          )
          // 4. Subtle continuous floating motion
          .to(handwrittenTextRef.current, {
            y: -3,
            rotate: -10,
            duration: 2.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
      }

      // Toggle & Cards entrance
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { opacity: 0, y: 45 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 80%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="py-20 lg:py-28 bg-white font-[family-name:var(--font-space-grotesk)]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-[50px] font-semibold text-[#1C2228] tracking-tight leading-[1.15]"
          >
            Transparent Pricing for Flawless Events
          </h2>
          <p
            ref={subtitleRef}
            className="text-sm sm:text-base text-gray-500 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Choose the perfect plan to streamline your invitations, secure your entry points, and manage your attendees effortlessly.
          </p>
        </div>

        {/* 3 Top Value Badges */}
        <div
          ref={badgesRef}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-14 text-xs sm:text-sm font-semibold text-[#1C2228]"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#FF7338]/20 text-[#FF5B22] flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </span>
            <span>Free 15-day trial</span>
          </div>
          
          <div className="w-[1px] h-4 bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#FF7338]/20 text-[#FF5B22] flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </span>
            <span>Unlimited Team Members</span>
          </div>

          <div className="w-[1px] h-4 bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#FF7338]/20 text-[#FF5B22] flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </span>
            <span>Cancel Anytime</span>
          </div>
        </div>

        {/* Billing Cycle Toggle + "get 3 months free" Cursive Callout with Slanted SVG Arrow */}
        <div ref={toggleRef} className="flex justify-center mb-16 relative">
          <div className="relative inline-flex items-center gap-4">
            
            {/* Cursive Callout + Curved SVG Arrow */}
            <div className="absolute -top-14 -left-12 sm:-left-16 flex flex-col items-start pointer-events-none z-10">
              <span
                ref={handwrittenTextRef}
                className="font-[family-name:var(--font-caveat)] text-2xl sm:text-[28px] text-[#1C2228] font-bold -rotate-12 -ml-18 mt-4 whitespace-nowrap tracking-wide leading-none mb-1 inline-block pr-4"
              >
                get 3 months free
              </span>
              
              {/* Curved SVG arrow starting from above "Billed Yearly", looping/arching upward to point to the text */}
              <svg className="w-14 h-11 text-[#FF5B22] ml-3 -mt-3.5 overflow-visible" viewBox="0 0 55 40" fill="none">
                {/* Looped curve arching up-left */}
                <path
                  ref={arrowPathRef}
                  d="M 44 32 C 34 34, 22 30, 20 22 C 18 14, 28 16, 26 24 C 24 30, 16 26, 12 14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Arrowhead pointing up-left towards cursive text */}
                <path
                  ref={arrowHeadRef}
                  d="M 6 18 L 11 11 L 18 16"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Billed Yearly Label */}
            <span
              onClick={() => setBillingCycle("yearly")}
              className={`text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                billingCycle === "yearly" ? "text-[#1C2228]" : "text-gray-500"
              }`}
            >
              Billed Yearly
            </span>

            {/* Switch Toggle Pill */}
            <button
              onClick={() => setBillingCycle(billingCycle === "yearly" ? "monthly" : "yearly")}
              aria-label="Toggle billing cycle"
              className="w-12 h-6 bg-gray-200 rounded-full p-0.5 transition-colors relative focus:outline-none cursor-pointer"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  billingCycle === "monthly" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>

            {/* Billed Monthly Label */}
            <span
              onClick={() => setBillingCycle("monthly")}
              className={`text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                billingCycle === "monthly" ? "text-[#1C2228]" : "text-gray-500"
              }`}
            >
              Billed Monthly
            </span>
          </div>
        </div>

        {/* 3 Pricing Cards Grid (Exact PDF Design with 0px roundedness on middle dark card) */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* 1. Standard Plan Card */}
          <div className="bg-white border border-gray-200 rounded-none p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-xl font-bold text-[#1C2228] mb-2">Standard Plan</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl lg:text-[44px] font-extrabold text-[#1C2228] tracking-tight">
                  ₹1,999
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-8">Up to 250 Attendees per month</p>

              {/* CTA Button */}
              <button className="w-full py-3 px-4 border border-[#C44200] text-[#C44200] hover:bg-[#C44200] hover:text-white font-bold text-xs rounded-none transition-all cursor-pointer mb-8">
                Start My 15-day Trial
              </button>

              {/* Divider */}
              <div className="w-full h-[1px] bg-gray-100 mb-6" />

              {/* Feature List */}
              <ul className="space-y-4 text-xs text-gray-500 font-normal leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Up to 250 Smart QR Invitations sent via Email/WhatsApp</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Secured Access Control: Basic dynamic QR generation to prevent duplicate entries</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Single-Session Check-in: One main gate scanning entry</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Essential Order/Attendee Info: Basic RSVP tracking and real-time dashboard</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Self-Serve Setup: Easy-to-use template builder for invitations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Standard Support: Email support within 24 hours</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 2. Professional Plan Card (Dark Slate Background, Most Popular Badge, Sharp 0px corners) */}
          <div className="bg-[#262B35] text-white rounded-none p-8 flex flex-col justify-between shadow-2xl relative border border-gray-800">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Professional Plan</h3>
              
              {/* Most Popular Badge */}
              <div className="inline-block bg-[#C44200] text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-none mb-3 tracking-wider">
                Most Popular
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl lg:text-[44px] font-extrabold text-white tracking-tight">
                  ₹3,999
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mb-8">Up to 1,500 Attendees per month</p>

              {/* CTA Button */}
              <button className="w-full py-3 px-4 bg-[#C44200] hover:bg-[#A83800] text-white font-bold text-xs rounded-none transition-all cursor-pointer shadow-md mb-8">
                Start My 15-day Trial
              </button>

              {/* Divider */}
              <div className="w-full h-[1px] bg-gray-700/60 mb-6" />

              {/* Feature List */}
              <ul className="space-y-4 text-xs text-gray-300 font-normal leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Up to 1,500 Smart QR Invitations sent via Email/WhatsApp</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Session-Wise Control: Manage separate entry permissions for up to 5 individual tracks or segments (e.g., Breakfast, Lunch, Dinner, Gaming Zones, VIP Lounges)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Custom Branding: Remove platform watermarks and use your company's brand identity, logos, and custom colors</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Multi-Device Syncing: Allow up to 5 ground-crew members to scan and sync check-ins simultaneously in real-time</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 3. Enterprise Plan Card */}
          <div className="bg-white border border-gray-200 rounded-none p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-xl font-bold text-[#1C2228] mb-2">Enterprise Plan</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl lg:text-[44px] font-extrabold text-[#1C2228] tracking-tight">
                  ₹5,999
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-8">
                1,500+ Attendees &amp; High-Volume Agencies
              </p>

              {/* CTA Button */}
              <button className="w-full py-3 px-4 border border-[#C44200] text-[#C44200] hover:bg-[#C44200] hover:text-white font-bold text-xs rounded-none transition-all cursor-pointer mb-8">
                Start My 15-day Trial
              </button>

              {/* Divider */}
              <div className="w-full h-[1px] bg-gray-100 mb-6" />

              {/* Feature List */}
              <ul className="space-y-4 text-xs text-gray-500 font-normal leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Unlimited Smart QR Invitations & Attendee Capacity</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Unlimited Session-Wise Tracking: Complete granular control across endless breakout rooms, sub-events, and VIP segments</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Dedicated Account Manager & On-Ground Support: Remote or physical standby support to ensure zero entry bottlenecks on event day</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B22] shrink-0 mt-1.5" />
                  <span>Advanced API & CRM Integrations: Seamlessly sync attendee data with HubSpot, Salesforce, or your existing marketing stacks</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
