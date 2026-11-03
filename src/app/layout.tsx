import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { Inter, Space_Grotesk, Caveat } from "next/font/google";
import "@/styles/globals.scss";
import { AuthProvider } from "@/context/AuthContext";
import { AlertProvider } from "@/context/AlertContext";
import { PageTitleProvider } from "@/context/PageTitleContext";
import SmoothScrollProvider from "@/components/common/SmoothScrollProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/constants/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Both are variable fonts: leaving `weight` out serves one file covering every weight, instead of one file per weight.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Only the handwritten accent on the pricing section uses this, so it is not preloaded on every page; the browser fetches it
// when that text is first drawn.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  preload: false,
});

const DEFAULT_TITLE = "LGPSM · Digital Invitations & Event Management";
const SOCIAL_IMAGE = {
  url: "/images/home/top_hero.webp",
  width: 1713,
  height: 918,
  alt: "LGPSM digital invitations and event management",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · LGPSM",
  },
  description: `LGPSM - ${SITE_DESCRIPTION}`,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// Every signed-in page talks to the API straight away; opening the connection (DNS, TLS) while the page is still loading
// takes that wait off the first request.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend.onrender.com").origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (API_ORIGIN) preconnect(API_ORIGIN, { crossOrigin: "anonymous" });
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${caveat.variable} h-full antialiased`}
    >
      {/* Browser extensions (e.g. security/ad-block tools) add attributes to <body> before hydration; ignore those on this element only */}
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans bg-white text-gray-900 selection:bg-[#FF5B22] selection:text-white">
        <AuthProvider>
          <AlertProvider>
            <PageTitleProvider>
              <SmoothScrollProvider>{children}</SmoothScrollProvider>
            </PageTitleProvider>
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
