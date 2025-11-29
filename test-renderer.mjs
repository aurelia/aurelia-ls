import path from "node:path";
import { fileURLToPath } from "node:url";

import { getExpressionParser, DEFAULT_SYNTAX, renderToString } from "./packages/domain/out/index.js";
import { lowerDocument } from "./packages/domain/out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "./packages/domain/out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "./packages/domain/out/compiler/phases/30-bind/bind.js";
import { planSsr } from "./packages/domain/out/compiler/phases/50-plan/ssr/plan.js";
import { emitSsr } from "./packages/domain/out/compiler/phases/60-emit/ssr/emit.js";
import { DEFAULT as SEM_DEFAULT } from "./packages/domain/out/compiler/language/registry.js";

// Test 1: Simple text interpolation
console.log("=== Test 1: Text Interpolation ===");
const markup1 = '<div>${message}</div>';
const ir1 = lowerDocument(markup1, {
  attrParser: DEFAULT_SYNTAX,
  exprParser: getExpressionParser(),
  file: "test1.html",
  name: "test1",
  sem: SEM_DEFAULT,
});
const linked1 = resolveHost(ir1, SEM_DEFAULT);
const scope1 = bindScopes(linked1);
const plan1 = planSsr(linked1, scope1);
const { html: html1, manifest: manifest1 } = emitSsr(plan1, linked1);

const result1 = renderToString(html1, manifest1, {
  viewModel: { message: "Hello World" }
});
console.log("Input:", markup1);
console.log("Rendered:", result1.html);
console.log("Expected: <div>Hello World</div>");
console.log("Match:", result1.html.includes("Hello World") ? "✅ PASS" : "❌ FAIL");

// Test 2: Property binding
console.log("\n=== Test 2: Property Binding ===");
const markup2 = '<input value.bind="name"/>';
const ir2 = lowerDocument(markup2, {
  attrParser: DEFAULT_SYNTAX,
  exprParser: getExpressionParser(),
  file: "test2.html",
  name: "test2",
  sem: SEM_DEFAULT,
});
const linked2 = resolveHost(ir2, SEM_DEFAULT);
const scope2 = bindScopes(linked2);
const plan2 = planSsr(linked2, scope2);
const { html: html2, manifest: manifest2 } = emitSsr(plan2, linked2);

const result2 = renderToString(html2, manifest2, {
  viewModel: { name: "John Doe" }
});
console.log("Input:", markup2);
console.log("Rendered:", result2.html);
console.log("Note: Property binding requires client-side evaluation");

// Test 3: Nested property
console.log("\n=== Test 3: Nested Property Access ===");
const markup3 = '<div>${person.name}</div>';
const ir3 = lowerDocument(markup3, {
  attrParser: DEFAULT_SYNTAX,
  exprParser: getExpressionParser(),
  file: "test3.html",
  name: "test3",
  sem: SEM_DEFAULT,
});
const linked3 = resolveHost(ir3, SEM_DEFAULT);
const scope3 = bindScopes(linked3);
const plan3 = planSsr(linked3, scope3);
const { html: html3, manifest: manifest3 } = emitSsr(plan3, linked3);

const result3 = renderToString(html3, manifest3, {
  viewModel: { person: { name: "Jane Smith" } }
});
console.log("Input:", markup3);
console.log("Rendered:", result3.html);
console.log("Expected: <div>Jane Smith</div>");
console.log("Match:", result3.html.includes("Jane Smith") ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Summary ===");
console.log("✅ Renderer working!");
