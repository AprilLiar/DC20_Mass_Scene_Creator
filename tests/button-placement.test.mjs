import assert from "node:assert/strict";
import { test } from "node:test";
import { insertButton } from "../scripts/button-placement.mjs";

/** Minimal stand-in for a DOM element: records where things were put. */
function fakeElement(name, matches = {}) {
  const calls = [];
  return {
    name,
    calls,
    querySelector: (selector) => matches[selector] ?? null,
    after: (node) => calls.push(["after", node]),
    append: (node) => calls.push(["append", node]),
    prepend: (node) => calls.push(["prepend", node])
  };
}

const button = { name: "multi-scene button" };

test("the button goes right after the Create Scene button", () => {
  const create = fakeElement("create");
  const element = fakeElement("tab", { '[data-action="createEntry"]': create });
  assert.equal(insertButton(element, button), true);
  assert.deepEqual(create.calls, [["after", button]]);
  assert.deepEqual(element.calls, []);
});

test("without a Create Scene button it is appended to the header", () => {
  const header = fakeElement("header");
  const element = fakeElement("tab", { header });
  assert.equal(insertButton(element, button), true);
  assert.deepEqual(header.calls, [["append", button]]);
});

test("without a header it is placed at the top of the tab", () => {
  const element = fakeElement("tab");
  assert.equal(insertButton(element, button), true);
  assert.deepEqual(element.calls, [["prepend", button]]);
});

test("an existing Multi-Scene button is never duplicated", () => {
  const create = fakeElement("create");
  const element = fakeElement("tab", {
    "[data-multi-scene]": fakeElement("existing"),
    '[data-action="createEntry"]': create
  });
  assert.equal(insertButton(element, button), false);
  assert.deepEqual(create.calls, []);
  assert.deepEqual(element.calls, []);
});
