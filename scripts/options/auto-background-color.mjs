// In Foundry v14 the Scene has no background color of its own any more (a
// top-level backgroundColor is silently dropped). The color belongs to the
// Level that holds the background picture: levels[].background.color.
export default {
  id: "autoBackgroundColor",
  type: "boolean",
  default: true,
  label: "MULTISCENE.Options.AutoBackgroundColor.Label",
  hint: "MULTISCENE.Options.AutoBackgroundColor.Hint",
  async apply(sceneData, value, context) {
    const level = sceneData.levels?.[0];
    if (!value || !level) return;
    const color = await context.getDominantColor();
    if (color) level.background = { ...level.background, color };
  }
};
