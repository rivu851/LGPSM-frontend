"use client";

import { limitPhone } from "@/utils/phoneInput";
import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import TopBanner from "@/components/TopBanner";
import Navbar from "@/app/navbar/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { contactService } from "@/services/contactService";
import {
  EMPTY_CONTACT_FORM,
  MESSAGE_MAX_LENGTH,
  hasErrors,
  validateContactForm,
  type ContactField,
  type ContactFieldErrors,
  type ContactFormValues,
} from "@/utils/contactForm";

const FIELD_ORDER: ContactField[] = ["name", "email", "phone", "message"];

const fieldClass =
  "w-full p-4 bg-[#EBEBEB] text-gray-800 placeholder:text-gray-500 text-sm border-none focus:outline-none focus:bg-[#E5E5E5] transition-all font-[family-name:var(--font-space-grotesk)] rounded-none";

export default function ContactPage() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT_FORM);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const setField = (field: keyof ContactFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field !== "website") setFieldErrors((prev) => (prev[field as ContactField] ? { ...prev, [field]: undefined } : prev));
    // A previous success/failure message no longer applies once the visitor edits the form
    setFeedback(null);
  };

  const focusFirstInvalid = (errors: ContactFieldErrors) => {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) document.getElementById(`contact-${first}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const errors = validateContactForm(values);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFeedback({ type: "error", message: "Please check the highlighted fields and try again." });
      focusFirstInvalid(errors);
      return;
    }

    setSending(true);
    setFeedback(null);
    const outcome = await contactService.submit(values);
    setSending(false);

    if (outcome.kind === "success") {
      // Only now — after the API confirmed the message was stored — is the form cleared
      setValues(EMPTY_CONTACT_FORM);
      setFieldErrors({});
      setFeedback({ type: "success", message: outcome.message });
      return;
    }

    // Every failure keeps what the visitor typed
    if (outcome.kind === "validation") {
      setFieldErrors(outcome.fieldErrors);
      focusFirstInvalid(outcome.fieldErrors);
    }
    setFeedback({ type: "error", message: outcome.message });
  };

  const errorId = (f: ContactField) => (fieldErrors[f] ? `contact-${f}-error` : undefined);

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-white">
        <TopBanner />
        <Navbar />

        {/* ── Main Contact Hero Section ── */}
        <main className="flex-1 bg-white pt-12 pb-24 overflow-visible relative">
          <h1 className="sr-only">Contact LGPSM</h1>
          <div
            ref={containerRef}
            className="max-w-[1140px] mx-auto px-4 sm:px-6 relative flex flex-col md:flex-row items-start justify-center"
          >
            {/* ── Left Box: Light Gray Card with Fine High-Density White Rays & Small Circle Hub ── */}
            <div
              ref={leftBoxRef}
              className="w-full md:flex-1 md:min-w-0 xl:flex-none xl:w-[540px] h-[360px] sm:h-[400px] bg-[#F4F6F8] rounded-[18px] overflow-hidden relative shrink-0"
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
              className="w-full md:flex-1 md:min-w-0 xl:flex-none xl:w-[680px] bg-transparent border border-[#AAAAAA] shadow-sm p-8 sm:p-10 relative z-20 mt-[-40px] md:mt-72 md:-mb-24 md:-ml-6 shrink-0 rounded-none"
            >
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="Your name"
                      aria-label="Your name"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={errorId("name")}
                      maxLength={100}
                      value={values.name}
                      onChange={(e) => setField("name", e.target.value)}
                      disabled={sending}
                      className={fieldClass}
                    />
                    {fieldErrors.name && <p id="contact-name-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="Email address"
                      aria-label="Email address"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={errorId("email")}
                      maxLength={254}
                      value={values.email}
                      onChange={(e) => setField("email", e.target.value)}
                      disabled={sending}
                      className={fieldClass}
                    />
                    {fieldErrors.email && <p id="contact-email-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <input
                    id="contact-phone"
                    type="tel"
                    maxLength={10}
                    name="phone"
                    autoComplete="tel"
                    placeholder="Phone number (optional)"
                    aria-label="Phone number (optional)"
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={errorId("phone")}
                                        value={values.phone}
                    onChange={(e) => setField("phone", limitPhone(e.target.value))}
                    disabled={sending}
                    className={fieldClass}
                  />
                  {fieldErrors.phone && <p id="contact-phone-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    placeholder="Describe here"
                    aria-label="Describe your enquiry"
                    aria-required="true"
                    aria-invalid={!!fieldErrors.message}
                    aria-describedby={errorId("message")}
                    maxLength={MESSAGE_MAX_LENGTH}
                    value={values.message}
                    onChange={(e) => setField("message", e.target.value)}
                    disabled={sending}
                    className={`${fieldClass} resize-none`}
                  />
                  {fieldErrors.message && <p id="contact-message-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.message}</p>}
                </div>

                {/* Honeypot for bots: invisible and unreachable for people and assistive tech */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={values.website}
                      onChange={(e) => setField("website", e.target.value)}
                    />
                  </label>
                </div>

                {feedback && (
                  <p
                    role={feedback.type === "error" ? "alert" : "status"}
                    className={`text-sm font-medium ${feedback.type === "error" ? "text-[#B3261E]" : "text-[#1a7f37]"}`}
                  >
                    {feedback.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-[#c65318] hover:bg-[#A83800] disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold transition-all shadow-none active:scale-[0.99] font-[family-name:var(--font-space-grotesk)] cursor-pointer rounded-md"
                >
                  {sending ? "Sending…" : "Submit"}
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
