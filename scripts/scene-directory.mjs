import { insertButton } from "./button-placement.mjs";
import { MultiSceneApp } from "./multi-scene-app.mjs";

/**
 * renderSceneDirectory hook: add the Multi-Scene button for users who can
 * create Scenes and upload files.
 */
export function addMultiSceneButton(application, element) {
  if (!CONFIG.Scene.documentClass.canUserCreate(game.user) || !game.user.can("FILES_UPLOAD")) return;

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-images";

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.multiScene = "";
  button.append(icon, ` ${game.i18n.localize("MULTISCENE.Button")}`);
  button.addEventListener("click", () => MultiSceneApp.open());

  insertButton(element, button);
}
