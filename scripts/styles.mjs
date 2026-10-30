const MODULE_ID = "multi-scene";

/**
 * Path of the stylesheet with the module version in the URL. The manifest's own
 * "styles" entry has a fixed URL, so browsers kept serving an old copy after an
 * update; a new version means a new URL.
 */
export function stylesheetPath(version) {
  return `modules/${MODULE_ID}/styles/multi-scene.css?v=${encodeURIComponent(version)}`;
}

/** Add the stylesheet to the page (once). */
export function loadStyles() {
  const href = foundry.utils.getRoute(stylesheetPath(game.modules.get(MODULE_ID).version));
  if (document.head.querySelector(`link[data-multi-scene][href="${href}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.multiScene = "";
  document.head.append(link);
}
