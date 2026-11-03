// The questions an event asks on the digital access card, and what a guest answered. A question's title comes from the event's
// settings, and the answer from the guest's own choice on their invitation.

interface PreferenceLike { enabled?: boolean; title?: string; options?: unknown[] }
interface GuestLike { dietaryPreference?: string; dietarySelections?: { title: string; value: string }[] }

const DEFAULT_TITLE = "Dietary Preference";

/** The question titles, in the order they were added (the same rule the server uses to accept answers) */
export function dietaryQuestionTitles(preference?: PreferenceLike | null): string[] {
  if (!preference?.enabled || !Array.isArray(preference.options)) return [];
  const clean = (v: unknown) => String(v).trim();
  const groups = preference.options.filter((o): o is { title?: string; options?: unknown[] } => !!o && typeof o === "object" && !Array.isArray(o));
  if (groups.length) {
    return groups
      .filter((g) => Array.isArray(g.options) && g.options.map(clean).some(Boolean))
      .map((g) => clean(g.title || preference.title || DEFAULT_TITLE));
  }
  return preference.options.map(clean).some(Boolean) ? [clean(preference.title || DEFAULT_TITLE)] : [];
}

/** What this guest chose for one question, or "" when they have not answered it */
export function dietaryAnswer(guest: GuestLike, title: string, titles: string[]): string {
  const selected = guest.dietarySelections?.find((s) => s.title === title);
  if (selected) return selected.value;
  // Answers saved before the choices were stored one by one: "Title: value · Title: value", or just the value for a single question
  const text = guest.dietaryPreference?.trim();
  if (!text) return "";
  const prefix = `${title}: `;
  const piece = text.split(" · ").find((p) => p.startsWith(prefix));
  if (piece) return piece.slice(prefix.length);
  return titles.length === 1 ? text : "";
}
