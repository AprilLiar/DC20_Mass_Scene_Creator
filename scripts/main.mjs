import { addMultiSceneButton } from "./scene-directory.mjs";
import { registerSettings } from "./settings.mjs";
import { loadStyles } from "./styles.mjs";

Hooks.once("init", () => {
  loadStyles();
  registerSettings();
  Hooks.on("renderSceneDirectory", addMultiSceneButton);
});
