import { collectDropped, itemsFromFileList } from "./file-intake.mjs";
import { acceptAttribute, foundryMediaKinds } from "./media-types.mjs";
import { buildFields } from "./option-fields.mjs";
import { OPTIONS, loadValues, persistableValues } from "./options/index.mjs";
import { NEW_FOLDER } from "./options/scene-folder.mjs";
import { addItems } from "./rows.mjs";
import { loadSavedOptions, saveOptions } from "./settings.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TEMPLATES = "modules/multi-scene/templates";

/**
 * The full-viewport Multi-Scene window. It has no Foundry window frame: the
 * title bar is its own part and the CSS pins the whole window over the screen.
 */
export class MultiSceneApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "multi-scene-app",
    classes: ["multi-scene-app"],
    tag: "div",
    window: { frame: false, positioned: false },
    actions: {
      closeWindow: MultiSceneApp.#onCloseWindow,
      browseFiles: MultiSceneApp.#onBrowseFiles,
      browseFolder: MultiSceneApp.#onBrowseFolder,
      removeRow: MultiSceneApp.#onRemoveRow
    }
  };

  static PARTS = {
    titlebar: { template: `${TEMPLATES}/titlebar.hbs` },
    main: { template: `${TEMPLATES}/main.hbs` },
    options: { template: `${TEMPLATES}/options.hbs` }
  };

  static #current = null;

  #rows = [];
  #nextId = 0;
  #scrollTop = 0;
  #dragDepth = 0;
  #values = null;
  #newFolderName = "";

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

  /** What the option definitions need to know about this Foundry world. */
  #optionsEnv() {
    return {
      localize: (key) => game.i18n.localize(key),
      sceneTransitions: CONFIG.Canvas.sceneTransitions,
      foundryDefaultId: "fade",
      folders: game.folders
        .filter((folder) => folder.type === "Scene")
        .map((folder) => ({ id: folder.id, name: folder.name, parent: folder.folder?.id ?? null }))
    };
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const env = this.#optionsEnv();
    this.#values ??= loadValues(loadSavedOptions(), env);
    context.fields = buildFields(OPTIONS, this.#values, env, this.#newFolderName);
    context.rows = this.#rows.map((row) => ({
      id: row.id,
      name: row.name,
      path: row.path,
      previewUrl: row.previewUrl,
      isVideo: row.kind === "video"
    }));
    context.hasRows = this.#rows.length > 0;
    context.countLabel = game.i18n.format("MULTISCENE.Intake.Count", { count: this.#rows.length });
    return context;
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    // One set of listeners on the window itself: parts are replaced on re-render, the window is not.
    const root = this.element;
    root.addEventListener("dragenter", (event) => this.#onDragEnter(event));
    root.addEventListener("dragover", (event) => this.#onDragOver(event));
    root.addEventListener("dragleave", (event) => this.#onDragLeave(event));
    root.addEventListener("drop", (event) => this.#onDrop(event));
    root.addEventListener("input", (event) => this.#onInput(event));
    root.addEventListener("change", (event) => this.#onOptionChange(event));
    root.addEventListener("scroll", (event) => this.#onScroll(event), true);
    root.addEventListener("mouseover", (event) => this.#onHover(event, true));
    root.addEventListener("mouseout", (event) => this.#onHover(event, false));
    // Without a frame Foundry does not stack this window by itself.
    this.bringToFront();
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Re-rendering the file list replaces its scroll container, so put the scroll position back.
    const main = this.element.querySelector(".ms-main");
    if (main) main.scrollTop = this.#scrollTop;
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    for (const row of this.#rows) URL.revokeObjectURL(row.previewUrl);
    this.#rows = [];
  }

  /* ---------------------------------------------------------------- */
  /*  Adding and removing rows                                         */
  /* ---------------------------------------------------------------- */

  async #addItems(items) {
    const result = addItems(this.#rows, items, foundryMediaKinds(), () => ++this.#nextId);
    for (const row of result.added) row.previewUrl = URL.createObjectURL(row.file);
    this.#rows = result.rows;

    if (result.unsupported) {
      ui.notifications.warn(game.i18n.format("MULTISCENE.Intake.Unsupported", { count: result.unsupported }));
    }
    if (result.duplicates) {
      ui.notifications.info(game.i18n.format("MULTISCENE.Intake.Duplicates", { count: result.duplicates }));
    }
    await this.render({ parts: ["main"] });
  }

  #pick({ directory }) {
    const input = document.createElement("input");
    input.type = "file";
    if (directory) input.webkitdirectory = true;
    else {
      input.multiple = true;
      input.accept = acceptAttribute(foundryMediaKinds());
    }
    input.addEventListener("change", () => this.#addItems(itemsFromFileList(input.files)));
    input.click();
  }

  static #onBrowseFiles() {
    this.#pick({ directory: false });
  }

  static #onBrowseFolder() {
    this.#pick({ directory: true });
  }

  static #onRemoveRow(event, target) {
    const id = Number(target.dataset.rowId);
    const row = this.#rows.find((candidate) => candidate.id === id);
    if (!row) return;
    URL.revokeObjectURL(row.previewUrl);
    this.#rows = this.#rows.filter((candidate) => candidate !== row);
    return this.render({ parts: ["main"] });
  }

  static #onCloseWindow() {
    return this.close();
  }

  /* ---------------------------------------------------------------- */
  /*  Window events                                                    */
  /* ---------------------------------------------------------------- */

  #onInput(event) {
    const input = event.target;
    if (input.matches?.(".ms-name")) {
      const row = this.#rows.find((candidate) => candidate.id === Number(input.dataset.rowId));
      if (row) row.name = input.value;
    } else if (input.matches?.("[data-new-folder-name]")) {
      this.#newFolderName = input.value;
    }
  }

  /** A checkbox, number field or dropdown of the options panel changed: remember the value and save it. */
  #onOptionChange(event) {
    const input = event.target;
    const option = OPTIONS.find((candidate) => candidate.id === input.dataset?.option);
    if (!option) return;

    let value;
    if (option.type === "boolean") value = input.checked;
    else if (option.type === "number") {
      const number = Number(input.value);
      value = Number.isFinite(number) ? Math.min(Math.max(number, option.min), option.max) : option.default;
      input.value = value;
    } else value = input.value;
    this.#values[option.id] = value;

    if (option.type === "folder") {
      this.element.querySelector("[data-new-folder-name]").hidden = value !== NEW_FOLDER;
    }
    Promise.resolve(saveOptions(persistableValues(this.#values))).catch((error) =>
      console.warn("multi-scene | could not save the options", error)
    );
  }

  #onScroll(event) {
    if (event.target.classList?.contains("ms-main")) this.#scrollTop = event.target.scrollTop;
  }

  /** Video previews only play while the pointer is over them, so a long list stays light. */
  #onHover(event, play) {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    if (play) video.play().catch(() => {});
    else video.pause();
  }

  static #hasFiles(event) {
    return event.dataTransfer?.types?.includes("Files");
  }

  #setDragging(active) {
    this.element.classList.toggle("is-dragover", active);
  }

  #onDragEnter(event) {
    if (!MultiSceneApp.#hasFiles(event)) return;
    event.preventDefault();
    this.#dragDepth += 1;
    this.#setDragging(true);
  }

  #onDragOver(event) {
    if (!MultiSceneApp.#hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  #onDragLeave(event) {
    if (!MultiSceneApp.#hasFiles(event)) return;
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);
    if (this.#dragDepth === 0) this.#setDragging(false);
  }

  #onDrop(event) {
    if (!MultiSceneApp.#hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.#dragDepth = 0;
    this.#setDragging(false);
    collectDropped(event.dataTransfer)
      .then((items) => this.#addItems(items))
      .catch((error) => {
        console.error("multi-scene | could not read the dropped files", error);
        ui.notifications.error(game.i18n.localize("MULTISCENE.Intake.ReadError"));
      });
  }
}
