export default {
  id: "disableVision",
  type: "boolean",
  default: true,
  label: "MULTISCENE.Options.DisableVision.Label",
  hint: "MULTISCENE.Options.DisableVision.Hint",
  apply(sceneData, value) {
    if (value) sceneData.tokenVision = false;
  }
};
