// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { eventTypeForTemplate } from "./templateEventType.ts";

const cats = [{ value: "c1", label: "General" }, { value: "c2", label: "Corporate Events" }, { value: "c3", label: "Wedding" }, { value: "c4", label: "Social" }];

test("a template made for an event type fills its category and subcategory, whether they arrive as ids or as populated records", () => {
  assert.deepEqual(eventTypeForTemplate({ categoryId: "c2", subcategoryId: "s9" }, cats), { categoryId: "c2", subcategoryId: "s9" });
  assert.deepEqual(eventTypeForTemplate({ categoryId: { _id: "c2", name: "Corporate" }, subcategoryId: { _id: "s9" } }, cats), { categoryId: "c2", subcategoryId: "s9" });
  assert.deepEqual(eventTypeForTemplate({ categoryId: "c2" }, cats), { categoryId: "c2", subcategoryId: "" });
});

test("a template with no event type is matched to a category by the kind of design, and the subcategory is left to the organizer", () => {
  assert.deepEqual(eventTypeForTemplate({ cardDesign: "CORPORATE_V2" }, cats), { categoryId: "c2", subcategoryId: "" });
  assert.deepEqual(eventTypeForTemplate({ cardDesign: "WEDDING" }, cats), { categoryId: "c3", subcategoryId: "" });
  assert.deepEqual(eventTypeForTemplate({ cardDesign: "BIRTHDAY" }, cats), { categoryId: "c4", subcategoryId: "" });
});

test("nothing is guessed when no category clearly fits", () => {
  assert.equal(eventTypeForTemplate({ cardDesign: "CLASSIC" }, cats), null);
  assert.equal(eventTypeForTemplate({ cardDesign: "CUSTOM" }, cats), null);
  assert.equal(eventTypeForTemplate({ cardDesign: "WEDDING" }, [{ value: "c1", label: "General" }]), null);
  assert.equal(eventTypeForTemplate({}, cats), null);
});

test("a subcategory the category no longer has is left empty rather than sent on", () => {
  const subs = (id) => (id === "c2" ? [{ value: "s1", label: "Awards" }] : []);
  assert.deepEqual(eventTypeForTemplate({ categoryId: "c2", subcategoryId: "s1" }, cats, subs), { categoryId: "c2", subcategoryId: "s1" });
  assert.deepEqual(eventTypeForTemplate({ categoryId: "c2", subcategoryId: "old-id" }, cats, subs), { categoryId: "c2", subcategoryId: "" });
  assert.deepEqual(eventTypeForTemplate({ categoryId: "c2", subcategoryId: "s1" }, cats), { categoryId: "c2", subcategoryId: "s1" });
});

test("the picker's own filters decide the event type; a subcategory left on All stays unselected", async () => {
  const { eventTypeForChoice } = await import("./templateEventType.ts");
  const own = { categoryId: "c2", subcategoryId: "s9" };
  // narrowed to Corporate with All subcategories: the template's subcategory is not applied
  assert.deepEqual(eventTypeForChoice(own, "c2", ""), { categoryId: "c2", subcategoryId: "" });
  // a subcategory picked in the picker is used, whatever the template carries
  assert.deepEqual(eventTypeForChoice(own, "c2", "s1"), { categoryId: "c2", subcategoryId: "s1" });
  // a template with no event type of its own still gets the category the organizer narrowed to
  assert.deepEqual(eventTypeForChoice(null, "c2", ""), { categoryId: "c2", subcategoryId: "" });
  // no filter at all: the template's own event type
  assert.deepEqual(eventTypeForChoice(own, "", ""), own);
  assert.equal(eventTypeForChoice(null, "", ""), null);
});
