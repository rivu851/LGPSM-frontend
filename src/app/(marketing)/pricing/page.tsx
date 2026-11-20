import React from "react";
import type { Metadata } from "next";
import TopBanner from "@/components/TopBanner";
import Navbar from "@/app/navbar/Navbar";
import PricingSection from "@/components/PricingSection";
import PricingFaqSection from "@/components/PricingFaqSection";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { publicPageMetadata } from "@/utils/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Pricing",
  description:
    "Compare the Standard, Professional and Enterprise plans for EventQRapp QR-based digital invitations and event management.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-white">
        <TopBanner />
        <Navbar />
        <main className="flex-1">
          <PricingSection />
          <PricingFaqSection />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
