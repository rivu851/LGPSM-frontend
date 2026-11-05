// A template is made for an event type (category and subcategory); choosing it fills those two fields in the event. Templates
// that carry no event type of their own (a general template, an AI-made or uploaded one) are matched to a category from the
// kind of design they are, when one of the event categories clearly fits. When nothing fits, nothing is guessed.

interface TemplateLike {
  categoryId?: unknown;
  subcategoryId?: unknown;
  cardDesign?: string;
}
interface CategoryOption { value: string; label: string }

const idOf = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "_id" in (v as object)) return String((v as { _id: unknown })._id || "");
  return "";
};

// words a category name may contain, by the kind of card design
const DESIGN_WORDS: Record<string, string[]> = {
  CORPORATE_V1: ["corporate", "business", "conference", "seminar", "company"],
  CORPORATE_V2: ["corporate", "business", "conference", "seminar", "company"],
  WEDDING: ["wedding", "marriage"],
  BIRTHDAY: ["birthday", "party", "social"],
  RICE_CEREMONY: ["rice", "annaprasan", "annaprashan", "baby", "social", "family"],
};

export function eventTypeForTemplate(
  t: TemplateLike,
  categories: CategoryOption[],
  /** When given, a subcategory the category no longer has (renamed or re-saved since the template was made) is left empty instead of sent on */
  subcategoryOptionsFor?: (categoryId: string) => CategoryOption[]
): { categoryId: string; subcategoryId: string } | null {
  const categoryId = idOf(t.categoryId);
  if (categoryId) {
    const sub = idOf(t.subcategoryId);
    const known = !subcategoryOptionsFor || subcategoryOptionsFor(categoryId).some((o) => o.value === sub);
    return { categoryId, subcategoryId: sub && known ? sub : "" };
  }
  const words = DESIGN_WORDS[t.cardDesign || ""];
  if (!words) return null;
  const match = words.map((w) => categories.find((c) => c.label.toLowerCase().includes(w))).find(Boolean);
  return match ? { categoryId: match.value, subcategoryId: "" } : null;
}

/**
 * What the event's category and subcategory become when a template is chosen in the picker. What the organizer set in the picker's
 * own filters wins: a category they narrowed to is the event's category, and a subcategory only when they picked one. With the
 * subcategory left on "All", it stays unselected: that template may be offered under several subcategories, and the organizer has
 * not said which one this event is. With no filter at all, the template's own event type is used.
 */
export function eventTypeForChoice(
  own: { categoryId: string; subcategoryId: string } | null,
  filterCategory: string,
  filterSubcategory: string
): { categoryId: string; subcategoryId: string } | null {
  if (filterCategory) return { categoryId: filterCategory, subcategoryId: filterSubcategory };
  return own;
}
