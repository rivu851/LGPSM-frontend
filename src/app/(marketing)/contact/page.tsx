"use client";

import PhoneInput from "@/components/common/PhoneInput";
import PopupMessage from "@/components/common/PopupMessage";
import React, { useState } from "react";
import { useReveal } from "@/components/landing/useReveal";
import Navbar from "@/app/navbar/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { contactService } from "@/services/contactService";
import { CONTACT_ADDRESS, CONTACT_ENQUIRY_EMAIL, CONTACT_ENQUIRY_PHONE, CONTACT_WEBSITE } from "@/constants/site";
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
  "w-full h-12 px-4 rounded-xl border border-[#E1EAF8] bg-[#F6F8FF] text-[15px] text-[#000B2C] placeholder:text-[#8A94AD] focus:outline-none focus:border-[#1F65FF] focus:bg-white transition-colors disabled:opacity-60";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="size-5 shrink-0 text-[#1F65FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export default function ContactPage() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT_FORM);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [leftRef, left] = useReveal<HTMLDivElement>("left");
  const [formRef, formReveal] = useReveal<HTMLDivElement>("right", 120);

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

  const INFO = [
    { label: "Corporate Office:", value: CONTACT_ADDRESS, icon: <Icon><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Icon> },
    { label: "Email:", value: CONTACT_ENQUIRY_EMAIL, href: `mailto:${CONTACT_ENQUIRY_EMAIL}`, icon: <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon> },
    { label: "Phone Number:", value: CONTACT_ENQUIRY_PHONE, href: `tel:${CONTACT_ENQUIRY_PHONE.replace(/[^+\d]/g, "")}`, icon: <Icon><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></Icon> },
    { label: "Visit Us On:", value: CONTACT_WEBSITE, href: `https://${CONTACT_WEBSITE}`, icon: <Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></Icon> },
  ];
  const label = "mb-1.5 block text-[15px] font-medium text-[#000B2C]";
  const req = <span className="text-red-500">*</span>;

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />

        <main className="flex-1 bg-white py-12 sm:py-16 lg:py-20">
          <h1 className="sr-only">Contact EventQRapp</h1>
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-12">
            {/* Contact Information */}
            <section ref={leftRef} style={left.style} aria-labelledby="contact-info-title" className={`${left.className} relative overflow-hidden rounded-[20px] border border-[#E1EAF8] bg-[#F6F6FF] p-8 sm:p-10`}>
              <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 540 480" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
                {Array.from({ length: 22 }).map((_, i) => {
                  const a0 = ((i * 360) / 22) * (Math.PI / 180);
                  const a1 = ((i * 360 + 360 / 44) / 22) * (Math.PI / 180);
                  const cx = 400, cy = 260, r = 900;
                  return <path key={i} d={`M${cx} ${cy}L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}L${(cx + r * Math.cos(a1 + (Math.PI * 2) / 44)).toFixed(1)} ${(cy + r * Math.sin(a1 + (Math.PI * 2) / 44)).toFixed(1)}Z`} fill="#fff" fillOpacity={0.7} />;
                })}
              </svg>
              <div className="relative">
                <h2 id="contact-info-title" className="font-[family-name:var(--font-dm-sans)] text-[30px] leading-[1.15] tracking-[-0.6px] text-[#000B2C] sm:text-[36px]">Contact Information</h2>
                <dl className="mt-8 flex flex-col">
                  {INFO.map((it, i) => (
                    <div key={it.label} className={`py-5 ${i > 0 ? "border-t border-[#DCE5F7]" : ""}`}>
                      <dt className="flex items-center gap-2.5 text-[15px] text-[#4A5470]">{it.icon}{it.label}</dt>
                      <dd className="mt-2 pl-[30px] text-[16px] font-semibold text-[#000B2C] break-words">
                        {it.href ? <a href={it.href} className="hover:text-[#1F65FF] transition-colors">{it.value}</a> : it.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* Contact Us */}
            <section ref={formRef} style={formReveal.style} aria-labelledby="contact-us-title" className={`${formReveal.className} relative`}>
              <h2 id="contact-us-title" className="font-[family-name:var(--font-dm-sans)] text-[30px] leading-[1.15] tracking-[-0.6px] text-[#000B2C] sm:text-[36px]">Contact Us</h2>
              <p className="mt-3 text-[16px] leading-[1.5] text-[#4A5470]">Have questions or need more information? Get in touch with our team.</p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
                <div>
                  <label htmlFor="contact-name" className={label}>Name {req}</label>
                  <input id="contact-name" type="text" name="name" autoComplete="name" placeholder="Enter your name" aria-required="true" aria-invalid={!!fieldErrors.name} aria-describedby={errorId("name")} maxLength={100} value={values.name} onChange={(e) => setField("name", e.target.value)} disabled={sending} className={fieldClass} />
                  {fieldErrors.name && <p id="contact-name-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" className={label}>Email {req}</label>
                  <input id="contact-email" type="email" name="email" autoComplete="email" placeholder="Enter your email" aria-required="true" aria-invalid={!!fieldErrors.email} aria-describedby={errorId("email")} maxLength={254} value={values.email} onChange={(e) => setField("email", e.target.value)} disabled={sending} className={fieldClass} />
                  {fieldErrors.email && <p id="contact-email-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="contact-phone" className={label}>Phone <span className="font-normal text-[#6B7391]">(optional)</span></label>
                  <PhoneInput id="contact-phone" name="phone" autoComplete="tel" placeholder="Enter your phone number" aria-invalid={!!fieldErrors.phone} aria-describedby={errorId("phone")} value={values.phone} onValueChange={(v) => setField("phone", v)} disabled={sending} className={fieldClass} />
                  {fieldErrors.phone && <p id="contact-phone-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="contact-message" className={label}>Comment {req}</label>
                  <textarea id="contact-message" name="message" rows={4} placeholder="Describe here" aria-required="true" aria-invalid={!!fieldErrors.message} aria-describedby={errorId("message")} maxLength={MESSAGE_MAX_LENGTH} value={values.message} onChange={(e) => setField("message", e.target.value)} disabled={sending} className={`${fieldClass} h-auto py-3 resize-none`} />
                  {fieldErrors.message && <p id="contact-message-error" className="mt-1.5 text-xs text-[#B3261E]">{fieldErrors.message}</p>}
                </div>

                {/* Honeypot for bots: invisible and unreachable for people and assistive tech */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label>
                    Website
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setField("website", e.target.value)} />
                  </label>
                </div>

                <PopupMessage message={feedback?.message} type={feedback?.type === "error" ? "error" : "success"} />

                <button type="submit" disabled={sending} style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }} className="h-12 w-full rounded-xl text-[16px] font-semibold text-white transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
                  {sending ? "Sending…" : "Submit"}
                </button>
              </form>
            </section>
          </div>
        </main>

        <Footer withCta={false} />
      </div>
    </SmoothScroll>
  );
}
