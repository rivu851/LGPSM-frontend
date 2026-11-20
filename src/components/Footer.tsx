import Image from "next/image";
import Link from "next/link";
import FinalCta from "@/components/landing/FinalCta";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/constants/site";

// Landing footer (Figma node 66:7177): brand and blurb on the left, five link groups (Legal wraps under Product), then the copyright line with
// the contact details. Every link goes to a section of the landing page or an existing page; labels that have no page of their own yet
// (Help centre, Blog, About, Careers and the three legal pages) lead to the Contact page until those pages exist.
const GROUPS = [
  { title: "Product", links: [["Features", "/#features"], ["How it works", "/#how-it-works"], ["Pricing", "/#pricing"], ["Templates", "/#features"], ["Custom card design", "/contact"]] },
  { title: "Use cases", links: [["Weddings", "/#use-cases"], ["Birthdays", "/#use-cases"], ["Corporate events", "/#use-cases"], ["Conferences", "/#use-cases"], ["Expos and fests", "/#use-cases"], ["Agencies", "/#use-cases"]] },
  { title: "Resources", links: [["Help centre", "/contact"], ["Sample Excel guest list", "/#features"], ["FAQ", "/#faq"], ["Blog", "/contact"]] },
  { title: "Company", links: [["About", "/contact"], ["Contact", "/contact"], ["Careers", "/contact"]] },
  { title: "Legal", links: [["Terms and conditions", "/contact"], ["Privacy policy", "/contact"], ["Refund policy", "/contact"]] },
] as const;

export default function Footer({ withCta = true }: { withCta?: boolean }) {
  return (
    <>
      {withCta ? <FinalCta /> : null}
      <footer className="bg-[#000B2C] text-[#A9B4CF]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[30px] px-4 pb-8 pt-[72px] sm:px-6 lg:px-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
            <div className="flex w-full flex-col gap-4 lg:w-[304px] lg:shrink-0">
              <Link href="/" aria-label="EventQRapp home" className="self-start">
                <Image src="/images/branding/eventqrapp-logo-light.svg" alt="EventQRapp" width={202} height={36} className="h-9 w-auto" />
              </Link>
              <p className="max-w-[280px] text-[15px] leading-[1.35]">EventQRApp helps you create elegant digital invitations with QR codes, RSVP tracking, guest management, and instant sharing. Perfect for weddings, birthdays, corporate events, and special occasions.</p>
            </div>
            <div className="grid flex-1 grid-cols-2 content-start gap-x-6 gap-y-[30px] text-[14px] sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-[30px]">
              {GROUPS.map((g) => (
                <nav key={g.title} aria-label={g.title} className="flex flex-col gap-3 lg:w-[164px]">
                  <h2 className="font-semibold text-white">{g.title}</h2>
                  <ul className="flex flex-col gap-3">
                    {g.links.map(([label, href]) => (
                      <li key={label}><Link href={href} className="leading-[19.6px] transition-colors hover:text-white">{label}</Link></li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-[#1E2B52] pt-6 text-[14px] sm:flex-row sm:items-center sm:justify-between sm:text-[17px]">
            <p>© {new Date().getFullYear()} EventQRapp. All rights reserved.</p>
            {CONTACT_EMAIL || CONTACT_PHONE ? (
              <p className="flex flex-wrap items-center gap-x-2">
                {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-white">{CONTACT_EMAIL}</a> : null}
                {CONTACT_EMAIL && CONTACT_PHONE ? <span aria-hidden>|</span> : null}
                {CONTACT_PHONE ? <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`} className="transition-colors hover:text-white">{CONTACT_PHONE}</a> : null}
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
