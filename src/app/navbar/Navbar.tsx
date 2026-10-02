"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-gray-100/60 sticky top-0 z-50">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo using Logo.png asset */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/navbar/Nav_logo.webp"
              alt="LGPSM Logo"
              width={240}
              height={80}
              priority
              className="h-10 sm:h-14 w-auto object-contain"
            />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              href="/features"
              className="text-sm font-semibold text-gray-700 hover:text-[#FF5B22] transition-colors font-[family-name:var(--font-space-grotesk)]"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-gray-700 hover:text-[#FF5B22] transition-colors font-[family-name:var(--font-space-grotesk)]"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold text-gray-700 hover:text-[#FF5B22] transition-colors font-[family-name:var(--font-space-grotesk)]"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/signin?mode=organizer"
            className="text-sm font-semibold text-gray-700 hover:text-[#FF5B22] px-3 py-2 transition-colors font-[family-name:var(--font-space-grotesk)]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#dd5c1b] hover:bg-[#A83800] rounded-md shadow-sm transition-all active:scale-95 font-[family-name:var(--font-space-grotesk)]"
          >
            Sign Up Free
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 text-gray-600 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-6 space-y-3 font-[family-name:var(--font-space-grotesk)]">
          <Link href="/features" className="block py-2 text-sm font-semibold text-gray-700">Features</Link>
          <Link href="/pricing" className="block py-2 text-sm font-semibold text-gray-700">Pricing</Link>
          <Link href="/contact" className="block py-2 text-sm font-semibold text-gray-700">Contact</Link>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/signin?mode=organizer" className="w-full text-center py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg">Sign In</Link>
            <Link href="/signup" className="w-full text-center py-2.5 text-sm font-bold text-white bg-[#dd5c1b] hover:bg-[#A83800] rounded-lg">Sign Up Free</Link>
          </div>
        </div>
      )}
    </header>
  );
}
