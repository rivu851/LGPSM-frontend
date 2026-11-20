import Image from "next/image";
import Link from "next/link";
import { BLUE_GRADIENT } from "./BlueButton";
import Reveal from "./Reveal";
import { Container, Headline } from "./ui";

// Figma node 66:6047 — what the organiser sees on the day
const POINTS = [
  { title: "Live session health", body: "Currently logged-in guests, check-ins today and occupancy for each session, shown as simple rings.", icon: <path d="M3 12h4l3-8 4 16 3-8h4" /> },
  { title: "Entry and exit logs", body: "Guest name, ID, entry time, exit time, gate (Main or VIP) and whether they are inside or have left.", icon: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" /></> },
  { title: "Activity trail", body: "Every action your team takes, such as sending invites or changing access rules, is logged with who did it and when.", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

export default function EventDay() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <Container className="flex flex-col gap-12">
        <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E1E7F2] bg-white px-3 py-1 text-[13px] font-medium text-[#15803D]">
            <span className="size-1.5 rounded-full bg-[#15803D]" />On event day
          </span>
          <Headline className="text-[#000B2C]">Watch your event fill up in real time</Headline>
          <p className="text-[16px] leading-[1.6] text-[#4A5470] sm:text-[17px]">Guests show the QR code from their email or WhatsApp at the entrance. Your staff scan it to verify entry. You see every entry the moment it happens.</p>
        </Reveal>
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[560px_1fr] lg:gap-12">
          <Reveal variant="left" className="overflow-hidden rounded-[20px]">
            <Image src="/images/landing/event-day.webp" alt="Session health overview with live logged-in guests, check-ins today and occupancy, and the access logs table" width={560} height={593} sizes="(max-width:1024px) 92vw, 560px" className="h-auto w-full" />
          </Reveal>
          <Reveal variant="right" delay={120} className="flex flex-col gap-0">
            <p className="pb-5 text-[16px] leading-[1.55] text-[#4A5470] sm:text-[17px]">The live Event Details dashboard shows who is inside, how full each session is, and which gate each guest came through. Spot a crowded session, a late arrival or a failed invite while there is still time to act.</p>
            {POINTS.map((p) => (
              <div key={p.title} className="flex gap-3 border-t border-[#E1E7F2] py-4">
                <svg className="mt-1 size-5 shrink-0 text-[#1F65FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p.icon}</svg>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#000B2C]">{p.title}</h3>
                  <p className="text-[16px] leading-[1.4] text-[#4A5470] sm:text-[17px]">{p.body}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-[#E1E7F2] pt-6">
              <Link href="/signup" style={{ backgroundImage: BLUE_GRADIENT }} className="inline-flex h-11 items-center rounded-xl px-6 text-[15px] font-semibold text-white hover:brightness-95 transition">See the live dashboard</Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
