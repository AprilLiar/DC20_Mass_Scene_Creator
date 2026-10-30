import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRelease, bumpPatch, releaseUrls } from "../.github/scripts/release-lib.mjs";

test("bumpPatch increments only the patch number", () => {
  assert.equal(bumpPatch("0.0.0"), "0.0.1");
  assert.equal(bumpPatch("1.2.9"), "1.2.10");
});

test("bumpPatch rejects versions that are not plain x.y.z", () => {
  assert.throws(() => bumpPatch("1.2"), /Not a plain/);
  assert.throws(() => bumpPatch("1.2.3-beta"), /Not a plain/);
  assert.throws(() => bumpPatch(""), /Not a plain/);
});

test("releaseUrls builds the latest manifest URL and the versioned download URL", () => {
  assert.deepEqual(releaseUrls("Owner/Repo", "1.2.3"), {
    manifest: "https://github.com/Owner/Repo/releases/latest/download/module.json",
    download: "https://github.com/Owner/Repo/releases/download/v1.2.3/module.zip"
  });
});

test("applyRelease updates version and URLs and keeps the other fields", () => {
  const result = applyRelease({ id: "x", version: "0.0.0", manifest: "old", download: "old" }, "Owner/Repo", "0.0.1");
  assert.equal(result.id, "x");
  assert.equal(result.version, "0.0.1");
  assert.ok(result.download.endsWith("/v0.0.1/module.zip"));
});
