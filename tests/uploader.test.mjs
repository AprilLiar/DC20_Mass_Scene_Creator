import assert from "node:assert/strict";
import { test } from "node:test";
import { UploadFolder, hashFile, uploadName } from "../scripts/uploader.mjs";

const bytes = (text) => new TextEncoder().encode(text);
const makeFile = (text, name = "map.png") => new File([bytes(text)], name, { type: "image/png" });

test("hashFile is the same for the same bytes and different for different bytes", async () => {
  const a = await hashFile(makeFile("same"));
  assert.match(a, /^[0-9a-f]{8}$/);
  assert.equal(a, await hashFile(makeFile("same", "other-name.png")));
  assert.notEqual(a, await hashFile(makeFile("different")));
});

test("uploadName keeps the name readable, adds the hash and lowercases the extension", () => {
  assert.equal(uploadName("Dark Forest 01.PNG", "3fa9c1d2"), "Dark_Forest_01-3fa9c1d2.png");
  assert.equal(uploadName("map.v2.final.webp", "abcd1234"), "map.v2.final-abcd1234.webp");
});

test("uploadName keeps letters of any script and replaces unsafe characters", () => {
  assert.equal(uploadName("Карта подземелья.webp", "11112222"), "Карта_подземелья-11112222.webp");
  assert.equal(uploadName("a/b?c*d.png", "11112222"), "a_b_c_d-11112222.png");
});

test("uploadName copes with names that have no usable base or no extension", () => {
  assert.equal(uploadName("???.png", "11112222"), "scene-11112222.png");
  assert.equal(uploadName("README", "11112222"), "README-11112222");
  assert.equal(uploadName(".hidden", "11112222"), "hidden-11112222");
});

test("uploadName limits very long names", () => {
  const name = uploadName(`${"x".repeat(300)}.png`, "11112222");
  assert.equal(name, `${"x".repeat(80)}-11112222.png`);
});

/** A stand-in for Foundry's FilePicker that records what it is asked to do. */
function fakePicker({ existing = null, uploadResponse } = {}) {
  const calls = [];
  return {
    calls,
    async browse(source, target) {
      calls.push(["browse", source, target]);
      if (existing === null) throw new Error("Directory does not exist");
      return { files: existing };
    },
    async createDirectory(source, target) {
      calls.push(["createDirectory", source, target]);
    },
    async upload(source, path, file, body, options) {
      calls.push(["upload", source, path, file.name, options]);
      return uploadResponse ?? { status: "success", path: `${path}/${file.name}` };
    }
  };
}

test("prepare creates the folder when it does not exist yet", async () => {
  const picker = fakePicker();
  await new UploadFolder(picker, "worlds/w/mass-scenes").prepare();
  assert.deepEqual(picker.calls, [
    ["browse", "data", "worlds/w/mass-scenes"],
    ["createDirectory", "data", "worlds/w/mass-scenes"]
  ]);
});

test("prepare does not create a folder that exists", async () => {
  const picker = fakePicker({ existing: [] });
  await new UploadFolder(picker, "worlds/w/mass-scenes").prepare();
  assert.deepEqual(picker.calls.map((call) => call[0]), ["browse"]);
});

test("prepare reports a folder that cannot be created", async () => {
  const picker = fakePicker();
  picker.createDirectory = async () => {
    throw new Error("permission denied");
  };
  await assert.rejects(new UploadFolder(picker, "d").prepare(), /permission denied/);
});

test("a new file is uploaded once under its hashed name, silently", async () => {
  const picker = fakePicker({ existing: [] });
  const folder = new UploadFolder(picker, "worlds/w/mass-scenes");
  await folder.prepare();
  const file = makeFile("pixels");
  const path = await folder.ensureUploaded(file);

  const expected = uploadName("map.png", await hashFile(file));
  assert.equal(path, `worlds/w/mass-scenes/${expected}`);
  assert.deepEqual(picker.calls.filter((call) => call[0] === "upload"), [
    ["upload", "data", "worlds/w/mass-scenes", expected, { notify: false }]
  ]);
});

test("identical content is not uploaded twice, even under another file name", async () => {
  const picker = fakePicker({ existing: [] });
  const folder = new UploadFolder(picker, "d");
  await folder.prepare();
  const first = await folder.ensureUploaded(makeFile("pixels", "a.png"));
  const second = await folder.ensureUploaded(makeFile("pixels", "a.png"));
  assert.equal(first, second);
  assert.equal(picker.calls.filter((call) => call[0] === "upload").length, 1);
});

test("different content with the same file name gets its own file", async () => {
  const picker = fakePicker({ existing: [] });
  const folder = new UploadFolder(picker, "d");
  await folder.prepare();
  const first = await folder.ensureUploaded(makeFile("one", "map.png"));
  const second = await folder.ensureUploaded(makeFile("two", "map.png"));
  assert.notEqual(first, second);
  assert.equal(picker.calls.filter((call) => call[0] === "upload").length, 2);
});

test("a file already in the folder from an earlier run is reused with its listed path", async () => {
  const file = makeFile("pixels");
  const name = uploadName("map.png", await hashFile(file));
  const picker = fakePicker({ existing: [`worlds/w/mass-scenes/${encodeURIComponent(name)}`, "worlds/w/mass-scenes/other.png"] });
  const folder = new UploadFolder(picker, "worlds/w/mass-scenes");
  await folder.prepare();
  const path = await folder.ensureUploaded(file);
  assert.equal(path, `worlds/w/mass-scenes/${encodeURIComponent(name)}`);
  assert.equal(picker.calls.filter((call) => call[0] === "upload").length, 0);
});

test("when the upload response has no path the path is built from the folder and name", async () => {
  const picker = fakePicker({ existing: [], uploadResponse: { status: "success" } });
  const folder = new UploadFolder(picker, "d");
  await folder.prepare();
  const file = makeFile("pixels");
  assert.equal(await folder.ensureUploaded(file), `d/${uploadName("map.png", await hashFile(file))}`);
});
