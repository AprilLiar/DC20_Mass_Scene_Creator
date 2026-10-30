# Multi-Scene: design and implementation plan

A system-agnostic Foundry VTT module (v14 only) that creates many Scenes at once from dropped image/video files or folders.

Status: design agreed, API research done against the official v14 docs, implementation not started. Section 5 lists the few things that can only be checked in a live Foundry v14 world.

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
| Tests | Unit tests with Node's built-in runner (`node --test`) for pure logic; UI is tested manually in Foundry. |

## 2. User-facing behavior

### Entry point
- A "Multi-Scene" button in the header of the Scenes sidebar tab, next to Create Scene / Create Folder. Shown only when `Scene.canUserCreate(game.user)` is true and the user can upload files (`FilePicker.canUpload`).
- Opens a full-viewport application (covers the whole browser window, own title bar and Close button, not draggable or resizable).

### Layout
- Left 70%: drop zone and a vertical, scrollable list of rows.
  - Row: large-ish preview on the left (image, or muted looping video), editable Scene name field on the right, remove (X) button.
- Right 30%: options panel (section 3) and the Create button.
- Empty state: a large drop target with a Browse files button and a Browse folder button (hidden `<input type="file" multiple>` and `<input type="file" webkitdirectory>`).

### Intake
- Accepts images and video; allowed extensions come from `CONST.IMAGE_FILE_EXTENSIONS` and `CONST.VIDEO_FILE_EXTENSIONS`.
- Dropping a folder includes all sub-folders recursively (`DataTransferItem.webkitGetAsEntry()` traversal).
- Dropping or browsing again appends to the list; it does not replace it.
- Rows are sorted alphabetically by relative path.
- Default Scene name ("prettified"): remove extension, turn `_` and `-` into spaces, collapse repeated spaces, trim. No change of letter case. Example: `Dark_Forest-01.webp` -> `Dark Forest 01`.

### Create
1. Upload every file to `worlds/<world-id>/mass-scenes/` (Foundry `data` source). The folder is created if missing. If a file with the same name is already there, the upload is skipped and the existing file is reused.
2. Build Scene data for each row, apply all options.
3. Create Scenes in chunks so a progress bar can advance. A failed row does not stop the others.
4. Success: dialog closes and a notification reports how many Scenes were created. If anything failed, the dialog stays open with a list of failed rows and reasons (progress and error report).
- Duplicate Scene names are allowed (Foundry allows them).
- Last-used option values are saved per user (client setting) and restored on next open; first use falls back to the defaults below.

## 3. Options panel

Options are defined in a registry so more can be added later without touching the dialog code. Each option is one file in `scripts/options/` exporting: `id`, `label`/`hint` (lang keys), `type` (`boolean`, `select`, `number`), `default`, and `apply(sceneData, context)` (may be async; `context` holds the row, the image/video element and its natural size). Adding an option = new file + one line in the registry + lang strings.

| Option | Type | Default | Effect on each created Scene |
| --- | --- | --- | --- |
| Disable Vision? | boolean | on | `tokenVision = false`. Nothing else changed (fog exploration untouched). |
| Disable Grid? | boolean | on | `grid.type = CONST.GRID_TYPES.GRIDLESS` (0). |
| Set Background color automatically? | boolean | on | `backgroundColor` = most frequent color of the picture. Image is shrunk (e.g. to 64 px on the long side), pixels grouped into color buckets, the most populated bucket wins (bucket average used as the result). Videos: first frame. Off = Foundry's default color. |
| Scene Transition | select | Wind | `transition.type` set to the chosen type. Duration and `activeOnly` stay at Foundry defaults. The list of types is built from `CONFIG.Canvas.sceneTransitions`; if Wind is not found the dropdown falls back to Foundry's default and shows a warning. |
| Padding | number (percent) | 0 | Scene `padding`. Default value is a proposal, see section 8. |
| Scene folder | select | none | Folder of the created Scenes: none, any existing Scene folder, or "create new folder". |

## 4. Foundry v14 research notes (verified against the official v14 API docs)

Latest v14 build when planning: 14.369 (Stable 11, 2026-10-08). Stable 1 was 14.359. API base: https://foundryvtt.com/api/v14/

Scene data (`interfaces/foundry.documents.types.SceneData.html`):
- `name`, `folder`, `width`, `height` ("normally the width/height of the background media"), `padding` (proportion of buffer around the scene), `backgroundColor` ("color of the canvas displayed behind the scene background"), `tokenVision` (boolean), `grid` (`GridData`: `type`, `size`, `distance`, `units`, ...), `transition` (`{ type: string|null, duration, activeOnly }`), `levels` (embedded `LevelData[]`), `initialLevel`, `fog.mode` (fog exploration is now a `mode` number, not a boolean).
- Default background color in the Scenes article is #999999.
- `CONST.GRID_TYPES`: `GRIDLESS: 0, SQUARE: 1, HEXODDR: 2, HEXEVENR: 3, HEXODDQ: 4, HEXEVENQ: 5`.

Background image (Levels):
- `Scene#background` is gone; a Level carries the image: `LevelData.background` is `{ src, tint, alphaThreshold } & { color: number }`. Level fields: `_id`, `name`, `sort`, `elevation {bottom, top}`, `background`, `foreground`, `fog`, `textures`, `visibility`. A third-party PR confirms creating a Scene with `levels: [{ background: { src } }]` and that the first Level becomes the initial Level. https://github.com/JohnMPrince/deadsuns-adaptation-vtt/pull/21
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
- Full-viewport plan: `window.positioned = false` and CSS `position: fixed; inset: 0`, own title bar inside the template (or keep the frame and style it).

## 5. Still unverified (needs a live v14 world; the API docs do not cover these)

1. DOM of the Scenes tab header (core template, not in the API docs). The button is placed robustly: find the `[data-action="createEntry"]` button inside `element` and insert after it; fall back to the `header` part; skip if the button already exists (the hook fires on every re-render).
2. Exact shape of the `FilePicker.upload` response (expected to contain the final `path`; if missing, the path is built from folder + file name).
3. Whether `Scene.createDocuments` with `levels: [{ background: { src } }]` also needs explicit top-level `width`/`height` (plan: always pass them from the image's natural size) and whether core generates the thumbnail itself (fallback: call `createThumbnail` and update `thumb`).
4. Which color the Scene configuration actually shows as "Background Color" now: `Scene.backgroundColor` (string) or the Level's `background.color` (number). Plan: set `backgroundColor`, then check in Foundry; adjust if needed.
5. The internal id of the "Wind" transition (found at runtime, see above).
6. `window.positioned = false` behavior with a fixed-position full-viewport layout.

Everything else in this plan is verified or independent of Foundry internals.

## 6. File layout

```
module.json
LICENSE
README.md
PLAN.md
lang/en.json
scripts/main.mjs                 hooks, settings registration, button injection
scripts/multi-scene-app.mjs      ApplicationV2 window (rows, panel, progress)
scripts/file-intake.mjs          drop/browse -> entries, recursion, type filter, sort
scripts/uploader.mjs             target folder creation, upload, reuse existing files
scripts/scene-builder.mjs        row + options -> Scene data -> createDocuments in chunks
scripts/names.mjs                prettify file name (pure)
scripts/color.mjs                dominant color from pixel data (pure) + canvas sampling helper
scripts/options/index.mjs        option registry
scripts/options/*.mjs            one file per option
templates/multi-scene.hbs
styles/multi-scene.css
tests/*.test.mjs                 node --test: names, color, option apply, manifest sanity
.github/workflows/release.yml
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

- Padding option: number field in percent, default 0.
- Button visible only to users who can create Scenes.
- Video previews are muted, looping `<video>` elements.
- File reuse is by name only (same name in the upload folder is considered the same file).
- "Create new folder" lets the user type a folder name inline in the panel.
- If the world folder is not writable (for example some hosted setups), the run fails with a clear error; no alternative storage is designed.

## 9. Implementation order

1. Repo scaffolding: `module.json`, `LICENSE`, `README.md`, `lang/en.json`, release workflow, empty test.
2. Pure logic with tests: `names.mjs`, `color.mjs`, option registry and option `apply` functions.
3. Button injection and an empty full-viewport window.
4. File intake (drop, browse, folder recursion) and the row list with previews.
5. Options panel, persisted values.
6. Uploader and Scene builder, progress and error report.
7. Manual test pass in Foundry v14 by the user; fix; set `verified`.
