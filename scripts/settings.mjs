const MODULE_ID = "multi-scene";
const LAST_OPTIONS = "lastOptions";

/** A per-user (client) setting that remembers the option values of the last run. It has no entry in the settings menu. */
export function registerSettings() {
  game.settings.register(MODULE_ID, LAST_OPTIONS, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
}

export function loadSavedOptions() {
  return game.settings.get(MODULE_ID, LAST_OPTIONS);
}

export function saveOptions(values) {
  return game.settings.set(MODULE_ID, LAST_OPTIONS, values);
}
