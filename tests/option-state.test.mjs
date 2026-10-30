import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFields } from "../scripts/option-fields.mjs";
import { OPTIONS, defaultValues, loadValues, persistableValues } from "../scripts/options/index.mjs";
import { NEW_FOLDER, buildFolderChoices } from "../scripts/options/scene-folder.mjs";

const env = {
  localize: (key) => key,
  foundryDefaultId: "fade",
  sceneTransitions: {
    fade: { id: "fade", label: "Fade" },
    wind: { id: "wind", label: "Wind" },
    swirl: { id: "swirl", label: "Swirl" }
  },
  folders: [
    { id: "f1", name: "Dungeons", parent: null },
    { id: "f2", name: "Level 2", parent: "f1" },
    { id: "f3", name: "Cities", parent: null }
  ]
};

test("buildFolderChoices lists no-folder first, folders in tree order with indentation, new-folder last", () => {
  const choices = buildFolderChoices(env.folders, env.localize);
  assert.deepEqual(choices, [
    { value: "", label: "MULTISCENE.Options.SceneFolder.None" },
    { value: "f3", label: "Cities" },
    { value: "f1", label: "Dungeons" },
    { value: "f2", label: " Level 2" },
    { value: NEW_FOLDER, label: "MULTISCENE.Options.SceneFolder.New" }
  ]);
});

test("buildFolderChoices treats a folder with a missing parent as top level and survives a self-parent", () => {
  const choices = buildFolderChoices(
    [{ id: "a", name: "Orphan", parent: "gone" }, { id: "b", name: "Loop", parent: "b" }],
    env.localize
  );
  assert.deepEqual(choices.map((choice) => choice.value), ["", "a", NEW_FOLDER]);
});

test("loadValues keeps valid saved values", () => {
  const saved = { disableVision: false, disableGrid: false, autoBackgroundColor: false, sceneTransition: "swirl", padding: 15, sceneFolder: "f2" };
  assert.deepEqual(loadValues(saved, env), saved);
});

test("loadValues falls back to the default for missing or invalid values", () => {
  const saved = { disableVision: "yes", sceneTransition: "gone", padding: 999, sceneFolder: "deleted-folder", unknown: 1 };
  assert.deepEqual(loadValues(saved, env), defaultValues(env));
  assert.deepEqual(loadValues(undefined, env), defaultValues(env));
  assert.deepEqual(loadValues({ padding: "12" }, env), defaultValues(env));
});

test("loadValues drops saved keys that are not options", () => {
  assert.equal("unknown" in loadValues({ unknown: 1 }, env), false);
});

test("persistableValues saves the New folder choice as no folder", () => {
  assert.equal(persistableValues({ sceneFolder: NEW_FOLDER, padding: 5 }).sceneFolder, "");
  assert.equal(persistableValues({ sceneFolder: "f1" }).sceneFolder, "f1");
});

test("buildFields describes every option for the template", () => {
  const values = { ...defaultValues(env), sceneFolder: NEW_FOLDER };
  const fields = buildFields(OPTIONS, values, env, "My folder");
  assert.deepEqual(fields.map((field) => field.id), OPTIONS.map((option) => option.id));

  const vision = fields.find((field) => field.id === "disableVision");
  assert.deepEqual([vision.isBoolean, vision.checked, vision.label], [true, true, "MULTISCENE.Options.DisableVision.Label"]);

  const transition = fields.find((field) => field.id === "sceneTransition");
  assert.equal(transition.isSelect, true);
  assert.deepEqual(transition.choices.filter((choice) => choice.selected).map((choice) => choice.value), ["wind"]);
  assert.equal(transition.warning, "");

  const padding = fields.find((field) => field.id === "padding");
  assert.deepEqual([padding.isNumber, padding.value, padding.min, padding.max, padding.step], [true, 0, 0, 50, 1]);

  const folder = fields.find((field) => field.id === "sceneFolder");
  assert.deepEqual([folder.isFolder, folder.showNewName, folder.newFolderName], [true, true, "My folder"]);
});

test("the transition field warns when Wind is missing", () => {
  const withoutWind = { ...env, sceneTransitions: { fade: env.sceneTransitions.fade } };
  const fields = buildFields(OPTIONS, defaultValues(withoutWind), withoutWind);
  const transition = fields.find((field) => field.id === "sceneTransition");
  assert.equal(transition.warning, "MULTISCENE.Options.SceneTransition.WindMissing");
});
