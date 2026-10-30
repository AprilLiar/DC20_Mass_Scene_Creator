// The value is a Folder id or "" for no folder. A "create new folder" choice is
// turned into a real Folder id by the Scene builder before options are applied.
export default {
  id: "sceneFolder",
  type: "folder",
  default: "",
  label: "MULTISCENE.Options.SceneFolder.Label",
  hint: "MULTISCENE.Options.SceneFolder.Hint",
  apply(sceneData, value) {
    if (value) sceneData.folder = value;
  }
};
