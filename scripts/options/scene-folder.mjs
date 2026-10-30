/** Value of the "New folder..." entry. The Scene builder turns it into a real Folder id before options are applied. */
export const NEW_FOLDER = "__new__";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const byName = (a, b) => collator.compare(a.name, b.name);

/**
 * Dropdown entries for the Scene folder: "No folder", every Scene folder in
 * tree order with nested ones indented, and "New folder...".
 * folders: [{ id, name, parent: id or null }]. A folder whose parent is missing counts as top level.
 */
export function buildFolderChoices(folders, localize) {
  const ids = new Set(folders.map((folder) => folder.id));
  const children = new Map();
  for (const folder of folders) {
    if (!ids.has(folder.parent)) continue;
    if (!children.has(folder.parent)) children.set(folder.parent, []);
    children.get(folder.parent).push(folder);
  }

  const choices = [{ value: "", label: localize("MULTISCENE.Options.SceneFolder.None") }];
  const visit = (folder, depth) => {
    choices.push({ value: folder.id, label: `${" ".repeat(depth)}${folder.name}` });
    for (const child of (children.get(folder.id) ?? []).sort(byName)) visit(child, depth + 1);
  };
  for (const root of folders.filter((folder) => !ids.has(folder.parent)).sort(byName)) visit(root, 0);

  choices.push({ value: NEW_FOLDER, label: localize("MULTISCENE.Options.SceneFolder.New") });
  return choices;
}

export default {
  id: "sceneFolder",
  type: "folder",
  default: "",
  label: "MULTISCENE.Options.SceneFolder.Label",
  hint: "MULTISCENE.Options.SceneFolder.Hint",
  /** env: { folders, localize } */
  choices: (env) => buildFolderChoices(env.folders ?? [], env.localize),
  apply(sceneData, value) {
    if (value && value !== NEW_FOLDER) sceneData.folder = value;
  }
};
