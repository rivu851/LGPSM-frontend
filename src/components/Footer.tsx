import Image from "next/image";
import Link from "next/link";
import FinalCta from "@/components/landing/FinalCta";

// Landing footer (Figma node 66:7177): the closing call to action, then the link columns. Only links to pages that exist are shown.
const COLUMNS = [
  { title: "Product", links: [{ label: "Features", href: "/features" }, { label: "How it works", href: "/#how-it-works" }, { label: "Pricing", href: "/#pricing" }] },
  { title: "Use cases", links: [{ label: "Weddings", href: "/#features" }, { label: "Birthdays", href: "/#features" }, { label: "Corporate events", href: "/#features" }, { label: "Conferences", href: "/#features" }, { label: "Expos and fests", href: "/#features" }, { label: "Agencies", href: "/#features" }] },
  { title: "Resources", links: [{ label: "FAQ", href: "/#faq" }, { label: "Contact", href: "/contact" }] },
  { title: "Account", links: [{ label: "Log in", href: "/signin?mode=organizer" }, { label: "Sign up", href: "/signup" }] },
];

export default function Footer({ withCta = true }: { withCta?: boolean }) {
  return (
    <>
      {withCta ? <FinalCta /> : null}
      <footer className="bg-[#000B2C] text-[#C3CCE6]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_repeat(4,1fr)] lg:px-12">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-1">
            <Image src="/images/branding/eventqrapp-logo-light.svg" alt="EventQRapp" width={180} height={32} className="h-8 w-auto self-start" />
            <p className="max-w-[300px] text-[13px] leading-[1.5]">EventQRApp helps you create elegant digital invitations with QR codes, RSVP tracking, guest management, and instant sharing. Perfect for weddings, birthdays, corporate events, and special occasions.</p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="flex flex-col gap-3">
              <h2 className="text-[13px] font-semibold text-white">{c.title}</h2>
              <ul className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-[13px] hover:text-white transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-12">
          <div className="border-t border-white/15 py-6 text-[13px]">© {new Date().getFullYear()} EventQRapp. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}
