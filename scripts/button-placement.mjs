/**
 * Put the Multi-Scene button next to the built-in Create Scene button. If that
 * button cannot be found (the core template changed), fall back to the header
 * of the directory, then to the top of the tab. Does nothing and returns false
 * when a Multi-Scene button is already there, because the render hook fires
 * again on every re-render.
 */
export function insertButton(element, button) {
  if (element.querySelector("[data-multi-scene]")) return false;

  const createButton = element.querySelector('[data-action="createEntry"]');
  if (createButton) {
    createButton.after(button);
    return true;
  }

  const header = element.querySelector("header");
  if (header) header.append(button);
  else element.prepend(button);
  return true;
}
