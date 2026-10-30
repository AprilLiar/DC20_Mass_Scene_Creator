import { applyOptions } from "./options/index.mjs";
import { NEW_FOLDER } from "./options/scene-folder.mjs";
import { prettifyName } from "./names.mjs";

/** Language key explaining why a run cannot start, or null when it can. */
export function checkRun({ rows, values, newFolderName }) {
  if (rows.length === 0) return "MULTISCENE.Run.NoRows";
  if (values.sceneFolder === NEW_FOLDER && !newFolderName.trim()) return "MULTISCENE.Run.FolderNameRequired";
  return null;
}

/** The data of one Scene: name, background Level, size, then everything the options add. */
export async function buildSceneData(row, path, media, values, context) {
  const sceneData = {
    name: row.name.trim() || prettifyName(row.path),
    levels: [{ background: { src: path } }],
    width: media.width,
    height: media.height
  };
  await applyOptions(sceneData, values, context);
  return sceneData;
}

/**
 * Create one Scene per row, one after the other: upload the file, build the
 * data, create the Scene. A row that fails is recorded and the rest carry on.
 * Only problems that stop every row (the upload folder cannot be prepared, the
 * new Scene folder cannot be created) reject.
 *
 * deps: { prepareUploads, createFolder, loadMedia, ensureUploaded, sampleColor, createScene }
 * Returns { created: [{ row, scene }], failures: [{ row, reason }], stopped }.
 */
export async function createScenes({ rows, values, newFolderName, shouldStop, onProgress }, deps) {
  const created = [];
  const failures = [];

  if (values.sceneFolder === NEW_FOLDER) {
    const folder = await deps.createFolder(newFolderName.trim());
    values = { ...values, sceneFolder: folder.id };
  }
  await deps.prepareUploads();

  const total = rows.length;
  let done = 0;
  let stopped = false;
  onProgress({ done, total });

  for (const row of rows) {
    if (shouldStop()) {
      stopped = true;
      break;
    }
    let media = null;
    try {
      media = await deps.loadMedia(row);
      const path = await deps.ensureUploaded(row.file);
      const context = {
        getDominantColor: async () => {
          try {
            return deps.sampleColor(media);
          } catch (error) {
            console.warn("multi-scene | could not read the picture color", error);
            return null;
          }
        }
      };
      const sceneData = await buildSceneData(row, path, media, values, context);
      created.push({ row, scene: await deps.createScene(sceneData) });
    } catch (error) {
      failures.push({ row, reason: error?.message ?? String(error) });
    } finally {
      media?.dispose?.();
    }
    done += 1;
    onProgress({ done, total });
  }

  return { created, failures, stopped };
}
