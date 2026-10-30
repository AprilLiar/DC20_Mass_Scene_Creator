# Multi-Scene: design and implementation plan

A system-agnostic Foundry VTT module (v14 only) that creates many Scenes at once from dropped image/video files or folders.

Status: design agreed, implementation not started. Items marked UNVERIFIED must be checked against the official v14 API docs (foundryvtt.com) before or during implementation; the docs host was unreachable while this plan was written.

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
- A "Multi-Scene" button in the header of the Scenes sidebar tab, next to Create Scene / Create Folder. Shown only to users allowed to create Scenes (GM by default).
- Opens a full-viewport application (covers the whole browser window, own title bar and Close button, not draggable or resizable).

### Layout
- Left 70%: drop zone and a vertical, scrollable list of rows.
  - Row: large-ish preview on the left (image, or muted looping video), editable Scene name field on the right, remove (X) button.
- Right 30%: options panel (section 3) and the Create button.
- Empty state: a large drop target with a Browse files button and a Browse folder button (hidden `<input type="file" multiple>` and `<input type="file" webkitdirectory>`).

### Intake
- Accepts images and video (Foundry-supported extensions; list taken from Foundry constants at runtime if available, otherwise a fixed fallback list).
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
| Disable Grid? | boolean | on | `grid.type = CONST.GRID_TYPES.GRIDLESS`. |
| Set Background color automatically? | boolean | on | `backgroundColor` = most frequent color of the picture. Image is shrunk (e.g. to 64 px on the long side), pixels grouped into color buckets, the most populated bucket wins (bucket average used as the result). Videos: first frame. Off = Foundry's default color. |
| Scene Transition | select | Wind | `transition.type` set to the chosen type. Duration and `activeOnly` stay at Foundry defaults. The list of types is read from Foundry at runtime; if Wind is not found the dropdown falls back to Foundry's default and shows a warning. |
| Padding | number (percent) | 0 | Scene `padding`. Default value is a proposal, see section 8. |
| Scene folder | select | none | Folder of the created Scenes: none, any existing Scene folder, or "create new folder". |

## 4. Foundry v14 research notes

Confirmed from search results and API pages (secondary sources, see links):
- Latest v14 build when planning: 14.369, Stable 11, dated 2026-10-08. Stable 1 was 14.359. https://foundryvtt.com/releases/14.369
- `Scene#background` is dropped in v14 (writes are silently ignored). The background is an embedded Level: `levels: [{ background: { src } }]`; the first Level is the initial Level and Foundry assigns ids/defaults. Source is a third-party PR, so verify it. https://github.com/JohnMPrince/deadsuns-adaptation-vtt/pull/21
- Scene data has `backgroundColor` (canvas color behind the background), `transition: { type, duration, activeOnly }`, `levels`, `initialLevel`. https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.SceneData.html
- v14 has 14 scene transition types and the default is a subtle fade. https://foundryvtt.com/releases/14.352
- `SceneDirectory` is an ApplicationV2 class. https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.SceneDirectory.html
- ApplicationV2 header-control hook: `getHeaderControlsApplicationV2`. https://foundryvtt.com/api/v13/functions/hookEvents.getHeaderControlsApplicationV2.html

## 5. UNVERIFIED items to check first

1. Hook and DOM for the Scenes tab button: expected `renderSceneDirectory(app, html: HTMLElement, ...)` and the selector of the header action row in v14.
2. Exact `Scene.createDocuments` payload for a Level background; whether `width`/`height` are derived from the Level background automatically or must be passed; thumbnail generation for Level-based Scenes.
3. Whether `backgroundColor` and `padding` are still top-level Scene fields when Levels are used.
4. Where the list of transition types lives (config object path) and the internal key for "Wind".
5. `FilePicker` v14 signatures: `upload`, `browse`, `createDirectory`, `implementation`; behavior of the `data` source; required permission (`FILES_UPLOAD`); upload return value (final path).
6. ApplicationV2 + HandlebarsApplicationMixin specifics for a full-viewport window (DEFAULT_OPTIONS keys, how to hide the standard frame/title bar or style it), `_onRender` for wiring native drag-and-drop events.
7. `CONST.GRID_TYPES.GRIDLESS` (believed to be 0) and existence of `CONST.IMAGE_FILE_EXTENSIONS` / `CONST.VIDEO_FILE_EXTENSIONS` in v14.
8. Permission constant used to decide who sees the button (Scene creation).

Fastest fix: add `foundryvtt.com` under Allowed domains in the cloud environment's network settings so the API pages can be read.

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
