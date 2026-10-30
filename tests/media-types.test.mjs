import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptAttribute, extensionOf, foundryMediaKinds, isIgnoredFile, mediaKind } from "../scripts/media-types.mjs";

const kinds = { image: new Set(["png", "jpg", "webp"]), video: new Set(["webm", "mp4"]) };

test("extensionOf returns the lower-case extension of a name or path", () => {
  assert.equal(extensionOf("Map.PNG"), "png");
  assert.equal(extensionOf("maps/inn/night.v2.webp"), "webp");
  assert.equal(extensionOf("maps\\inn\\night.jpg"), "jpg");
});

test("extensionOf is empty without a real extension", () => {
  assert.equal(extensionOf("README"), "");
  assert.equal(extensionOf(".hidden"), "");
  assert.equal(extensionOf("trailing."), "");
});

test("mediaKind tells images from videos and rejects everything else", () => {
  assert.equal(mediaKind("a/b/Map.PNG", kinds), "image");
  assert.equal(mediaKind("intro.webm", kinds), "video");
  assert.equal(mediaKind("notes.txt", kinds), null);
  assert.equal(mediaKind("noextension", kinds), null);
});

test("hidden files and OS leftovers are ignored", () => {
  assert.equal(isIgnoredFile(".DS_Store"), true);
  assert.equal(isIgnoredFile("maps/Thumbs.db"), true);
  assert.equal(isIgnoredFile("desktop.ini"), true);
  assert.equal(isIgnoredFile("maps/real.png"), false);
});

test("acceptAttribute lists every extension with a dot", () => {
  assert.equal(acceptAttribute(kinds), ".png,.jpg,.webp,.webm,.mp4");
});

test("foundryMediaKinds reads Foundry's constants", () => {
  globalThis.CONST = {
    IMAGE_FILE_EXTENSIONS: { png: "image/png", jpg: "image/jpeg" },
    VIDEO_FILE_EXTENSIONS: { webm: "video/webm" }
  };
  try {
    const result = foundryMediaKinds();
    assert.deepEqual([...result.image], ["png", "jpg"]);
    assert.deepEqual([...result.video], ["webm"]);
  } finally {
    delete globalThis.CONST;
  }
});
