# Multi-Scene: design and implementation plan

A system-agnostic Foundry VTT module (v14 only) that creates many Scenes at once from dropped image/video files or folders.

Status: implemented and released through GitHub Actions. Waiting for a manual test pass in Foundry v14 (see TESTING.md); section 5 lists what only a live world can confirm.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Foundry version | v14 only. `compatibility.minimum` = 14; `verified` set to the build the user tests on (latest stable known when planning: 14.369). |
| Module id / title | `multi-scene` / "Multi-Scene" |
| System agnostic | No `system` dependency and no `relationships.systems` in `module.json`. |
| Code | Plain JavaScript ES modules, Handlebars template, CSS. No build step; the repo contents are the module. |
| Languages | English only (`lang/en.json`). |
| License | MIT. Author in manifest: AprilLiar. |
| Branch | Everything is committed directly to `main`. |
| Releases | A new GitHub Release for every push to `main`, built by GitHub Actions (section 7). |
| Tests | Unit tests with Node's built-in runner (`node --test`) for all logic that does not need a browser; the window is tested manually in Foundry (TESTING.md). |

## 2. User-facing behavior (as implemented)

### Entry point
- A "Multi-Scene" button in the header of the Scenes sidebar tab, placed after the built-in Create Scene button. Shown only when `Scene.canUserCreate(game.user)` and `game.user.can("FILES_UPLOAD")` are true.
- Opens a normal Foundry window (title bar, draggable, resizable, minimizable, closable) sized to the whole browser viewport: files on the left (70%), options on the right (30%). A first version without a window frame never became visible in Foundry v14 and was replaced by this one.

### Intake
- Drag and drop files or folders anywhere in the window, or use Browse files / Browse folder.
- Accepts images and video (`CONST.IMAGE_FILE_EXTENSIONS`, `CONST.VIDEO_FILE_EXTENSIONS`). Folders are read recursively.
- Hidden files and OS leftovers (`.DS_Store`, `Thumbs.db`, `desktop.ini`) are ignored silently; other unsupported files are skipped with one warning.
- Each new batch is sorted by path (numbers compared as numbers: map2 before map10) and appended after the existing rows, so earlier edits never move. Exact repeats (same path, size and date) are skipped with a notice.
- Default Scene name: file name without extension, `_` and `-` turned into spaces, spaces collapsed, case untouched.
- Rows show a preview (images; videos show the first frame and play muted while hovered), an editable name, the source path and a remove button.

### Create
1. Checks: at least one row; a name when "New folder..." is chosen.
2. Upload folder `worlds/<world-id>/mass-scenes/` is created if missing.
3. For each row, one after another: read the size (and color) of the picture, upload the file unless the same content is already on the server, create the Scene. A failing row is recorded and the others carry on.
4. File names on the server are the cleaned original name plus the first 8 characters of the SHA-256 of the content: `Dark_Forest_01-3fa9c1d2.png`. The same content is never uploaded twice, and different files with the same name never clash.
5. All controls are locked while running; progress is shown. Closing the window stops the run before the next row.
6. Success: the window closes and a notification shows the count. With failures: created rows leave the list, failed rows stay with a failure report so Create can be pressed again.
- Option values are saved per user (client setting `lastOptions`) and restored on the next open.

## 3. Options panel

Options are registered in `scripts/options/index.mjs`; adding one means a new file there, one registry line and lang strings. The panel, saving, validation and Scene data all follow from the registry.

| Option | Type | Default | Effect on each created Scene |
| --- | --- | --- | --- |
| Disable Vision? | boolean | on | `tokenVision = false`. Nothing else changed. |
| Disable Grid? | boolean | on | `grid.type = CONST.GRID_TYPES.GRIDLESS` (0). |
| Set Background color automatically? | boolean | on | `backgroundColor` = most frequent color of the picture (shrunk to 64 px, 16 buckets per channel, average of the winning bucket; first frame for video). A color that cannot be read leaves Foundry's default. |
| Scene Transition | select | Wind | `transition.type` from `CONFIG.Canvas.sceneTransitions`. Falls back to Foundry's default with a warning if Wind is missing. |
| Padding (%) | number 0-50 | 0 | `padding` as a fraction. Always written, so 0 overrides Foundry's 25% default. |
| Scene folder | folder | none | `folder` = existing Scene folder, or a new one created first. |
| Show in navigation bar? | boolean | off | `navigation` written explicitly, so batch-created Scenes stay out of the top bar by default. |

Every Scene also gets `name`, `levels: [{ name, background: { src } }]` and `width` / `height` from the picture's pixel size. Foundry v14 rejects a Level without a name (found in the first real test), so the Level is named like the Scene.

## 4. Foundry v14 research notes (verified against the official v14 API docs)

Latest v14 build when planning: 14.369 (Stable 11, 2026-10-08). Stable 1 was 14.359. API base: https://foundryvtt.com/api/v14/

Scene data (`interfaces/foundry.documents.types.SceneData.html`):
- `name`, `folder`, `width`, `height` ("normally the width/height of the background media"), `padding` (proportion of buffer around the scene), `backgroundColor` ("color of the canvas displayed behind the scene background"), `tokenVision` (boolean), `grid` (`GridData`: `type`, `size`, `distance`, `units`, ...), `transition` (`{ type: string|null, duration, activeOnly }`), `levels` (embedded `LevelData[]`), `initialLevel`, `fog.mode` (fog exploration is now a `mode` number, not a boolean).
- Default background color in the Scenes article is #999999.
- `CONST.GRID_TYPES`: `GRIDLESS: 0, SQUARE: 1, HEXODDR: 2, HEXEVENR: 3, HEXODDQ: 4, HEXEVENQ: 5`.

Background image (Levels):
- `Scene#background` is gone; a Level carries the image: `LevelData.background` is `{ src, tint, alphaThreshold } & { color: number }`. Level fields: `_id`, `name`, `sort`, `elevation {bottom, top}`, `background`, `foreground`, `fog`, `textures`, `visibility`. A third-party PR confirms creating a Scene with one Level holding `background.src` and that the first Level becomes the initial Level. A real v14 world additionally requires `name` on every Level. https://github.com/JohnMPrince/deadsuns-adaptation-vtt/pull/21
- `Scene#createThumbnail({ format, width, height, quality, level })` returns `{ thumb, ... }`, defaults to the initial level, 300x100 webp.
- `Scene#getDimensions()` applies padding and rounds to whole grid spaces (2x grid size).

Scenes tab button:
- `SceneDirectory` is an ApplicationV2 (`tabName = "scenes"`, PARTS `header`, `directory`, `footer`; has `_getHeaderControls`, `_canCreateEntry`, `_onCreateEntry`).
- Render hook: `renderSceneDirectory(application, element: HTMLElement, context, options)`. Every class in the inheritance chain fires its own hook (docs: `hookEvents.renderApplicationV2`). `getHeaderControlsApplicationV2` also exists but adds window-title-bar controls, not directory header buttons, so the render hook is used.
- Who sees the button: `Scene.canUserCreate(game.user)` (static).

File upload (`foundry.applications.apps.FilePicker`, use `FilePicker.implementation`):
- `upload(source, path, file: File, body = {}, options = { notify })` -> `Promise<object>` ("the response object").
- `browse(source, target, { bucket, extensions, wildcard })` -> `Promise<object>` (directories and files).
- `createDirectory(source, target, options)` -> `Promise<object>`; the directory must not already exist (so browse first, or catch the error).
- `FilePicker.canUpload` tells whether the current user may upload.

Constants:
- `CONST.IMAGE_FILE_EXTENSIONS`: apng, avif, bmp, gif, jpeg, jpg, png, svg, tiff, webp (extension -> mime type).
- `CONST.VIDEO_FILE_EXTENSIONS`: m4v, mp4, ogv, webm (extension -> mime type).

Transitions:
- Registry: `CONFIG.Canvas.sceneTransitions: Record<string, { id, label, filterClass, filterType, defaultDuration? }>`; default is `fade`. `Scene.transition.type` takes a registry id. The dropdown is built from this registry with `game.i18n.localize(label)`. The id of "Wind" is not documented; look it up at runtime (id `wind`, else a label match).
- Safeguards: an unknown transition type no longer stops scenes from loading (14.354); "None" is selectable (14.355).

ApplicationV2 window options (`ApplicationConfiguration`, `ApplicationWindowConfiguration`):
- Top level: `id`, `classes`, `tag`, `actions`, `position`, `form`, `window`.
- `window`: `title`, `icon`, `frame` ("rendered inside a window frame"), `positioned` ("positioned via JavaScript or only by CSS"), `resizable`, `minimizable`, `controls`, `contentClasses`, `contentTag`.
- Full-viewport plan: a normal framed window; `new MultiSceneApp()` passes `position: { top: 0, left: 0, width: innerWidth, height: innerHeight }` to the constructor, which merges it into the defaults (documented for `ApplicationV2`).

## 5. Still unverified (needs a live v14 world; the API docs do not cover these)

These are covered step by step in [TESTING.md](TESTING.md). In short:

1. DOM of the Scenes tab header. The button is inserted after `[data-action="createEntry"]`, falling back to the header and then the top of the tab.
2. Exact shape of the `FilePicker.upload` response (the code uses `response.path`, and builds the path from folder and name if it is missing).
3. Whether `Scene.create` with `levels: [{ name, background: { src } }]` plus explicit `width` / `height` produces a correct Scene, and whether Foundry makes the thumbnail itself (the code fills it in when missing).
4. Whether the "Background Color" shown in the Scene configuration is `Scene.backgroundColor` (set by this module) or the Level's own background color.
5. The internal id of the "Wind" transition (looked up at runtime by id or label).
6. That the window opens at full viewport size and that the `render({ parts })` option re-renders only the named parts.

The mock-Foundry browser checks used during development only prove the module's own logic; they cannot prove the points above.

## 6. File layout

```
module.json                      manifest (version, manifest and download URLs are rewritten by the release workflow)
LICENSE  README.md  PLAN.md  TESTING.md  package.json
lang/en.json
styles/multi-scene.css          loaded by scripts/styles.mjs (not listed in module.json, see below)
templates/main.hbs options.hbs                  the two parts of the window (files, options)
scripts/main.mjs                 init: stylesheet, settings, renderSceneDirectory hook
scripts/styles.mjs               adds the stylesheet with the module version in its URL
scripts/scene-directory.mjs      the hook: builds the button
scripts/button-placement.mjs     where the button goes (pure)
scripts/multi-scene-app.mjs      the window: state, events, actions
scripts/file-intake.mjs          drop/browse -> { file, path } items, folder recursion (pure)
scripts/media-types.mjs          extensions, accept attribute, ignored files (pure)
scripts/rows.mjs                 add items to the list, sort, skip repeats (pure)
scripts/names.mjs                prettify file names (pure)
scripts/color.mjs                dominant color (pure) + canvas sampling helper
scripts/option-fields.mjs        option values -> template fields (pure)
scripts/settings.mjs             per-user saved option values
scripts/options/*.mjs            one file per option + index.mjs registry
scripts/uploader.mjs             hashed file names, upload folder (takes Foundry's FilePicker as a parameter)
scripts/media-loader.mjs         opens an image/video to read size and a frame (browser)
scripts/scene-builder.mjs        the create loop (takes all Foundry calls as parameters)
scripts/foundry-deps.mjs         the real Foundry calls behind the create loop
tests/*.test.mjs                 node --test: everything that does not need a browser
.github/workflows/release.yml    test, bump patch version, zip, tag, publish a Release
.github/scripts/                 version bump helpers used by the workflow
```

## 7. Release process

Trigger: every push to `main` (pushes that only touch `*.md` files are ignored).

Workflow steps:
1. Run `node --test`. A failing test stops the release.
2. Bump the patch version in `module.json` (minor/major bumps are done by editing the version manually before pushing).
3. Rewrite `manifest` to `https://github.com/AprilLiar/DC20_Mass_Scene_Creator/releases/latest/download/module.json` and `download` to `https://github.com/AprilLiar/DC20_Mass_Scene_Creator/releases/download/v<version>/module.zip`.
4. Commit the bumped `module.json` back to `main` with `[skip ci]`, tag `v<version>`.
5. Zip `module.json`, `scripts`, `templates`, `styles`, `lang`, `LICENSE` into `module.zip`.
6. Create a GitHub Release for the tag with `module.json` and `module.zip` attached.

Notes:
- Needs `permissions: contents: write` and a concurrency group so two pushes do not race.
- The workflow commits to `main`, so pull before the next push.
- If GitHub refuses a push containing a workflow file (token lacks the `workflows` permission), the file is handed over for manual addition.
- Install URL for Foundry's "Install Module" dialog: `https://github.com/AprilLiar/DC20_Mass_Scene_Creator/releases/latest/download/module.json` (works after the first release exists).

## 8. Defaults chosen without asking (veto welcome)

- Padding option: number field in percent, 0 to 50, default 0.
- The button is visible only to users who can create Scenes and upload files.
- New batches are appended after existing rows; exact repeats are skipped.
- Video previews show the first frame and play muted only while hovered (a long list of autoplaying videos would be too heavy).
- Scenes are created one at a time (not in chunks) so each failure is reported for its own row.
- Every created Scene gets one Level, named like the Scene.
- The stylesheet is added by script with `?v=<module version>` instead of the manifest's `styles` entry: browsers kept serving the old file after an update (a v0.0.6 stylesheet broke the v0.0.7 window until a hard reload).
- If the world folder is not writable (for example some hosted setups), the run stops with one clear error; no alternative storage is designed.
- Per-user saved option values: "New folder..." is saved as "no folder"; a saved folder or transition that no longer exists falls back to the default.

## 9. Implementation order (all done)

1. Repo scaffolding, manifest, license, release workflow, manifest tests. Done.
2. Pure logic with tests: names, color, option registry. Done.
3. Scenes tab button and the full-viewport window. Done.
4. File intake and the row list with previews. Done.
5. Options panel with saved values. Done.
6. Uploader, Scene builder, progress and failure report. Done.
7. Test checklist for Foundry v14 ([TESTING.md](TESTING.md)). Done. Pending: the manual pass by the user, then set `compatibility.verified` in `module.json` to the build that was tested.
