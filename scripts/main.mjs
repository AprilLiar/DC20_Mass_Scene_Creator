import { addMultiSceneButton } from "./scene-directory.mjs";

Hooks.once("init", () => {
  Hooks.on("renderSceneDirectory", addMultiSceneButton);
});
