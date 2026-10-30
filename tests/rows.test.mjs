import assert from "node:assert/strict";
import { test } from "node:test";
import { addItems, sortItems } from "../scripts/rows.mjs";

const kinds = { image: new Set(["png", "jpg"]), video: new Set(["webm"]) };

const item = (path, size = 1, lastModified = 1) => ({ path, file: { name: path.split("/").pop(), size, lastModified } });

function counter() {
  let id = 0;
  return () => ++id;
}

test("items are sorted by path with numbers compared as numbers", () => {
  const sorted = sortItems([item("map10.png"), item("map2.png"), item("Map1.png")]);
  assert.deepEqual(sorted.map((entry) => entry.path), ["Map1.png", "map2.png", "map10.png"]);
});

test("new rows get a kind, an id and a prettified name", () => {
  const { rows, added } = addItems([], [item("Maps/Dark_Forest-01.png"), item("intro.webm")], kinds, counter());
  assert.deepEqual(rows.map((row) => [row.id, row.kind, row.name]), [
    [1, "video", "intro"],
    [2, "image", "Dark Forest 01"]
  ]);
  assert.equal(added.length, 2);
});

test("unsupported files are counted and left out", () => {
  const result = addItems([], [item("a.png"), item("notes.txt"), item("b.pdf")], kinds, counter());
  assert.equal(result.rows.length, 1);
  assert.equal(result.unsupported, 2);
});

test("hidden files and OS leftovers are left out without being counted", () => {
  const result = addItems([], [item("a.png"), item(".DS_Store"), item("Thumbs.db")], kinds, counter());
  assert.equal(result.rows.length, 1);
  assert.equal(result.unsupported, 0);
});

test("a second drop is appended after the existing rows, which keep their edits", () => {
  const nextId = counter();
  const first = addItems([], [item("b.png"), item("c.png")], kinds, nextId);
  first.rows[0].name = "My own name";
  const second = addItems(first.rows, [item("a.png")], kinds, nextId);
  assert.deepEqual(second.rows.map((row) => row.path), ["b.png", "c.png", "a.png"]);
  assert.equal(second.rows[0].name, "My own name");
  assert.equal(second.added.length, 1);
});

test("exact repeats are skipped and counted", () => {
  const nextId = counter();
  const first = addItems([], [item("a.png", 10, 5)], kinds, nextId);
  const second = addItems(first.rows, [item("a.png", 10, 5), item("a.png", 10, 5)], kinds, nextId);
  assert.equal(second.rows.length, 1);
  assert.equal(second.duplicates, 2);
});

test("the same path with a different size or date is a different file", () => {
  const nextId = counter();
  const first = addItems([], [item("a.png", 10, 5)], kinds, nextId);
  const second = addItems(first.rows, [item("a.png", 11, 5), item("a.png", 10, 6)], kinds, nextId);
  assert.equal(second.rows.length, 3);
  assert.equal(second.duplicates, 0);
});

test("the original list is not modified", () => {
  const rows = [];
  addItems(rows, [item("a.png")], kinds, counter());
  assert.equal(rows.length, 0);
});
