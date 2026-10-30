import { isIgnoredFile, mediaKind } from "./media-types.mjs";
import { prettifyName } from "./names.mjs";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Items ordered alphabetically by path, with numbers compared as numbers (map2 before map10). */
export function sortItems(items) {
  return [...items].sort((a, b) => collator.compare(a.path, b.path));
}

function isSameFile(a, b) {
  return a.path === b.path && a.file.size === b.file.size && a.file.lastModified === b.file.lastModified;
}

/**
 * Add dropped or picked items ({ file, path }) to the list of rows.
 *
 * The new items are sorted among themselves and appended after the existing
 * rows, so rows the user already edited never move. Unsupported types are
 * counted, exact repeats (same path, size and date) are counted and skipped,
 * and hidden or OS leftover files are dropped without counting.
 */
export function addItems(rows, items, kinds, nextId) {
  const added = [];
  let unsupported = 0;
  let duplicates = 0;

  for (const item of sortItems(items)) {
    if (isIgnoredFile(item.path)) continue;
    const kind = mediaKind(item.path, kinds);
    if (!kind) {
      unsupported += 1;
      continue;
    }
    if (rows.some((row) => isSameFile(row, item)) || added.some((row) => isSameFile(row, item))) {
      duplicates += 1;
      continue;
    }
    added.push({ id: nextId(), file: item.file, path: item.path, kind, name: prettifyName(item.path) });
  }

  return { rows: [...rows, ...added], added, unsupported, duplicates };
}
