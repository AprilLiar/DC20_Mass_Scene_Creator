// Files that are never worth reporting: hidden files and OS leftovers.
const IGNORED_FILES = new Set(["thumbs.db", "desktop.ini"]);

/** Lower-case extension of a file name or path without the dot, or "" if there is none. */
export function extensionOf(name) {
  const base = name.split(/[\\/]/).pop();
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** "image", "video" or null. kinds is { image: Set of extensions, video: Set of extensions }. */
export function mediaKind(name, kinds) {
  const extension = extensionOf(name);
  if (kinds.image.has(extension)) return "image";
  if (kinds.video.has(extension)) return "video";
  return null;
}

export function isIgnoredFile(name) {
  const base = name.split(/[\\/]/).pop();
  return base.startsWith(".") || IGNORED_FILES.has(base.toLowerCase());
}

/** Value for an <input type="file" accept="..."> attribute. */
export function acceptAttribute(kinds) {
  return [...kinds.image, ...kinds.video].map((extension) => `.${extension}`).join(",");
}

/** The extensions Foundry supports for images and videos. */
export function foundryMediaKinds() {
  return {
    image: new Set(Object.keys(CONST.IMAGE_FILE_EXTENSIONS)),
    video: new Set(Object.keys(CONST.VIDEO_FILE_EXTENSIONS))
  };
}
