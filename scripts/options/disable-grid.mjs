// CONST.GRID_TYPES.GRIDLESS in Foundry v14.
const GRIDLESS = 0;

export default {
  id: "disableGrid",
  type: "boolean",
  default: true,
  label: "MULTISCENE.Options.DisableGrid.Label",
  hint: "MULTISCENE.Options.DisableGrid.Hint",
  apply(sceneData, value) {
    if (!value) return;
    sceneData.grid = { ...sceneData.grid, type: globalThis.CONST?.GRID_TYPES?.GRIDLESS ?? GRIDLESS };
  }
};
