import Image from "next/image";
import Reveal from "./Reveal";
import { CheckList, Container, SectionHeading } from "./ui";

// Figma node 66:617 — six tools, alternating text and product panel
const FEATURES = [
  {
    tag: "Invitation designer", icon: 1, visual: "right", image: "/images/landing/feature-1.webp", imageAlt: "Template library with birthday, griha pravesh and anniversary invitation cards",
    title: "Invitations your guests will actually open",
    desc: "Start from a library of templates sorted by occasion, or upload your own artwork. Template cards carries a unique QR code and your organizer logo, and you see exactly how it looks on a phone before anything is sent.",
    bullets: ["Templates by category: Personal, Corporate, Social, Sports, Entertainment", "Upload your own design as a JPG, PNG or WEBP image (9:16 portrait, up to 5 MB)", "Live phone preview that updates as you type", "Event logo/image on the card", "Need something bespoke? Request a custom card design"],
  },
  {
    tag: "RSVP and preferences", icon: 2, visual: "left", image: "/images/landing/feature-2.webp", imageAlt: "Event settings with RSVP deadline, dietary preference and accepted, pending and declined counts",
    title: "Know who's coming, and what they'll eat",
    desc: "Turn on RSVP with an acceptance deadline and see every reply as it lands. Add your own questions, like veg or non-veg, so catering numbers are ready before the event.",
    bullets: ["RSVP with a last date for replies", "Custom preference questions with your own options", "Accepted, pending and declined status per guest", "Alerts when guests haven't replied yet"],
  },
  {
    tag: "Sessions and access", icon: 3, visual: "right", image: "/images/landing/feature-3.webp", imageAlt: "Add session form with Entry, Lunch and Drinks sessions",
    title: "One event, many sessions, the right guests at each",
    desc: "Split your event into sessions such as Entry, Lunch or the VIP dinner. Each has its own time, guest list and entry rule, so only the people you chose get through each door.",
    bullets: ["Multiple sessions per event, each with its own time slot", "Entry rules: Only Once, or No Restrictions", "Reuse another session's guest list in one click", "Require a valid entry-session check-in before other sessions open", "Set an overall attendee limit, and decide whether non-responders or declined guests may enter"],
  },
  {
    tag: "Guest lists", icon: 4, visual: "left", image: "/images/landing/feature-4.webp", imageAlt: "Invitee list preview with an upload summary of 8 added and 0 rejected",
    title: "Upload 500 guests as easily as 5",
    desc: "Download the sample Excel sheet, fill in names, emails and mobile numbers, and upload. Mark which sessions each guest can attend with a simple Y or N. Preview and fix any row before you save.",
    bullets: ["Excel upload with a ready-made sample template", "Per-session access columns in the same sheet", "Preview, search and edit rows before saving", "Add more guests to any session later", "Instant upload summary showing how many were added and rejected"],
  },
  {
    tag: "Sending and delivery", icon: 5, visual: "right", image: "/images/landing/feature-5.webp", imageAlt: "Invitation delivery status per guest",
    title: "Send hundreds of invites in one click, and see every one land",
    desc: "When your list is ready, send every guest their invitation by email and WhatsApp at once, each with its own unique QR code. Track which invites were delivered and which failed, and resend to failed ones without starting over.",
    bullets: ["Bulk send by email and WhatsApp, to every guest or one session", "Delivery status per guest: sent, received or failed", "Resend to failed or selected guests in one click", "A warning before sending, so you don't lock the event by mistake"],
  },
  {
    tag: "Team and staff", icon: 6, visual: "left", image: "/images/landing/feature-6.webp", imageAlt: "System users assigned to events and sessions",
    title: "Put the right person on every gate",
    desc: "Add your staff as system users and assign them to the exact events and sessions they will manage. Everyone sees only what they need, and you can reassign people in seconds.",
    bullets: ["Add staff with name, email and phone", "Assign one person to many events and sessions", "See each person's assignments at a glance", "Unassign or reassign with one click"],
  },
] as const;

export default function FeatureRows() {
  return (
    <section id="features" className="scroll-mt-[69px] bg-white py-14 sm:py-20">
      <Container className="flex flex-col gap-16 lg:gap-24">
        <Reveal><SectionHeading title="Everything you need to invite, admit and understand your guests" subtitle="Six tools that work together, so nothing falls between the invitation and the door." /></Reveal>
        {FEATURES.map((f) => (
          <div key={f.tag} className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <Reveal variant={f.visual === "left" ? "right" : "left"} className={`flex flex-col gap-[18px] ${f.visual === "left" ? "lg:order-2" : ""}`}>
              <div className="flex items-center gap-2">
                <Image src={`/images/landing/tag-${f.icon}.svg`} alt="" width={18} height={18} />
                <p className="text-[17px] font-semibold text-[#1F65FF]">{f.tag}</p>
              </div>
              <h3 className="text-[19px] font-bold leading-[1.15] tracking-[-0.5px] text-[#000B2C] sm:text-[20px]">{f.title}</h3>
              <p className="text-[16px] leading-[1.65] text-[#4A5470] sm:text-[17px]">{f.desc}</p>
              <CheckList items={[...f.bullets]} />
            </Reveal>
            <Reveal variant={f.visual === "left" ? "left" : "right"} delay={120} className={`overflow-hidden rounded-[20px] ${f.visual === "left" ? "lg:order-1" : ""}`}>
              <Image src={f.image} alt={f.imageAlt} width={1140} height={910} sizes="(max-width:1024px) 92vw, 570px" className="h-auto w-full" />
            </Reveal>
          </div>
        ))}
      </Container>
    </section>
  );
}
