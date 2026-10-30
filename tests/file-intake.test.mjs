import assert from "node:assert/strict";
import { test } from "node:test";
import { collectDropped, itemsFromFileList, walkEntry } from "../scripts/file-intake.mjs";

function fileEntry(fullPath, file = { name: fullPath.split("/").pop() }) {
  return { isFile: true, isDirectory: false, fullPath, file: (resolve) => resolve(file) };
}

/** A folder whose reader hands out `batchSize` entries per call, like a real browser does. */
function dirEntry(fullPath, children, batchSize = 2) {
  return {
    isFile: false,
    isDirectory: true,
    fullPath,
    createReader() {
      let next = 0;
      return {
        readEntries(resolve) {
          resolve(children.slice(next, next + batchSize));
          next += batchSize;
        }
      };
    }
  };
}

const paths = (items) => items.map((entry) => entry.path).sort();

test("walkEntry returns a single dropped file with its path", async () => {
  const items = await walkEntry(fileEntry("/map.png"));
  assert.deepEqual(paths(items), ["map.png"]);
});

test("walkEntry reads sub-folders recursively and keeps the folder names", async () => {
  const tree = dirEntry("/Maps", [
    fileEntry("/Maps/a.png"),
    dirEntry("/Maps/Inn", [fileEntry("/Maps/Inn/night.webp"), dirEntry("/Maps/Inn/Cellar", [fileEntry("/Maps/Inn/Cellar/b.png")])]),
    fileEntry("/Maps/c.png")
  ]);
  assert.deepEqual(paths(await walkEntry(tree)), [
    "Maps/Inn/Cellar/b.png",
    "Maps/Inn/night.webp",
    "Maps/a.png",
    "Maps/c.png"
  ]);
});

test("walkEntry keeps reading until the reader is empty, not just the first batch", async () => {
  const files = Array.from({ length: 7 }, (_, index) => fileEntry(`/Big/f${index}.png`));
  const items = await walkEntry(dirEntry("/Big", files, 3));
  assert.equal(items.length, 7);
});

test("walkEntry passes on the File object the browser provides", async () => {
  const file = { name: "x.png", size: 42 };
  const [item] = await walkEntry(fileEntry("/x.png", file));
  assert.equal(item.file, file);
});

test("walkEntry ignores entries that are neither files nor folders", async () => {
  assert.deepEqual(await walkEntry({ isFile: false, isDirectory: false }), []);
});

test("itemsFromFileList uses the folder path when a folder was picked and the name otherwise", () => {
  const items = itemsFromFileList([
    { name: "a.png", webkitRelativePath: "Maps/a.png" },
    { name: "b.png", webkitRelativePath: "" }
  ]);
  assert.deepEqual(items.map((entry) => entry.path), ["Maps/a.png", "b.png"]);
});

test("collectDropped asks for the entries before anything is awaited", async () => {
  let asked = 0;
  const dataTransfer = {
    items: [
      {
        kind: "file",
        webkitGetAsEntry() {
          asked += 1;
          return fileEntry("/a.png");
        }
      }
    ],
    files: []
  };
  const pending = collectDropped(dataTransfer);
  assert.equal(asked, 1);
  assert.deepEqual(paths(await pending), ["a.png"]);
});

test("collectDropped collects folders and files from the same drop", async () => {
  const dataTransfer = {
    items: [
      { kind: "file", webkitGetAsEntry: () => dirEntry("/Maps", [fileEntry("/Maps/a.png")]) },
      { kind: "file", webkitGetAsEntry: () => fileEntry("/loose.jpg") },
      { kind: "string", webkitGetAsEntry: () => null }
    ],
    files: []
  };
  assert.deepEqual(paths(await collectDropped(dataTransfer)), ["Maps/a.png", "loose.jpg"]);
});

test("collectDropped falls back to the plain file list when entries are not available", async () => {
  const dataTransfer = {
    items: [{ kind: "file", webkitGetAsEntry: () => null }],
    files: [{ name: "a.png", webkitRelativePath: "" }]
  };
  assert.deepEqual(paths(await collectDropped(dataTransfer)), ["a.png"]);
});
