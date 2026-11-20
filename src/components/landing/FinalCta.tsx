import Link from "next/link";
import { Container, Headline } from "./ui";
import Reveal from "./Reveal";

// Figma node 66:7143 (the closing call to action; the footer follows it)
export default function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#000B2C] pb-20 pt-16 text-center sm:pt-20" style={{ backgroundImage: "radial-gradient(ellipse 45% 70% at 28% 0%, rgba(20,110,200,0.55), transparent 70%), radial-gradient(ellipse 45% 70% at 72% 0%, rgba(31,101,255,0.5), transparent 70%)" }}>
      <Container className="flex flex-col items-center gap-6"><Reveal className="flex flex-col items-center gap-6">
        <Headline className="text-white">Your next event deserves a better guest list</Headline>
        <p className="max-w-[440px] text-[16px] leading-[1.6] text-white sm:text-[17px]">Design your invitation, upload your guests and send in minutes. You only pay when you hit send.</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row">
          <Link href="/signup" className="inline-flex h-[46px] items-center justify-center rounded-xl bg-white px-6 text-[15px] font-semibold text-[#000B2C] hover:bg-[#EAF1FF] transition-colors">Create your first event</Link>
          <Link href="/contact" className="inline-flex h-[46px] items-center justify-center rounded-xl border border-white/50 bg-white/10 px-6 text-[15px] font-semibold text-white hover:bg-white/20 transition-colors">Book a demo</Link>
        </div>
        <p className="text-[15px] text-white">No credit card needed to set up. Pay per invitee, with no subscription.</p>
      </Reveal></Container>
    </section>
  );
}
