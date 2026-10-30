const MAX_PERCENT = 50;

/** Scene padding is a fraction (0.25 = 25%); the panel works in percent. */
export function paddingFraction(percent) {
  const number = Number(percent);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), MAX_PERCENT) / 100;
}

export default {
  id: "padding",
  type: "number",
  default: 0,
  min: 0,
  max: MAX_PERCENT,
  step: 1,
  label: "MULTISCENE.Options.Padding.Label",
  hint: "MULTISCENE.Options.Padding.Hint",
  apply(sceneData, value) {
    sceneData.padding = paddingFraction(value);
  }
};
