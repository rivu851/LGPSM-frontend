import Link from "next/link";
import { BLUE_GRADIENT } from "./BlueButton";
import Reveal from "./Reveal";
import { Container, Headline } from "./ui";

// Figma node 66:6767 — pricing. The rate shown is the design's example; the live rate is set by the platform admin.
const RATE = 3;
const GUESTS = 510;
const GST = 0.18;
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const FEATURES = [
  "Unique QR invitation for every guest", "Delivery by email and WhatsApp", "Templates or your own design", "RSVP and food-preference collection",
  "Multiple sessions and access rules", "Staff accounts for your team", "Live check-in dashboard", "Full event report and downloads", "Invoice for every payment",
];

export default function PricingLanding() {
  const subtotal = GUESTS * RATE;
  const gst = subtotal * GST;
  return (
    <section id="pricing" className="scroll-mt-[69px] bg-white py-14 sm:py-20">
      <Container className="flex flex-col items-center gap-10">
        <Reveal className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Headline className="text-[#000B2C]">Simple pricing. Pay only for the guests you invite.</Headline>
          <p className="max-w-[560px] text-[16px] leading-[1.6] text-[#4A5470] sm:text-[17px]">No subscriptions, no seat fees, no setup costs. You see the exact total before you send a single invitation.</p>
        </Reveal>
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
          <Reveal variant="left" className="relative overflow-hidden rounded-[20px] p-7 text-white sm:p-8" style={{ background: "radial-gradient(ellipse 70% 60% at 85% 0%, rgba(88,40,160,0.55), transparent 70%), linear-gradient(160deg, #0A1B66 0%, #000B2C 70%)" }}>
            <p className="text-[14px] font-semibold text-[#8FB0FF]">Pay per invitee</p>
            <p className="mt-3 font-[family-name:var(--font-dm-sans)] text-[72px] leading-none tracking-[-2px]">₹{RATE}</p>
            <p className="mt-1 text-[14px] text-[#C3CCE6]">per invitee + GST</p>
            <p className="mt-5 text-[15px] font-semibold">One price, every feature included</p>
            <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-[#E6ECFF]">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px]">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/signup" style={{ backgroundImage: BLUE_GRADIENT }} className="mt-8 flex h-11 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white hover:brightness-110 transition">Create your event — pay when you send</Link>
          </Reveal>
          <Reveal variant="right" delay={120} className="flex flex-col gap-4">
            <div className="rounded-[20px] bg-[#1F65FF] p-6 text-white">
              <p className="text-[14px] font-semibold">Worked example: {GUESTS} guests</p>
              <dl className="mt-4 flex flex-col gap-2.5 text-[14px]">
                <div className="flex justify-between"><dt>{GUESTS} guests × ₹{RATE}</dt><dd>{inr(subtotal)}</dd></div>
                <div className="flex justify-between"><dt>GST (18%)</dt><dd>{inr(gst)}</dd></div>
                <div className="mt-2 flex justify-between border-y border-white/60 py-3 font-semibold"><dt>Total</dt><dd>{inr(subtotal + gst)}</dd></div>
              </dl>
            </div>
            <div className="rounded-[20px] border border-[#E1E7F2] bg-white p-6">
              <h3 className="text-[15px] font-bold text-[#000B2C]">Planning many events, or need a custom card?</h3>
              <p className="mt-2 text-[14px] leading-[1.45] text-[#4A5470]">Planning many events a year, or need a custom card design? Talk to us for volume pricing.</p>
              <Link href="/contact" className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#1F65FF] px-4 text-[13px] font-semibold text-[#1F65FF] hover:bg-[#EAF1FF] transition-colors">Talk to us</Link>
            </div>
            <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-[#4A5470]">
              <span>🔒 Secure payment</span><span>✉ Instant invoice by email</span><span>⬇ Statements any time</span>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
