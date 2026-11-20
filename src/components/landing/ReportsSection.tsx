import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";
import { Container, Headline, Tick } from "./ui";

// Figma node 66:6261 — reports
const BULLETS = [
  "Totals at a glance: invitees, attendees, sessions and staff",
  "Invited vs. attended chart for each session",
  "Invitation delivery split: sent, received, failed",
  "Per-guest log: invitation status, RSVP, check-in status and last check-in time",
  "Session and access logs, downloadable as a list",
  "Billing history with invoices and downloadable statements by date range",
];

export default function ReportsSection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal variant="left" className="flex flex-col gap-5">
          <Headline className="text-[#000B2C]">Every event ends with answers, not guesses</Headline>
          <p className="text-[16px] leading-[1.5] text-[#000B2C] sm:text-[17px]">One report shows how many you invited, how many came, and what happened at every session.</p>
          <p className="text-[16px] leading-[1.5] text-[#4A5470] sm:text-[17px]">After the event, open a full report for it, or download it to share with clients, sponsors or family. Compare invited and attended guests session by session, and drill down to any single guest.</p>
          <ul className="flex flex-col gap-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[16px] leading-[1.45] text-[#4A5470]">
                <Tick className="mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div>
            <Link href="/signup" className="inline-flex h-11 items-center rounded-xl border border-[#000B2C] bg-white px-6 text-[15px] font-semibold text-[#000B2C] hover:bg-[#EAF1FF] transition-colors">Explore a sample report</Link>
          </div>
        </Reveal>
        <Reveal variant="right" delay={120} className="overflow-hidden rounded-[20px]">
          <Image src="/images/landing/reports.webp" alt="Event report with total invitees, assigned system users, total sessions and an invited versus attended chart" width={560} height={654} sizes="(max-width:1024px) 92vw, 560px" className="h-auto w-full" />
        </Reveal>
      </Container>
    </section>
  );
}
