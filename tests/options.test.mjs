import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OPTIONS, applyOptions, defaultValues } from "../scripts/options/index.mjs";
import { paddingFraction } from "../scripts/options/padding.mjs";
import { buildTransitionChoices, pickDefaultTransition } from "../scripts/options/scene-transition.mjs";

const byId = Object.fromEntries(OPTIONS.map((option) => [option.id, option]));

const env = {
  localize: (key) => key.replace("TRANSITION.", ""),
  foundryDefaultId: "fade",
  sceneTransitions: {
    fade: { id: "fade", label: "TRANSITION.Fade" },
    wind: { id: "wind", label: "TRANSITION.Wind" },
    swirl: { id: "swirl", label: "TRANSITION.Swirl" }
  }
};

function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

test("option ids are unique", () => {
  assert.equal(new Set(OPTIONS.map((option) => option.id)).size, OPTIONS.length);
});

test("every option label and hint exists in lang/en.json", () => {
  const strings = new Set(flatten(JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"))));
  for (const option of OPTIONS) {
    assert.ok(strings.has(option.label), option.label);
    assert.ok(strings.has(option.hint), option.hint);
  }
});

test("defaults match the agreed design", () => {
  assert.deepEqual(defaultValues(env), {
    disableVision: true,
    disableGrid: true,
    autoBackgroundColor: true,
    sceneTransition: "wind",
    padding: 0,
    sceneFolder: "",
    showInNavigation: false
  });
});

test("Disable Vision sets tokenVision to false only when checked", () => {
  const on = {};
  byId.disableVision.apply(on, true);
  assert.equal(on.tokenVision, false);
  const off = {};
  byId.disableVision.apply(off, false);
  assert.equal("tokenVision" in off, false);
});

test("Disable Grid sets the grid type to gridless and keeps other grid fields", () => {
  const on = { grid: { size: 140 } };
  byId.disableGrid.apply(on, true);
  assert.deepEqual(on.grid, { size: 140, type: 0 });
  const off = {};
  byId.disableGrid.apply(off, false);
  assert.equal("grid" in off, false);
});

test("Disable Grid prefers Foundry's own constant when it exists", () => {
  globalThis.CONST = { GRID_TYPES: { GRIDLESS: 7 } };
  try {
    const sceneData = {};
    byId.disableGrid.apply(sceneData, true);
    assert.equal(sceneData.grid.type, 7);
  } finally {
    delete globalThis.CONST;
  }
});

test("automatic background color uses the sampled color", async () => {
  const on = {};
  await byId.autoBackgroundColor.apply(on, true, { getDominantColor: async () => "#336699" });
  assert.equal(on.backgroundColor, "#336699");
});

test("automatic background color leaves the Scene alone when off or when nothing was sampled", async () => {
  const context = { getDominantColor: async () => "#336699" };
  const off = {};
  await byId.autoBackgroundColor.apply(off, false, context);
  assert.equal("backgroundColor" in off, false);
  const none = {};
  await byId.autoBackgroundColor.apply(none, true, { getDominantColor: async () => null });
  assert.equal("backgroundColor" in none, false);
});

test("transition choices come from the registry and Wind is the default", () => {
  const choices = buildTransitionChoices(env.sceneTransitions, env.localize);
  assert.deepEqual(choices.map((choice) => choice.value), ["fade", "wind", "swirl"]);
  assert.deepEqual(pickDefaultTransition(choices, "fade"), { value: "wind", found: true });
});

test("Wind is also found by its label", () => {
  const choices = [{ value: "abc123", label: "Wind" }];
  assert.deepEqual(pickDefaultTransition(choices, "fade"), { value: "abc123", found: true });
});

test("without Wind the default falls back to Foundry's default, then the first entry", () => {
  const choices = [{ value: "swirl", label: "Swirl" }, { value: "fade", label: "Fade" }];
  assert.deepEqual(pickDefaultTransition(choices, "fade"), { value: "fade", found: false });
  assert.deepEqual(pickDefaultTransition(choices, "missing"), { value: "swirl", found: false });
  assert.deepEqual(pickDefaultTransition([], "fade"), { value: "", found: false });
});

test("the transition option sets only the type and keeps duration settings", () => {
  const sceneData = { transition: { duration: 3 } };
  byId.sceneTransition.apply(sceneData, "wind");
  assert.deepEqual(sceneData.transition, { duration: 3, type: "wind" });
  const untouched = {};
  byId.sceneTransition.apply(untouched, "");
  assert.equal("transition" in untouched, false);
});

test("padding converts percent to a fraction and clamps it", () => {
  assert.equal(paddingFraction(0), 0);
  assert.equal(paddingFraction(25), 0.25);
  assert.equal(paddingFraction(-5), 0);
  assert.equal(paddingFraction(80), 0.5);
  assert.equal(paddingFraction("abc"), 0);
});

test("padding is always written, so 0 overrides Foundry's default", () => {
  const sceneData = {};
  byId.padding.apply(sceneData, 0);
  assert.equal(sceneData.padding, 0);
});

test("the folder option sets the folder only when one is chosen", () => {
  const chosen = {};
  byId.sceneFolder.apply(chosen, "folderId");
  assert.equal(chosen.folder, "folderId");
  const none = {};
  byId.sceneFolder.apply(none, "");
  assert.equal("folder" in none, false);
});

test("the navigation option always writes an explicit value", () => {
  const shown = {};
  byId.showInNavigation.apply(shown, true);
  assert.equal(shown.navigation, true);
  const hidden = {};
  byId.showInNavigation.apply(hidden, false);
  assert.equal(hidden.navigation, false);
});

test("applyOptions runs every option on the Scene data", async () => {
  const sceneData = { name: "Test" };
  const values = { ...defaultValues(env), sceneFolder: "f1", padding: 10 };
  await applyOptions(sceneData, values, { getDominantColor: async () => "#102030" });
  assert.deepEqual(sceneData, {
    name: "Test",
    tokenVision: false,
    grid: { type: 0 },
    backgroundColor: "#102030",
    transition: { type: "wind" },
    padding: 0.1,
    folder: "f1",
    navigation: false
  });
});
