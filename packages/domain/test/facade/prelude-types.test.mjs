import test from "node:test";
import assert from "node:assert/strict";
import { createProgramFromMemory } from "../_helpers/ts-harness.mjs";
import { PRELUDE_TS } from "../../out/index.js";

test("Prelude: __au$access and CollectionElement<> typings behave", () => {
  const src = `
type V = { a: string; arr: number[]; };
type E = CollectionElement<V["arr"]>; // number
__au$access<V>(o => o.a.toUpperCase());      // ok
__au$access<V>(o => (null as unknown as E).toFixed(2)); // ok
__au$access<V>(o => o.b); // ERROR: b missing
  `;
  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    "/mem/user.ts": src,
  };
  const roots = Object.keys(files);

  const { ts, program } = createProgramFromMemory(files, roots);
  const sf = program.getSourceFile("/mem/user.ts");
  assert.ok(sf, "user.ts must exist");

  const diags = ts.getPreEmitDiagnostics(program, sf);
  assert.ok(diags.length > 0, "should have at least one diagnostic");

  const hasB = diags.some(d =>
    String(d.messageText).includes("does not exist") &&
    String(d.messageText).includes("b")
  );
  assert.ok(hasB, "should report missing property 'b'");
});
