"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * "Pip": the small cartoon guide that lives in the corner of the digital access card. It never stops moving (floats, blinks,
 * waves, twinkles) and answers a tap: it hops and says the next tip. The tips come from the page, so they match what this
 * guest actually has left to do. All motion is plain CSS inside the SVG, and is switched off for people who ask their
 * device for reduced motion (the character stays, still).
 */
const CSS = `
.pip{overflow:visible}
.pip *{transform-box:view-box}
.pip .float{animation:pipFloat 3.2s ease-in-out infinite;transform-origin:60px 100px}
.pip .shadow{animation:pipShadow 3.2s ease-in-out infinite;transform-origin:60px 112px}
.pip .blink{animation:pipBlink 4.6s infinite;transform-origin:60px 52px}
.pip .wave{animation:pipWave 1.9s ease-in-out infinite;transform-origin:92px 74px}
.pip .antenna{animation:pipSway 2.6s ease-in-out infinite;transform-origin:60px 24px}
.pip .spark{animation:pipTwinkle 2.2s ease-in-out infinite}
.pip .spark.b{animation-delay:.7s}
.pip .spark.c{animation-delay:1.4s}
.pip.hop .float{animation:pipHop .7s cubic-bezier(.3,1.6,.5,1) 1}
.pip.hop .wave{animation:pipWaveFast .7s ease-in-out 1}
@keyframes pipFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes pipShadow{0%,100%{transform:scale(1);opacity:.22}50%{transform:scale(.82);opacity:.13}}
@keyframes pipBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes pipWave{0%,100%{transform:rotate(0)}25%{transform:rotate(-24deg)}50%{transform:rotate(8deg)}75%{transform:rotate(-20deg)}}
@keyframes pipWaveFast{0%,100%{transform:rotate(0)}20%{transform:rotate(-40deg)}40%{transform:rotate(10deg)}60%{transform:rotate(-40deg)}80%{transform:rotate(10deg)}}
@keyframes pipSway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes pipTwinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
@keyframes pipHop{0%{transform:translateY(0) scale(1,1)}25%{transform:translateY(4px) scale(1.06,.92)}55%{transform:translateY(-22px) scale(.95,1.06)}100%{transform:translateY(0) scale(1,1)}}
@keyframes pipBubble{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pip *,.pip-bubble{animation:none!important}}
`;

export default function GuideMascot({ tips, name }: { tips: string[]; name?: string }) {
  const [index, setIndex] = useState(0);
  const [hop, setHop] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const list = tips.length ? tips : ["Hello! I'm Pip, your guide for this invitation."];
  const tip = list[index % list.length];
  // the tip changes by itself every few seconds (paused while the tab is hidden), and a tap moves on straight away
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => { if (!document.hidden) setIndex((i) => (i + 1) % list.length); }, 8000);
    return () => clearInterval(t);
  }, [list.length]);
  const poke = () => {
    setIndex((i) => (i + 1) % list.length);
    setHop(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHop(false), 750);
  };

  return (
    <div className="flex w-full items-end justify-between gap-2">
      <style>{CSS}</style>
      <div key={index} role="status" aria-live="polite" className="pip-bubble relative mb-5 min-w-0 flex-1 rounded-[20px] rounded-br-md border border-[color:var(--inv-line)] bg-white px-3.5 py-2.5 text-[12px] font-medium leading-snug text-[color:var(--inv-ink)] shadow-sm" style={{ animation: "pipBubble .35s ease-out" }}>
        {tip}
        {list.length > 1 && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--inv-accent-text)]">Tap me for another tip</span>}
      </div>
      <button
        type="button"
        onClick={poke}
        aria-label={`Tips${name ? ` for ${name}` : ""}: tap the guide for the next tip`}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--inv-accent)]"
      >
        <svg className={`pip ${hop ? "hop" : ""}`} width="72" height="72" viewBox="0 0 120 120" aria-hidden>
          <ellipse className="shadow" cx="60" cy="112" rx="26" ry="5" fill="#000" opacity=".2" />
          <g className="float">
            {/* antenna */}
            <g className="antenna">
              <path d="M60 26 C60 16 62 12 66 8" stroke="var(--inv-accent)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <circle cx="67" cy="7" r="5" fill="var(--inv-accent)" />
              <circle cx="65.5" cy="5.5" r="1.6" fill="#fff" opacity=".7" />
            </g>
            {/* waving arm (behind the body edge) */}
            <g className="wave">
              <path d="M90 76 C100 72 104 62 101 54" stroke="var(--inv-primary)" strokeWidth="9" strokeLinecap="round" fill="none" />
              <circle cx="101" cy="52" r="6.5" fill="var(--inv-primary)" />
            </g>
            <path d="M30 78 C22 82 20 90 24 96" stroke="var(--inv-primary)" strokeWidth="9" strokeLinecap="round" fill="none" />
            {/* body: a soft, full-round blob */}
            <path d="M60 24 C86 24 98 44 98 68 C98 94 82 106 60 106 C38 106 22 94 22 68 C22 44 34 24 60 24 Z" fill="var(--inv-primary)" />
            <path d="M60 32 C80 32 90 48 90 68 C90 70 89 72 88 74 C80 66 40 66 32 74 C31 72 30 70 30 68 C30 48 40 32 60 32 Z" fill="#fff" opacity=".16" />
            {/* tummy badge: a tiny ticket */}
            <rect x="46" y="82" width="28" height="16" rx="5" fill="#fff" opacity=".92" />
            <circle cx="46" cy="90" r="3" fill="var(--inv-primary)" />
            <circle cx="74" cy="90" r="3" fill="var(--inv-primary)" />
            <path d="M54 90h12" stroke="var(--inv-accent)" strokeWidth="2" strokeDasharray="2.4 2.4" strokeLinecap="round" />
            {/* face */}
            <g className="blink">
              <circle cx="47" cy="52" r="9" fill="#fff" />
              <circle cx="73" cy="52" r="9" fill="#fff" />
              <circle cx="49" cy="53" r="4.6" fill="#15191C" />
              <circle cx="75" cy="53" r="4.6" fill="#15191C" />
              <circle cx="50.6" cy="51" r="1.5" fill="#fff" />
              <circle cx="76.6" cy="51" r="1.5" fill="#fff" />
            </g>
            <circle cx="37" cy="66" r="5" fill="#FF8FA3" opacity=".55" />
            <circle cx="83" cy="66" r="5" fill="#FF8FA3" opacity=".55" />
            <path d="M52 68 C56 75 64 75 68 68" stroke="#15191C" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* feet */}
            <ellipse cx="46" cy="106" rx="9" ry="5" fill="var(--inv-accent)" />
            <ellipse cx="74" cy="106" rx="9" ry="5" fill="var(--inv-accent)" />
          </g>
          {/* sparkles */}
          <path className="spark" d="M16 30 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" fill="var(--inv-accent)" style={{ transformOrigin: "16px 38px" }} />
          <path className="spark b" d="M106 24 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8 -4.4 -4.4 -1.8 4.4 -1.8z" fill="var(--inv-primary)" style={{ transformOrigin: "106px 30px" }} />
          <circle className="spark c" cx="108" cy="92" r="3" fill="var(--inv-accent)" style={{ transformOrigin: "108px 92px" }} />
        </svg>
      </button>
    </div>
  );
}
