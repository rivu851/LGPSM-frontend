import React from "react";
import Link from "next/link";
import Navbar from "@/app/navbar/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-[family-name:var(--font-space-grotesk)]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        
        {/* Decorative 404 Badge */}
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#C44200] mb-4">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="#FF5B22" />
          </svg>
          <span>404 ERROR</span>
        </div>

        {/* 404 Heading */}
        <h1 className="text-7xl sm:text-9xl font-extrabold text-[#1C2228] tracking-tight mb-4">
          404
        </h1>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight mb-3">
          Page Not Found
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-[#C65318] hover:bg-[#A83800] text-white font-bold text-sm rounded-md shadow-md transition-all active:scale-95"
          >
            Back to Home
          </Link>
          <Link
            href="/pages/pricing"
            className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-bold text-sm rounded-md transition-all"
          >
            View Pricing
          </Link>
        </div>

      </main>
      <Footer />
    </div>
  );
}
