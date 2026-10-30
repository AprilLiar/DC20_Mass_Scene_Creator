import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultValues } from "../scripts/options/index.mjs";
import { NEW_FOLDER } from "../scripts/options/scene-folder.mjs";
import { buildSceneData, checkRun, createScenes } from "../scripts/scene-builder.mjs";

const env = {
  localize: (key) => key,
  foundryDefaultId: "fade",
  sceneTransitions: { fade: { id: "fade", label: "Fade" }, wind: { id: "wind", label: "Wind" } },
  folders: []
};
const values = defaultValues(env);
const row = (name, path = `Maps/${name}.png`) => ({ id: 1, name, path, kind: "image", file: { name: `${name}.png` } });

/** Fake Foundry calls that record what happened. */
function fakeDeps(overrides = {}) {
  const log = [];
  return {
    log,
    prepareUploads: async () => log.push("prepare"),
    createFolder: async (name) => {
      log.push(`folder:${name}`);
      return { id: "newFolderId" };
    },
    loadMedia: async (r) => ({ width: 800, height: 600, source: r.name, dispose: () => log.push(`dispose:${r.name}`) }),
    ensureUploaded: async (file) => `uploads/${file.name}`,
    sampleColor: (media) => `#color-of-${media.source}`,
    createScene: async (data) => {
      log.push(`scene:${data.name}`);
      return { id: `id-${data.name}`, data };
    },
    ...overrides
  };
}

const options = (extra = {}) => ({ values, newFolderName: "", shouldStop: () => false, onProgress: () => {}, ...extra });

test("checkRun needs at least one row", () => {
  assert.equal(checkRun({ rows: [], values, newFolderName: "" }), "MULTISCENE.Run.NoRows");
  assert.equal(checkRun({ rows: [row("a")], values, newFolderName: "" }), null);
});

test("checkRun needs a name when New folder is chosen", () => {
  const withNew = { ...values, sceneFolder: NEW_FOLDER };
  assert.equal(checkRun({ rows: [row("a")], values: withNew, newFolderName: "  " }), "MULTISCENE.Run.FolderNameRequired");
  assert.equal(checkRun({ rows: [row("a")], values: withNew, newFolderName: "Batch" }), null);
});

test("buildSceneData has the name, a background Level, the media size and the option results", async () => {
  const data = await buildSceneData(row("Inn"), "uploads/inn.png", { width: 800, height: 600 }, values, {
    getDominantColor: async () => "#102030"
  });
  assert.deepEqual(data, {
    name: "Inn",
    levels: [{ background: { src: "uploads/inn.png" } }],
    width: 800,
    height: 600,
    tokenVision: false,
    grid: { type: 0 },
    backgroundColor: "#102030",
    transition: { type: "wind" },
    padding: 0,
    navigation: false
  });
});

test("buildSceneData trims the name and falls back to the file name when it is empty", async () => {
  const media = { width: 1, height: 1 };
  const context = { getDominantColor: async () => null };
  assert.equal((await buildSceneData(row("  Spaced  "), "p", media, values, context)).name, "Spaced");
  assert.equal((await buildSceneData(row("   ", "Maps/Dark_Forest.png"), "p", media, values, context)).name, "Dark Forest");
});

test("createScenes makes one Scene per row, in order, with the color of each picture", async () => {
  const deps = fakeDeps();
  const result = await createScenes({ rows: [row("A"), row("B")], ...options() }, deps);
  assert.deepEqual(deps.log.filter((entry) => entry.startsWith("scene:")), ["scene:A", "scene:B"]);
  assert.equal(result.created.length, 2);
  assert.equal(result.created[0].scene.data.backgroundColor, "#color-of-A");
  assert.equal(result.created[1].scene.data.backgroundColor, "#color-of-B");
  assert.deepEqual([result.failures.length, result.stopped], [0, false]);
});

test("the upload folder is prepared before the first row", async () => {
  const deps = fakeDeps();
  await createScenes({ rows: [row("A")], ...options() }, deps);
  assert.equal(deps.log[0], "prepare");
});

test("a failing row is recorded and the other rows are still created", async () => {
  const deps = fakeDeps({
    ensureUploaded: async (file) => {
      if (file.name === "B.png") throw new Error("upload refused");
      return `uploads/${file.name}`;
    }
  });
  const result = await createScenes({ rows: [row("A"), row("B"), row("C")], ...options() }, deps);
  assert.deepEqual(result.created.map((entry) => entry.row.name), ["A", "C"]);
  assert.deepEqual(result.failures.map((failure) => [failure.row.name, failure.reason]), [["B", "upload refused"]]);
});

test("a picture that cannot be read fails only its own row", async () => {
  const deps = fakeDeps({
    loadMedia: async (r) => {
      if (r.name === "Broken") throw new Error("not a picture");
      return { width: 10, height: 10, source: r.name, dispose: () => deps.log.push(`dispose:${r.name}`) };
    }
  });
  const result = await createScenes({ rows: [row("Broken"), row("Fine")], ...options() }, deps);
  assert.deepEqual(result.created.map((entry) => entry.row.name), ["Fine"]);
  assert.equal(result.failures[0].reason, "not a picture");
});

test("loaded media is released after every row, also after a failure", async () => {
  const deps = fakeDeps({
    createScene: async (data) => {
      if (data.name === "B") throw new Error("validation failed");
      return { id: data.name };
    }
  });
  await createScenes({ rows: [row("A"), row("B")], ...options() }, deps);
  assert.deepEqual(deps.log.filter((entry) => entry.startsWith("dispose:")), ["dispose:A", "dispose:B"]);
});

test("a color that cannot be read does not fail the row", async () => {
  const deps = fakeDeps({
    sampleColor: () => {
      throw new Error("canvas blocked");
    }
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await createScenes({ rows: [row("A")], ...options() }, deps);
    assert.equal(result.created.length, 1);
    assert.equal("backgroundColor" in result.created[0].scene.data, false);
  } finally {
    console.warn = originalWarn;
  }
});

test("progress is reported before the first row and after each row, failed or not", async () => {
  const deps = fakeDeps({
    createScene: async (data) => {
      if (data.name === "B") throw new Error("x");
      return { id: data.name };
    }
  });
  const seen = [];
  await createScenes({ rows: [row("A"), row("B")], ...options({ onProgress: (p) => seen.push(p) }) }, deps);
  assert.deepEqual(seen, [{ done: 0, total: 2 }, { done: 1, total: 2 }, { done: 2, total: 2 }]);
});

test("stopping ends the run before the next row starts", async () => {
  const deps = fakeDeps();
  let stop = false;
  const result = await createScenes(
    {
      rows: [row("A"), row("B"), row("C")],
      ...options({ shouldStop: () => stop, onProgress: ({ done }) => { if (done === 1) stop = true; } })
    },
    deps
  );
  assert.deepEqual(result.created.map((entry) => entry.row.name), ["A"]);
  assert.equal(result.stopped, true);
});

test("New folder is created first and its id is used for every Scene", async () => {
  const deps = fakeDeps();
  const result = await createScenes(
    { rows: [row("A"), row("B")], ...options({ values: { ...values, sceneFolder: NEW_FOLDER }, newFolderName: "  Batch 1 " }) },
    deps
  );
  assert.deepEqual(deps.log.slice(0, 2), ["folder:Batch 1", "prepare"]);
  assert.deepEqual(result.created.map((entry) => entry.scene.data.folder), ["newFolderId", "newFolderId"]);
});

test("a problem that affects every row rejects the whole run", async () => {
  const deps = fakeDeps({
    prepareUploads: async () => {
      throw new Error("cannot create the upload folder");
    }
  });
  await assert.rejects(createScenes({ rows: [row("A")], ...options() }, deps), /cannot create the upload folder/);
  assert.equal(deps.log.some((entry) => entry.startsWith("scene:")), false);
});
