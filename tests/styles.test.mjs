import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { stylesheetPath } from "../scripts/styles.mjs";

const root = new URL("../", import.meta.url);

test("the stylesheet URL changes with the module version", () => {
  assert.equal(stylesheetPath("0.0.8"), "modules/multi-scene/styles/multi-scene.css?v=0.0.8");
  assert.notEqual(stylesheetPath("0.0.8"), stylesheetPath("0.0.9"));
});

test("the stylesheet file exists", () => {
  assert.ok(existsSync(new URL("styles/multi-scene.css", root)));
});

test("the manifest does not list the stylesheet, which would be cached across updates", () => {
  const manifest = JSON.parse(readFileSync(new URL("module.json", root), "utf8"));
  assert.equal("styles" in manifest, false);
});
