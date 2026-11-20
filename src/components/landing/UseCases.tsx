import Link from "next/link";
import Reveal from "./Reveal";
import { Container, Headline } from "./ui";

// Figma node 66:6481 — who it is for
const ICON = (d: React.ReactNode) => (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const CASES = [
  { tag: "Weddings and receptions", title: "Every family member, every function", body: "Separate guest lists for the mehendi, the wedding and the reception, with meal choices collected in advance.", icon: ICON(<><circle cx="9" cy="14" r="5" /><circle cx="15" cy="14" r="5" /><path d="M8 5l1-2h2l1 2" /></>) },
  { tag: "Birthdays and anniversaries", title: "Party invites that feel personal", body: "Pick a themed card, add a photo, and know who's coming before you book the caterer.", icon: ICON(<><path d="M4 21h16M5 21v-7a2 2 0 012-2h10a2 2 0 012 2v7" /><path d="M12 12V8M12 4c1 1.2 1 2 0 3-1-1-1-1.8 0-3z" /></>) },
  { tag: "Corporate events and AGMs", title: "Professional entry for professional events", body: "Branded invitations, controlled access for delegates and VIPs, and an attendance report for stakeholders.", icon: ICON(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" /></>) },
  { tag: "Product launches and conferences", title: "Keep the right people in the right room", body: "Run keynote, lunch and networking sessions with separate access, and track turnout per session.", icon: ICON(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>) },
  { tag: "Expos, fests and graduations", title: "Big crowds, short queues", body: "Bulk-upload thousands of guests, staff every gate, and scan people in fast.", icon: ICON(<><path d="M3 9a2 2 0 002-2h14a2 2 0 002 2v1.5a1.5 1.5 0 000 3V15a2 2 0 00-2 2H5a2 2 0 00-2-2v-1.5a1.5 1.5 0 000-3z" /><path d="M13 7v10" strokeDasharray="2 2" /></>) },
  { tag: "Event planners and agencies", title: "Run many clients' events from one login", body: "Manage several events at once, assign your crew per event, and hand every client a clean report.", icon: ICON(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>) },
];

export default function UseCases() {
  return (
    <section className="bg-[#000B2C] py-14 sm:py-20">
      <Container className="flex flex-col items-center gap-10">
        <Reveal className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Headline className="text-white">Built for every kind of guest list</Headline>
          <p className="text-[16px] text-[#C3CCE6] sm:text-[17px]">From a 50-person birthday to a 2,000-guest college fest, the same tools scale with you.</p>
        </Reveal>
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-[20px] bg-white sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map((c, i) => (
            <Reveal key={c.tag} variant="pop" delay={(i % 3) * 90} className={`flex flex-col gap-2 p-6 ${i % 3 !== 0 ? "lg:border-l lg:border-[#E1EAF8]" : ""} ${i >= 3 ? "lg:border-t lg:border-[#E1EAF8]" : ""} ${i > 0 ? "border-t border-[#E1EAF8] sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l sm:border-[#E1EAF8]" : ""} ${i >= 2 ? "sm:border-t sm:border-[#E1EAF8]" : ""}`}>
              <span className="mb-2 flex size-[34px] items-center justify-center rounded-lg bg-[#EAF1FF] text-[#1F65FF]">{c.icon}</span>
              <p className="text-[13px] font-medium text-[#1F65FF]">{c.tag}</p>
              <h3 className="text-[16px] font-bold leading-[1.3] text-[#000B2C]">{c.title}</h3>
              <p className="text-[15px] leading-[1.45] text-[#4A5470]">{c.body}</p>
            </Reveal>
          ))}
        </div>
        <Link href="/contact" className="inline-flex h-11 items-center rounded-xl border border-white/80 px-6 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors">Find the right setup for your event</Link>
      </Container>
    </section>
  );
}
