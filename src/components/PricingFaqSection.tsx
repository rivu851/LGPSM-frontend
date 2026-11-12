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
    question: "Can we upgrade our plan if our attendee list grows unexpectedly?",
    answer:
      "Absolutely! You can upgrade your tier or purchase add-on attendee credits at any time leading up to your event date without losing any configuration.",
  },
  {
    question: "Do the QR codes work if the venue has poor internet connectivity?",
    answer:
      "Yes, our ground-crew scanner app supports offline check-in mode. Scanned QR entries are stored locally on the device and sync automatically once network connectivity is restored.",
  },
  {
    question: 'How does the "Session-Wise Control" work for catering/meals?',
    answer:
      "Session-Wise Control lets you issue sub-access permissions for specific event segments like Breakfast, Lunch, Dinner, or VIP Lounges. Scanning a guest's QR code validates their entry for that specific session in real-time.",
  },
  {
    question: "Can an attendee share their QR code invitation with a friend if they can’t make it?",
    answer:
      "No, each QR invitation features dynamic anti-duplicate security that invalidates duplicate entry attempts once scanned at the gate.",
  },
  {
    question: "Do attendees need to download an app to show their QR code at the gates?",
    answer:
      "No app download is required for guests. Attendees simply open their invitation via link, WhatsApp, or email directly on their smartphone browser or save it to Apple/Google Wallet.",
  },
];

export default function PricingFaqSection() {
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
          { opacity: 0, y: 30 },
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
          { opacity: 0, scale: 0.96, y: 30 },
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
    <section ref={sectionRef} className="py-20 lg:py-28 bg-white border-t border-gray-100 font-[family-name:var(--font-space-grotesk)]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: Title & Exact FAQ Questions */}
          <div className="lg:col-span-7">
            {/* Main Title */}
            <h2
              ref={titleRef}
              className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-[#1C2228] tracking-tight mb-8"
            >
              Have Questions?
            </h2>

            {/* FAQ Accordion List */}
            <div ref={faqListRef} className="divide-y divide-gray-200 border-t border-gray-200">
              {faqs.map((faq, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div key={idx} className="py-5">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-start justify-between text-left group cursor-pointer"
                    >
                      <span className="text-base sm:text-lg font-bold text-[#1C2228] tracking-tight group-hover:text-[#A83800] transition-colors pr-4 leading-snug">
                        {faq.question}
                      </span>
                      <span className="text-xl font-normal text-gray-500 shrink-0 font-mono mt-0.5">
                        {isOpen ? "×" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="mt-3 text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xl">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Exact 02-Pricing CONTACT US Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end lg:pt-4">
            <div
              ref={cardRef}
              className="bg-[#F7F8FA] rounded-2xl p-7 sm:p-8 border border-gray-100/80 shadow-sm w-full max-w-sm text-left"
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#1C2228] mb-3">
                CONTACT US
              </h3>

              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                If you are considering a high-volume purchase and need more details, we would be happy to assist you.
              </p>

              <div className="w-full h-[1px] bg-gray-200/80 mb-6" />

              {/* Email Block */}
              <div className="space-y-4 text-xs font-semibold">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-[#C44200] shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-normal block mb-0.5">Send Us Email</span>
                    <a href="mailto:enquiry@kolkataseowala.com" className="text-[#1C2228] hover:text-[#A83800] transition-colors">
                      enquiry@kolkataseowala.com
                    </a>
                  </div>
                </div>

                {/* Phone Block */}
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-5 h-5 text-[#C44200] shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-normal block mb-0.5">Contact no</span>
                    <a href="tel:+918017063365" className="text-[#1C2228] hover:text-[#A83800] transition-colors">
                      +91-8017063365
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
