/**
 * Turn a file name or path into a readable Scene name: drop the folders and the
 * last extension, turn underscores and dashes into spaces, collapse repeated
 * spaces. Letter case is left alone.
 */
export function prettifyName(fileName) {
  const base = fileName.split(/[\\/]/).pop();
  const withoutExtension = base.replace(/\.[^./\\]+$/, "");
  const pretty = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return pretty || withoutExtension || base;
}
