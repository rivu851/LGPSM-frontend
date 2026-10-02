import React from "react";

// Renders a nav icon tinted with the current text colour (active items turn orange).
// All icons render at exactly 20×20 px inside a 24×24 container so different SVG viewBoxes
// don't produce different visual sizes.
export default function NavIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  const url = `url(/icons/nav/${name}.svg)`;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <span
        className="block bg-current"
        style={{
          width: 20, height: 20,
          maskImage: url, WebkitMaskImage: url,
          maskSize: "20px 20px", WebkitMaskSize: "20px 20px",
          maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
          maskPosition: "center", WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}
