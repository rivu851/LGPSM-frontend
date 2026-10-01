import { API_BASE_URL } from "@/services/apiClient";

// Stored image references are external URLs, site paths ("/images/..."), or "media:<id>" for images
// uploaded through the API. Returns something an <img> can load, or null when there is no image.
export function resolveImageUrl(key?: string | null): string | null {
  if (!key) return null;
  const media = /^media:([0-9a-fA-F]{24})$/.exec(key);
  if (media) return `${API_BASE_URL}/api/v1/media/${media[1]}`;
  if (key.startsWith("https://") || key.startsWith("http://") || key.startsWith("/") || key.startsWith("blob:")) return key;
  return null;
}
