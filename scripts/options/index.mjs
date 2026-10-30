import autoBackgroundColor from "./auto-background-color.mjs";
import disableGrid from "./disable-grid.mjs";
import disableVision from "./disable-vision.mjs";
import padding from "./padding.mjs";
import sceneFolder, { NEW_FOLDER } from "./scene-folder.mjs";
import sceneTransition from "./scene-transition.mjs";

/**
 * Every option shown in the right-hand panel, in display order. To add one:
 * create a file in this folder exporting { id, type, default, label, hint,
 * apply(sceneData, value, context) }, add it here, and add its strings to
 * lang/en.json. Types are "boolean", "number" (with min, max, step), "select"
 * (with choices(env)) and "folder". An option may also have warning(env).
 */
export const OPTIONS = [disableVision, disableGrid, autoBackgroundColor, sceneTransition, padding, sceneFolder];

/** Option values on first use. env is passed to defaults that depend on Foundry's config. */
export function defaultValues(env) {
  return Object.fromEntries(
    OPTIONS.map((option) => [option.id, typeof option.default === "function" ? option.default(env) : option.default])
  );
}

function isValidValue(option, value, env) {
  switch (option.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return Number.isFinite(value) && value >= (option.min ?? -Infinity) && value <= (option.max ?? Infinity);
    case "select":
    case "folder":
      return option.choices(env).some((choice) => choice.value === value);
    default:
      return false;
  }
}

/**
 * Option values from what was saved last time. Anything missing or no longer
 * valid (a deleted folder, a transition Foundry no longer has) falls back to
 * the default, and unknown saved keys are dropped.
 */
export function loadValues(saved, env) {
  const defaults = defaultValues(env);
  return Object.fromEntries(
    OPTIONS.map((option) => {
      const value = saved?.[option.id];
      return [option.id, isValidValue(option, value, env) ? value : defaults[option.id]];
    })
  );
}

/** Values safe to save: "New folder..." is only meaningful during one run, so it is saved as "no folder". */
export function persistableValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, value === NEW_FOLDER ? "" : value])
  );
}

/** Apply every option to sceneData in order. context.getDominantColor() supplies the picture color. */
export async function applyOptions(sceneData, values, context) {
  for (const option of OPTIONS) await option.apply(sceneData, values[option.id], context);
  return sceneData;
}
