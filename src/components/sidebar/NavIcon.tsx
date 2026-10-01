import React from "react";

// Renders a Figma icon asset tinted with the current text colour (so active items turn orange)
export default function NavIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  const url = `url(/icons/nav/${name}.svg)`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ maskImage: url, WebkitMaskImage: url, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
    />
  );
}
