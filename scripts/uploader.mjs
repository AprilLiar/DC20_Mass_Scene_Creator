const SOURCE = "data";
const HASH_LENGTH = 8;
const MAX_BASE_LENGTH = 80;

/** First characters of the SHA-256 of the file's bytes. */
export async function hashFile(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, HASH_LENGTH);
}

/**
 * File name used on the server: the original name made safe, plus a hash of
 * the content, so the same name is only ever reused for the same bytes.
 * "Dark Forest 01.PNG" -> "Dark_Forest_01-3fa9c1d2.png". Letters and digits of
 * any script are kept.
 */
export function uploadName(fileName, hash) {
  const dot = fileName.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < fileName.length - 1;
  const base = hasExtension ? fileName.slice(0, dot) : fileName;
  const extension = hasExtension ? fileName.slice(dot + 1).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") : "";

  const safeBase =
    base
      .replace(/[^\p{L}\p{N}._-]+/gu, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, MAX_BASE_LENGTH) || "scene";
  return `${safeBase}-${hash}${extension ? `.${extension}` : ""}`;
}

function fileNameOf(path) {
  const last = path.split("/").pop();
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/**
 * The upload folder in the world's data directory. picker is Foundry's
 * FilePicker class (browse, createDirectory, upload).
 */
export class UploadFolder {
  #picker;
  #directory;
  #known = new Map();

  constructor(picker, directory) {
    this.#picker = picker;
    this.#directory = directory;
  }

  /** Create the folder if it is missing and remember which files are already in it. */
  async prepare() {
    let listing;
    try {
      listing = await this.#picker.browse(SOURCE, this.#directory);
    } catch {
      await this.#picker.createDirectory(SOURCE, this.#directory);
      listing = { files: [] };
    }
    this.#known = new Map((listing.files ?? []).map((path) => [fileNameOf(path), path]));
  }

  /** Path of the file on the server; uploads it unless the same content is already there. */
  async ensureUploaded(file) {
    const name = uploadName(file.name, await hashFile(file));
    if (this.#known.has(name)) return this.#known.get(name);

    const upload = new File([file], name, { type: file.type });
    const response = await this.#picker.upload(SOURCE, this.#directory, upload, {}, { notify: false });
    const path = typeof response?.path === "string" ? response.path : `${this.#directory}/${name}`;
    this.#known.set(name, path);
    return path;
  }
}
