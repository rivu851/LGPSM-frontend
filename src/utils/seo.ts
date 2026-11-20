import type { Metadata } from "next";
import { SITE_NAME } from "@/constants/site";

const SOCIAL_IMAGE = {
  url: "/images/home/top_hero.webp",
  width: 1713,
  height: 918,
  alt: "EventQRapp digital invitations and event management",
};

// Metadata for an indexable public page: unique title/description, self-referencing canonical,
// and complete Open Graph/Twitter data (Next.js replaces, not merges, nested openGraph objects).
export function publicPageMetadata({
  title,
  description,
  path,
  absolute = false,
}: {
  title: string;
  description: string;
  path: string;
  // true: use the title as-is instead of applying the "%s · EventQRapp" template (home page)
  absolute?: boolean;
}): Metadata {
  const socialTitle = absolute ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url: path,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

// Metadata for pages that should stay out of search results (auth flows, token links).
export function noIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: { index: false, follow: false },
  };
}
