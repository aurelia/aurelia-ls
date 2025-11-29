import { getExpressionParser, DEFAULT_SYNTAX } from "./packages/domain/out/index.js";
import { lowerDocument } from "./packages/domain/out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "./packages/domain/out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "./packages/domain/out/compiler/phases/30-bind/bind.js";
import { planSsr } from "./packages/domain/out/compiler/phases/50-plan/ssr/plan.js";
import { emitSsr } from "./packages/domain/out/compiler/phases/60-emit/ssr/emit.js";
import { DEFAULT as SEM_DEFAULT } from "./packages/domain/out/compiler/language/registry.js";

const markup = '<div>${message}</div>';
const ir = lowerDocument(markup, {
  attrParser: DEFAULT_SYNTAX,
  exprParser: getExpressionParser(),
  file: "test.html",
  name: "test",
  sem: SEM_DEFAULT,
});
const linked = resolveHost(ir, SEM_DEFAULT);
const scope = bindScopes(linked);
const plan = planSsr(linked, scope);
const { html, manifest } = emitSsr(plan, linked);

console.log("HTML Skeleton:");
console.log(html);
console.log("\nHTML (JSON):");
console.log(JSON.stringify(html));

const parsed = JSON.parse(manifest);
console.log("\nExpressions:");
console.log(JSON.stringify(parsed.expressions, null, 2));
