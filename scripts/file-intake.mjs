// Turning dropped or picked files into { file, path } items. path is the
// relative path including any dropped folder names, e.g. "Maps/Inn/Night.webp".

const withoutLeadingSlash = (path) => path.replace(/^\//, "");

function readFile(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** A directory reader hands out its entries in batches; keep reading until it is empty. */
async function readAllEntries(reader) {
  const entries = [];
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

/** Every file below a FileSystemEntry, folders included recursively. */
export async function walkEntry(entry) {
  if (entry.isFile) return [{ file: await readFile(entry), path: withoutLeadingSlash(entry.fullPath) }];
  if (!entry.isDirectory) return [];
  const children = await readAllEntries(entry.createReader());
  return (await Promise.all(children.map(walkEntry))).flat();
}

/** Items from the file list of an <input type="file">, with folder paths when it picked a folder. */
export function itemsFromFileList(files) {
  return [...files].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

/**
 * Items from a drop event's DataTransfer. The entries must be requested before
 * the first await, because the browser empties the DataTransfer once the drop
 * handler returns; that is why this function is not split up further.
 */
export function collectDropped(dataTransfer) {
  const entries = [...dataTransfer.items]
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);

  if (entries.length === 0) return Promise.resolve(itemsFromFileList(dataTransfer.files));
  return Promise.all(entries.map(walkEntry)).then((nested) => nested.flat());
}
