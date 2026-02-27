import { compileAot, BUILTIN_SEMANTICS } from "./packages/compiler/out/index.js";

const markup = "<div>${message}</div>";
const result = compileAot(markup, {
  templatePath: "test.html",
  name: "test",
  semantics: BUILTIN_SEMANTICS,
  moduleResolver: () => null,
});

console.log("Template HTML:");
console.log(result.template);

console.log("\nAOT Definition:");
console.log(JSON.stringify(result.codeResult.definition, null, 2));

console.log("\nExpressions:");
console.log(JSON.stringify(result.codeResult.expressions, null, 2));
