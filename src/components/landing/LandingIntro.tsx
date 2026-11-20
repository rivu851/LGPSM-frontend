"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";

/**
 * The landing page's opening: the EventQRapp logo on navy, then a circle opens from the centre and grows until it has uncovered the
 * whole page. About a second and a half, every time the landing page is opened until the visitor has signed up or logged in (then never again). People who go straight to their dashboard never see it.
 */
export default function LandingIntro() {
  const overlay = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const el = overlay.current;
    if (root.getAttribute("data-intro") !== "play" || !el) { setDone(true); return; }

    const reach = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 48;
    const hole = { r: 0 };
    const paint = () => {
      const mask = `radial-gradient(circle at 50% 50%, transparent ${hole.r}px, #000 ${hole.r + 1.5}px)`;
      el.style.maskImage = mask;
      el.style.webkitMaskImage = mask;
    };
    paint();

    const finish = () => { root.removeAttribute("data-intro"); setDone(true); };
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo(logo.current, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" })
      .to({}, { duration: 0.3 })
      .to(logo.current, { opacity: 0, scale: 1.04, duration: 0.3, ease: "power1.in" })
      .to(hole, { r: reach, duration: 0.95, ease: "power3.inOut", onUpdate: paint }, "<0.05");
    // only the animation is stopped here: the first run of a development double-mount must not cancel the opening for the second
    return () => { tl.kill(); };
  }, []);

  if (done) return null;
  return (
    <>
      <div ref={overlay} aria-hidden className="intro-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[#000B2C] pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(31,101,255,0.28), transparent 70%)" }}>
        <div ref={logo} className="opacity-0">
          <Image src="/images/branding/eventqrapp-logo-light.svg" alt="" width={300} height={54} priority className="h-[44px] sm:h-[54px] w-auto" />
        </div>
      </div>
    </>
  );
}
