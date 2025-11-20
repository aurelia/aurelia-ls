import test from "node:test";
import assert from "node:assert/strict";

const emitterUrl = new URL("../../out/compiler/phases/60-emit/overlay.js", import.meta.url);
const { emitOverlayFile } = await import(emitterUrl.href);

test("Emit overlay: TS flavor (type alias + __au$access calls)", () => {
  const plan = {
    templates: [{
      name: "T0",
      frames: [{
        frame: 1,
        typeName: "T",
        typeExpr: "{ x: number }",
        lambdas: ["o => o.x", "o => o['y']"],
      }],
    }],
  };
  const { text } = emitOverlayFile(plan, { isJs: false, filename: "__test.overlay" });

  assert.match(text, /type T = \{ x: number \}/, "should emit type alias");
  assert.match(text, /__au\$access<T>\(o => o\.x\);/, "should emit first lambda");
  assert.match(text, /__au\$access<T>\(o => o\['y'\]\);/, "should emit bracket-access lambda");
});
