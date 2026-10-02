"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is LGPSM?",
    answer:
      "LGPSM is a digital invitation platform that allows you to create QR-based event invitations and manage guests online.",
  },
  {
    question: "Do guests need an account?",
    answer:
      "No, guests do not need to create an account to view invitations or submit RSVPs. Everything works directly through their unique QR link.",
  },
  {
    question: "Can I track RSVPs?",
    answer:
      "Yes! You can track real-time attendance, guest responses, and RSVP confirmations directly from your LGPSM event dashboard.",
  },
  {
    question: "Can I customize my invitation?",
    answer:
      "Absolutely. You can customize colors, fonts, layouts, event details, and branding templates to suit any occasion.",
  },
  {
    question: "Is LGPSM mobile friendly?",
    answer:
      "Yes, LGPSM is fully responsive and optimized for mobile devices, tablets, and desktop browsers.",
  },
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const faqListRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

      if (faqListRef.current) {
        gsap.fromTo(
          faqListRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: faqListRef.current,
              start: "top 80%",
            },
          }
        );
      }

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, scale: 0.95, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: cardRef.current,
              start: "top 85%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenIdx(openIdx === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-white border-t border-gray-100">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">

          {/* Left Column: Badge, Title & Accordions */}
          <div className="lg:col-span-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C44200] mb-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
              </svg>
              <span>TESTIMONIALS</span>
            </div>

            {/* Main Title */}
            <h2 ref={titleRef} className="text-3xl sm:text-4xl lg:text-[44px] font-medium text-[#0D0D0D] tracking-tight mb-8 font-[family-name:var(--font-space-grotesk)]">
              Have Questions?
            </h2>

            {/* FAQ Accordion List */}
            <div ref={faqListRef} className="divide-y divide-gray-100 border-t border-gray-100">
              {faqs.map((faq, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer"
                    >
                      <span className="text-base sm:text-lg font-bold text-[#0D0D0D] tracking-tight font-[family-name:var(--font-space-grotesk)] group-hover:text-[#FF5B22] transition-colors">
                        {faq.question}
                      </span>
                      <span className="text-xl font-normal text-gray-400 ml-4 shrink-0 font-mono transition-transform duration-200">
                        {isOpen ? "×" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xl font-[family-name:var(--font-space-grotesk)] animate-fadeIn">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Contact Us Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end lg:pt-10">
            <div ref={cardRef} className="bg-[#F7F8FA] rounded-md p-7 sm:p-8 border border-gray-100/80 shadow-sm w-full max-w-sm text-left">
              {/* Icon */}
              <div className="mb-5">
                <svg className="w-9 h-9 text-[#FF5B22]" viewBox="0 0 32 32" fill="none">
                  <rect x="9" y="4" width="18" height="24" rx="4" stroke="#FF5B22" strokeWidth="2.2" />
                  <path d="M6 9h4M6 16h4M6 23h4" stroke="#FF5B22" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="18" cy="12" r="3.5" stroke="#FF5B22" strokeWidth="2" />
                  <path d="M13 22a5 5 0 0110 0" stroke="#FF5B22" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-space-grotesk)]">
                Contact Us
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed mb-6 font-[family-name:var(--font-space-grotesk)]">
                If you are considering a high-volume purchase and need more details, we would be happy to assist you.
              </p>

              {/* Contact Button */}
              <a
                href="#contact"
                className="inline-block py-2.5 px-6 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-md transition-all hover:scale-105 shadow-sm font-[family-name:var(--font-space-grotesk)]"
              >
                Contact Us
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}


