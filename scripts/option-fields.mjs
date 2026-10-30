import { NEW_FOLDER } from "./options/scene-folder.mjs";

/**
 * What the options template needs for each option: localized text, the current
 * value, and for dropdowns the choices with the current one marked.
 * newFolderName is the text typed for the "New folder..." entry; disabled
 * greys the controls out while Scenes are being created.
 */
export function buildFields(options, values, env, newFolderName = "", disabled = false) {
  return options.map((option) => {
    const value = values[option.id];
    const choices = option.choices?.(env).map((choice) => ({ ...choice, selected: choice.value === value }));
    return {
      id: option.id,
      label: env.localize(option.label),
      hint: env.localize(option.hint),
      warning: option.warning?.(env) ?? "",
      value,
      isBoolean: option.type === "boolean",
      isNumber: option.type === "number",
      isSelect: option.type === "select",
      isFolder: option.type === "folder",
      checked: option.type === "boolean" && value === true,
      min: option.min,
      max: option.max,
      step: option.step,
      choices,
      showNewName: option.type === "folder" && value === NEW_FOLDER,
      newFolderName,
      disabled
    };
  });
}
