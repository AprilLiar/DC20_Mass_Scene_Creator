const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The full-viewport Multi-Scene window. It has no Foundry window frame: the
 * template draws its own title bar and the CSS pins it over the whole screen.
 */
export class MultiSceneApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "multi-scene-app",
    classes: ["multi-scene-app"],
    tag: "div",
    window: { frame: false, positioned: false },
    actions: { closeWindow: MultiSceneApp.#onCloseWindow }
  };

  static PARTS = {
    main: { template: "modules/multi-scene/templates/multi-scene.hbs" }
  };

  static #current = null;

  /** Open the window, or bring it to the front if it is already open. */
  static open() {
    if (MultiSceneApp.#current?.rendered) {
      MultiSceneApp.#current.bringToFront();
      return MultiSceneApp.#current;
    }
    MultiSceneApp.#current = new MultiSceneApp();
    MultiSceneApp.#current.render({ force: true });
    return MultiSceneApp.#current;
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    // Without a frame Foundry does not stack this window by itself.
    this.bringToFront();
  }

  static #onCloseWindow() {
    return this.close();
  }
}
