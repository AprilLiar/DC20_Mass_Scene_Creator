/** Increment the patch part of a plain x.y.z version. */
export function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Not a plain x.y.z version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

/** The manifest and download URLs Foundry needs for a given release. */
export function releaseUrls(repo, version) {
  const base = `https://github.com/${repo}/releases`;
  return {
    manifest: `${base}/latest/download/module.json`,
    download: `${base}/download/v${version}/module.zip`
  };
}

/** Return a copy of the manifest set to the given version and release URLs. */
export function applyRelease(manifest, repo, version) {
  return { ...manifest, version, ...releaseUrls(repo, version) };
}
