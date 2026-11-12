import React from "react";

// A dashed outline drawn as one continuous SVG path. CSS `border-style: dashed` restarts its dash pattern on each side,
// which leaves visible gaps (or stubs) at rounded corners; a single rounded rect wraps the corners unbroken.
// Put it inside a `relative` (and `group`) parent. The colour comes from the text colour, so hover states are text classes
// on this element, e.g. className="text-[#D3D3D3] group-hover:text-[#A83800]".
export default function DashedBorder({ className = "", radius = 6, width = 2 }: { className?: string; radius?: number; width?: number }) {
  const inset = width / 2;
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      <rect
        x={inset}
        y={inset}
        rx={radius}
        ry={radius}
        style={{ width: `calc(100% - ${width}px)`, height: `calc(100% - ${width}px)` }}
        fill="none"
        stroke="currentColor"
        strokeWidth={width}
        strokeDasharray="7 5"
        strokeLinecap="round"
      />
    </svg>
  );
}
