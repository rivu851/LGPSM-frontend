"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "LGPSM completely simplified our event invitation process. Creating digital invites, sending them instantly, and tracking RSVPs in one dashboard saved us a lot of time. It's a modern solution that works perfectly for both personal and corporate events.",
    author: "Rahul Mehta",
    role: "Corporate Event Manager",
  },
  {
    quote:
      "Managing guest lists for large weddings used to be a nightmare until we found LGPSM. The instant QR code scanner at entry made event day seamless for our guests.",
    author: "Ananya Sharma",
    role: "Wedding Planner",
  },
  {
    quote:
      "Real-time RSVP analytics helped us plan seating and catering without any guesswork. LGPSM is an absolute game changer for corporate tech summits.",
    author: "Vikram Patel",
    role: "Tech Conference Organizer",
  },
  {
    quote:
      "The customizable invitation templates allowed us to match our party's theme effortlessly. Highly recommended for anyone hosting special occasions.",
    author: "Priya Nair",
    role: "Special Events Host",
  },
  {
    quote:
      "Instant sharing via WhatsApp and SMS boosted our event attendance rate by over 40%. The platform is fast, reliable, and extremely intuitive.",
    author: "Rohan Verma",
    role: "Marketing Director",
  },
];

export default function TestimonialsSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

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

      if (sectionRef.current) {
        gsap.fromTo(
          sectionRef.current,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 80%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSlideChange = (newIdx: number) => {
    if (newIdx === activeIdx) return;
    if (quoteRef.current) {
      gsap.to(quoteRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.25,
        onComplete: () => {
          setActiveIdx(newIdx);
          gsap.fromTo(
            quoteRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
          );
        },
      });
    } else {
      setActiveIdx(newIdx);
    }
  };

  const current = testimonials[activeIdx];

  return (
    <section ref={sectionRef} className="py-20 lg:py-28 bg-white">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="space-y-4 mb-14">
          {/* TESTIMONIALS Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#dd5c1b]">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="#dd5c1b" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="#dd5c1b" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="#dd5c1b" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="#dd5c1b" />
            </svg>
            <span>TESTIMONIALS</span>
          </div>

          {/* Title */}
          <h2 ref={titleRef} className="text-3xl sm:text-4xl lg:text-[46px] font-medium tracking-tight leading-[1.15] font-[family-name:var(--font-space-grotesk)]">
            <span className="text-[#0D0D0D]">Here's what our customers</span>
            <br />
            <span className="text-gray-600 font-normal">have to say about us</span>
          </h2>
        </div>

        {/* Testimonial Quote Container */}
        <div ref={quoteRef} className="max-w-3xl mx-auto min-h-[140px] flex flex-col justify-center">
          <p className="text-base sm:text-lg lg:text-xl font-medium text-gray-800 leading-relaxed font-[family-name:var(--font-space-grotesk)]">
            "{current.quote}"
          </p>

          {/* Orange Accent Line above Author */}
          <div className="w-8 h-[2px] bg-[#FF5B22] mx-auto mt-8 mb-2" />

          {/* Author Name and Role */}
          <p className="text-xs sm:text-sm font-bold text-gray-700 font-[family-name:var(--font-space-grotesk)]">
            {current.author} – <span className="font-normal text-gray-500">{current.role}</span>
          </p>
        </div>

        {/* Carousel Indicator Dots */}
        <div className="flex items-center justify-center gap-2.5 mt-10">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleSlideChange(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                activeIdx === idx
                  ? "w-3 h-3 bg-[#FF5B22] scale-110"
                  : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

