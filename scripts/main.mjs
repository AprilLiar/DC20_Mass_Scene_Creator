import { addMultiSceneButton } from "./scene-directory.mjs";
import { registerSettings } from "./settings.mjs";

Hooks.once("init", () => {
  registerSettings();
  Hooks.on("renderSceneDirectory", addMultiSceneButton);
});
