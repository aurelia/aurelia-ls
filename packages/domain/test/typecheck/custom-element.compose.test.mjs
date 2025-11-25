import test, { describe, it } from "node:test";
import { compileFromEntry, assertSuccess, assertFailure, prop } from "./_helpers/overlay-ls.mjs";

const domainIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(domainIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-compose-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryWithVm(isJs, className, vmProp = "vm") {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'app', template })" : ""}
export class ${className} {
  ${prop(vmProp, "any", isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / custom-element.compose - ${lang.name}`, () => {
    const className = "Foo";

    it("subject.bind overlays to VM prop (pass)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<au-compose subject.bind='vm'></au-compose>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithVm(lang.isJs, className, "vm"),
        className,
        overlayBaseName: nextBase(lang.langKey, "subject-pass"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertSuccess(ts, diags);
    });

    it("subject.bind missing on VM (fail)", async () => {
      const { ts, diags } = await compileFromEntry({
        html: "<au-compose subject.bind='vm'></au-compose>",
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithVm(lang.isJs, className, "other"),
        className,
        overlayBaseName: nextBase(lang.langKey, "subject-fail"),
        exprParser,
        attrParser,
        preludeText: PRELUDE_TS,
      });
      assertFailure(ts, diags, [/Property 'vm' does not exist/]);
    });
  });
}
