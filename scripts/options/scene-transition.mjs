const PREFERRED_TRANSITION = "wind";

/** Dropdown entries from CONFIG.Canvas.sceneTransitions: {value: id, label: localized}. */
export function buildTransitionChoices(sceneTransitions, localize) {
  return Object.entries(sceneTransitions ?? {}).map(([key, transition]) => ({
    value: transition.id ?? key,
    label: localize(transition.label)
  }));
}

/**
 * Wind if Foundry has it (matched by id or label). Otherwise Foundry's own
 * default transition, then the first entry; `found` is false in that case so the
 * UI can warn.
 */
export function pickDefaultTransition(choices, foundryDefaultId) {
  const wind = choices.find(
    (choice) => choice.value.toLowerCase() === PREFERRED_TRANSITION || choice.label.toLowerCase() === PREFERRED_TRANSITION
  );
  if (wind) return { value: wind.value, found: true };
  const fallback = choices.find((choice) => choice.value === foundryDefaultId) ?? choices[0];
  return { value: fallback?.value ?? "", found: false };
}

export default {
  id: "sceneTransition",
  type: "select",
  label: "MULTISCENE.Options.SceneTransition.Label",
  hint: "MULTISCENE.Options.SceneTransition.Hint",
  /** env: { sceneTransitions, localize, foundryDefaultId } */
  choices: (env) => buildTransitionChoices(env.sceneTransitions, env.localize),
  default: (env) => pickDefaultTransition(buildTransitionChoices(env.sceneTransitions, env.localize), env.foundryDefaultId).value,
  apply(sceneData, value) {
    if (value) sceneData.transition = { ...sceneData.transition, type: value };
  }
};
