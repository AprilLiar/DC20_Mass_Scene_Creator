import assert from "node:assert/strict";
import { test } from "node:test";
import { dominantColor, rgbToHex } from "../scripts/color.mjs";

/** Flat RGBA buffer from [[r, g, b, a, count], ...]. */
function pixels(...groups) {
  const values = [];
  for (const [r, g, b, a, count] of groups) {
    for (let i = 0; i < count; i++) values.push(r, g, b, a);
  }
  return new Uint8ClampedArray(values);
}

test("the most frequent color wins", () => {
  const color = dominantColor(pixels([200, 10, 10, 255, 70], [10, 10, 200, 255, 30]));
  assert.deepEqual(color, { r: 200, g: 10, b: 10 });
});

test("similar colors are grouped and averaged, beating a smaller exact color", () => {
  const color = dominantColor(pixels([200, 10, 10, 255, 40], [205, 12, 12, 255, 40], [10, 10, 200, 255, 60]));
  assert.equal(rgbToHex(color), "#cb0b0b");
});

test("transparent pixels are ignored", () => {
  const color = dominantColor(pixels([0, 0, 0, 0, 100], [20, 200, 30, 255, 5]));
  assert.deepEqual(color, { r: 20, g: 200, b: 30 });
});

test("returns null when no pixel counts", () => {
  assert.equal(dominantColor(new Uint8ClampedArray(0)), null);
  assert.equal(dominantColor(pixels([10, 10, 10, 0, 50])), null);
});

test("a tie goes to the lower bucket, so the result is stable", () => {
  const color = dominantColor(pixels([200, 0, 0, 255, 10], [0, 0, 200, 255, 10]));
  assert.deepEqual(color, { r: 0, g: 0, b: 200 });
});

test("rgbToHex pads every channel to two digits", () => {
  assert.equal(rgbToHex({ r: 0, g: 5, b: 255 }), "#0005ff");
});
