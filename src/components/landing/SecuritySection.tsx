import { Container, Headline } from "./ui";
import Reveal from "./Reveal";

// Figma node 66:6997
const ICON = (d: React.ReactNode) => (
  <svg className="size-6 text-[#1F65FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const POINTS = [
  { title: "Unique QR per guest", body: "Each invitation carries its own code, so forwarded or copied cards can't let extra people in.", icon: ICON(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v1M14 21h1M18 18h3v3" /></>) },
  { title: "Rules that hold at the door", body: "Only Once access, attendee limits and RSVP rules are applied at every scan.", icon: ICON(<><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>) },
  { title: "A safety lock before sending", body: "You get a clear warning before invites go out, and the event locks afterwards so nothing changes under your guests.", icon: ICON(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>) },
  { title: "Full audit trail", body: "Every invite sent and every access rule changed is logged with the person and time.", icon: ICON(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>) },
];

export default function SecuritySection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <Container className="flex flex-col items-center gap-10">
        <Reveal className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Headline className="text-[#000B2C]">Your guest list stays yours, and your gate stays shut to strangers</Headline>
          <p className="max-w-[460px] text-[16px] leading-[1.6] text-[#4A5470] sm:text-[17px]">Every invitation is unique, every entry is logged, and every change has a name next to it.</p>
        </Reveal>
        <div className="grid w-full grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} variant="up" delay={i * 90} className={`flex flex-col gap-2 ${i > 0 ? "lg:border-l lg:border-[#E1EAF8] lg:pl-5" : ""} ${i < 3 ? "lg:pr-5" : ""}`}>
              {p.icon}
              <h3 className="mt-2 text-[15px] font-bold text-[#000B2C]">{p.title}</h3>
              <p className="text-[15px] leading-[1.45] text-[#4A5470]">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
