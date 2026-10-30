import { sampleSourceColor } from "./color.mjs";
import { loadMedia } from "./media-loader.mjs";
import { UploadFolder } from "./uploader.mjs";

/** The real Foundry calls behind createScenes. */
export function createFoundryDeps() {
  const uploads = new UploadFolder(foundry.applications.apps.FilePicker.implementation, `worlds/${game.world.id}/mass-scenes`);

  return {
    prepareUploads: () => uploads.prepare(),
    createFolder: (name) => CONFIG.Folder.documentClass.create({ name, type: "Scene" }),
    loadMedia: (row) => loadMedia(row.previewUrl, row.kind),
    ensureUploaded: (file) => uploads.ensureUploaded(file),
    sampleColor: (media) => sampleSourceColor(media.source, media.width, media.height),
    async createScene(sceneData) {
      const scene = await CONFIG.Scene.documentClass.create(sceneData);
      // Make sure the Scenes tab has a thumbnail even if Foundry did not generate one itself.
      if (scene && !scene.thumb) {
        try {
          const { thumb } = await scene.createThumbnail();
          await scene.update({ thumb });
        } catch (error) {
          console.warn("multi-scene | could not create a thumbnail", error);
        }
      }
      return scene;
    }
  };
}
