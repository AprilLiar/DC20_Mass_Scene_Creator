const LOAD_TIMEOUT_MS = 20000;

function waitFor(target, event, errorEvent = "error") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(game.i18n.localize("MULTISCENE.Run.CouldNotRead"))), LOAD_TIMEOUT_MS);
    target.addEventListener(
      event,
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
    target.addEventListener(
      errorEvent,
      () => {
        clearTimeout(timer);
        reject(new Error(game.i18n.localize("MULTISCENE.Run.CouldNotRead")));
      },
      { once: true }
    );
  });
}

/**
 * Open an image or video from an object URL and report its pixel size.
 * Returns { source, width, height, dispose }; source can be drawn on a canvas
 * (a video shows its first frame).
 */
export async function loadMedia(url, kind) {
  let source;
  let width;
  let height;
  let dispose = () => {};

  if (kind === "video") {
    source = document.createElement("video");
    source.muted = true;
    source.preload = "auto";
    const loaded = waitFor(source, "loadeddata");
    source.src = url;
    await loaded;
    width = source.videoWidth;
    height = source.videoHeight;
    dispose = () => {
      source.removeAttribute("src");
      source.load();
    };
  } else {
    source = new Image();
    source.src = url;
    await source.decode().catch(() => {
      throw new Error(game.i18n.localize("MULTISCENE.Run.CouldNotRead"));
    });
    width = source.naturalWidth;
    height = source.naturalHeight;
  }

  if (!width || !height) {
    dispose();
    throw new Error(game.i18n.localize("MULTISCENE.Run.CouldNotRead"));
  }
  return { source, width, height, dispose };
}
