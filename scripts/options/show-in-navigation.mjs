export default {
  id: "showInNavigation",
  type: "boolean",
  default: false,
  label: "MULTISCENE.Options.ShowInNavigation.Label",
  hint: "MULTISCENE.Options.ShowInNavigation.Hint",
  apply(sceneData, value) {
    sceneData.navigation = value === true;
  }
};
