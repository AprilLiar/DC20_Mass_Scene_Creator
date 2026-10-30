export default {
  id: "autoBackgroundColor",
  type: "boolean",
  default: true,
  label: "MULTISCENE.Options.AutoBackgroundColor.Label",
  hint: "MULTISCENE.Options.AutoBackgroundColor.Hint",
  async apply(sceneData, value, context) {
    if (!value) return;
    const color = await context.getDominantColor();
    if (color) sceneData.backgroundColor = color;
  }
};
