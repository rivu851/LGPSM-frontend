// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { dietaryAnswer, dietaryQuestionTitles } from "./dietaryAnswers.ts";

const two = { enabled: true, title: "Parcel Preference", options: [{ title: "Parcel Preference", options: ["Veg Parcel", "Non-Veg Parcel"] }, { title: "Drinks Preference", options: ["Coffee", "Tea"] }] };

test("every question added in settings becomes a column, by its own title", () => {
  assert.deepEqual(dietaryQuestionTitles(two), ["Parcel Preference", "Drinks Preference"]);
  assert.deepEqual(dietaryQuestionTitles({ enabled: true, title: "Meal", options: ["Veg", "Non-Veg"] }), ["Meal"]);
  assert.deepEqual(dietaryQuestionTitles({ enabled: true, options: ["Veg"] }), ["Dietary Preference"]);
});

test("no columns when the event asks nothing, and a question with no options is not asked", () => {
  assert.deepEqual(dietaryQuestionTitles({ enabled: false, options: ["Veg"] }), []);
  assert.deepEqual(dietaryQuestionTitles(null), []);
  assert.deepEqual(dietaryQuestionTitles({ enabled: true, options: [{ title: "Empty", options: [" "] }, { title: "Meal", options: ["Veg"] }] }), ["Meal"]);
});

test("each column shows the option the guest chose for that question, and follows a changed answer", () => {
  const titles = dietaryQuestionTitles(two);
  const first = { dietarySelections: [{ title: "Parcel Preference", value: "Non-Veg Parcel" }, { title: "Drinks Preference", value: "Coffee" }] };
  assert.equal(dietaryAnswer(first, "Parcel Preference", titles), "Non-Veg Parcel");
  assert.equal(dietaryAnswer(first, "Drinks Preference", titles), "Coffee");
  const second = { dietarySelections: [{ title: "Parcel Preference", value: "Veg Parcel" }, { title: "Drinks Preference", value: "Cold Coffee" }] };
  assert.equal(dietaryAnswer(second, "Drinks Preference", titles), "Cold Coffee");
});

test("a guest who has not answered shows nothing, and older saved answers are still read", () => {
  const titles = dietaryQuestionTitles(two);
  assert.equal(dietaryAnswer({}, "Parcel Preference", titles), "");
  assert.equal(dietaryAnswer({ dietaryPreference: "Parcel Preference: Veg Parcel · Drinks Preference: Tea" }, "Drinks Preference", titles), "Tea");
  assert.equal(dietaryAnswer({ dietaryPreference: "Veg" }, "Meal", ["Meal"]), "Veg");
  assert.equal(dietaryAnswer({ dietaryPreference: "Vegetarian please" }, "Parcel Preference", titles), "");
});
