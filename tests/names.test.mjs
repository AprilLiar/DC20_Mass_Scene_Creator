import assert from "node:assert/strict";
import { test } from "node:test";
import { prettifyName } from "../scripts/names.mjs";

test("underscores and dashes become spaces and the extension is removed", () => {
  assert.equal(prettifyName("Dark_Forest-01.webp"), "Dark Forest 01");
});

test("folders are dropped, with either kind of slash", () => {
  assert.equal(prettifyName("maps/inn/Tavern_Night.jpg"), "Tavern Night");
  assert.equal(prettifyName("maps\\inn\\Tavern_Night.jpg"), "Tavern Night");
});

test("repeated separators and surrounding spaces collapse", () => {
  assert.equal(prettifyName("  spaced___out -- name .png"), "spaced out name");
});

test("only the last extension is removed and letter case is kept", () => {
  assert.equal(prettifyName("Map.v2.FINAL.png"), "Map.v2.FINAL");
});

test("a name without extension is kept", () => {
  assert.equal(prettifyName("Castle"), "Castle");
});

test("a name that would become empty falls back to the raw name", () => {
  assert.equal(prettifyName("-_-.png"), "-_-");
  assert.equal(prettifyName(".png"), ".png");
});
