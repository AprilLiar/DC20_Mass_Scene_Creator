import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("module.json", root), "utf8"));

test("manifest identifies the module", () => {
  assert.equal(manifest.id, "multi-scene");
  assert.equal(manifest.title, "Multi-Scene");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test("manifest targets Foundry v14 and is system agnostic", () => {
  assert.equal(manifest.compatibility.minimum, "14");
  assert.equal(manifest.system, undefined);
  assert.equal(manifest.relationships?.systems, undefined);
  assert.equal(manifest.relationships?.requires, undefined);
});

test("every file the manifest references exists", () => {
  const paths = [
    ...manifest.esmodules,
    ...manifest.styles,
    ...manifest.languages.map((language) => language.path)
  ];
  for (const path of paths) assert.ok(existsSync(new URL(path, root)), `missing file: ${path}`);
});

test("language files are valid JSON with a MULTISCENE namespace", () => {
  for (const language of manifest.languages) {
    const strings = JSON.parse(readFileSync(new URL(language.path, root), "utf8"));
    assert.equal(typeof strings.MULTISCENE, "object", language.path);
  }
});

test("release URLs match the version", () => {
  assert.match(manifest.manifest, /\/releases\/latest\/download\/module\.json$/);
  assert.ok(manifest.download.endsWith(`/releases/download/v${manifest.version}/module.zip`));
});
