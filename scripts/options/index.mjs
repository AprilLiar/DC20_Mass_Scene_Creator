import autoBackgroundColor from "./auto-background-color.mjs";
import disableGrid from "./disable-grid.mjs";
import disableVision from "./disable-vision.mjs";
import padding from "./padding.mjs";
import sceneFolder from "./scene-folder.mjs";
import sceneTransition from "./scene-transition.mjs";

/**
 * Every option shown in the right-hand panel, in display order. To add one:
 * create a file in this folder exporting { id, type, default, label, hint,
 * apply(sceneData, value, context) }, add it here, and add its strings to
 * lang/en.json.
 */
export const OPTIONS = [disableVision, disableGrid, autoBackgroundColor, sceneTransition, padding, sceneFolder];

/** Option values on first use. env is passed to defaults that depend on Foundry's config. */
export function defaultValues(env) {
  return Object.fromEntries(
    OPTIONS.map((option) => [option.id, typeof option.default === "function" ? option.default(env) : option.default])
  );
}

/** Apply every option to sceneData in order. context.getDominantColor() supplies the picture color. */
export async function applyOptions(sceneData, values, context) {
  for (const option of OPTIONS) await option.apply(sceneData, values[option.id], context);
  return sceneData;
}
