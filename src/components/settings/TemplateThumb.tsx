import React from "react";
import Image from "next/image";
import { resolveImageUrl } from "@/utils/mediaUrl";

// Renders a template's stored image, or an explicit "no image" state instead of a stand-in picture
export default function TemplateThumb({ imageKey, name, className = "" }: { imageKey: string | null | undefined; name: string; className?: string }) {
  const src = resolveImageUrl(imageKey);
  return (
    <div className={`relative w-full aspect-[3/4] bg-[#F4F5F8] overflow-hidden ${className}`}>
      {src ? (
        <Image src={src} alt={name} fill unoptimized sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#828282] text-xs text-center px-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          No preview image
        </div>
      )}
    </div>
  );
}
