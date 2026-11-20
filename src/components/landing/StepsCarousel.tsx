"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { PrimaryLink } from "./BlueButton";
import { Container, Headline } from "./ui";
import Reveal from "./Reveal";

// Figma node 66:248 — five steps from a blank event to invitations sent
const STEPS = [
  { title: "Create your event", body: "Add the title, description, category, dates, contact number and venue. Verify the address on the map so guests always find you.", image: "/images/landing/step-1.webp" },
  { title: "Pick your card", body: "Choose a ready template for birthdays, weddings, launches and more, or upload your own design. Your event details appear on a live phone preview as you type.", image: "/images/landing/step-2.webp" },
  { title: "Set the rules", body: "Cap total attendance, decide whether non-responders or declined guests can still enter, and ask guests for their food preferences.", image: "/images/landing/step-3.webp" },
  { title: "Add sessions and guests", body: "Split the day into sessions like Entry, Lunch or Drinks. Upload each guest list from Excel and choose whether guests can enter once or as often as they like.", image: "" },
  { title: "Pay and send invites", body: "See the exact cost per invitee, pay securely, and send every QR invitation by email and WhatsApp in one click. Your invoice arrives by email.", image: "" },
];

export default function StepsCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (to: number) => {
    const i = Math.max(0, Math.min(STEPS.length - 1, to));
    setIndex(i);
    const card = rail.current?.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <section id="how-it-works" className="scroll-mt-[69px] relative overflow-hidden bg-[#000B2C] py-14 sm:py-20 text-white" style={{ backgroundImage: "radial-gradient(ellipse 60% 50% at 85% 10%, rgba(88,40,160,0.45), transparent 70%), radial-gradient(ellipse 70% 60% at 10% 100%, rgba(31,101,255,0.28), transparent 70%)" }}>
      <Container className="flex flex-col items-center gap-10">
        <div className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Headline className="text-white">Five steps from a blank event to invitations sent.</Headline>
          <p className="text-[16px] text-[#C3CCE6] sm:text-[17px]">A guided wizard walks you from a blank event to invitations in your guests&apos; hands.</p>
        </div>

        <div ref={rail} className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-start" role="list" aria-label="The five steps">
          {STEPS.map((s, i) => (
            <Reveal as="article" role="listitem" key={s.title} variant="right" delay={i * 90} className="flex w-[84%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white p-[11px] text-left text-[#000B2C] sm:w-[46%] lg:w-[calc((100%-32px)/3)]">
              <div className="relative aspect-[325/200] w-full overflow-hidden rounded-lg bg-gradient-to-br from-[#EAF1FF] to-[#D6E4FF]">
                {s.image ? (
                  <Image src={s.image} alt="" fill sizes="(max-width:1024px) 80vw, 360px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-dm-sans)] text-[72px] text-[#1F65FF]/70" aria-hidden>{i + 1}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 px-2 pb-4 pt-4">
                <h3 className="text-[17px] font-bold">{s.title}</h3>
                <p className="text-[16px] leading-[1.45] text-[#4A5470] sm:text-[17px]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.title} className={`h-[7px] rounded-full transition-all ${i === index ? "w-6 bg-[#1F65FF]" : "w-[7px] bg-white/40"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step" className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition disabled:opacity-40 enabled:hover:bg-white/30">‹</button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === STEPS.length - 1} aria-label="Next step" className="flex size-10 items-center justify-center rounded-full bg-[#1F65FF] text-white transition disabled:opacity-40 enabled:hover:brightness-110">›</button>
          </div>
        </div>

        <PrimaryLink href="/signup" className="h-11 text-[15px]">Start setting up your event</PrimaryLink>
      </Container>
    </section>
  );
}
