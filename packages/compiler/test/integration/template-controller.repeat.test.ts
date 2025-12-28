import { test, describe, it } from "vitest";
import { compileFromEntry, assertSuccess, prop } from "./_helpers/overlay-ls.js";

const compilerIndexUrl = new URL("../../out/index.js", import.meta.url);
const { PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(compilerIndexUrl.href);

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

let seq = 0;
const nextBase = (langKey, slug) => `${langKey}-tc-repeat-${String(++seq).padStart(3, "0")}-${slug}`;

const langs = [
  { name: "TypeScript", langKey: "ts", isJs: false },
  { name: "JavaScript", langKey: "js", isJs: true  },
  { name: "ESM",        langKey: "mjs", isJs: true  },
];

function entryWithFiles(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('files', 'FileList', isTs)}
}
`;
}
function entryKitchenSink(isJs) {
  const isTs = !isJs;
  const head = isTs ? "import { customElement } from '@aurelia/runtime-html';\n" : "";
  return `
${head}import template from './view.html';
${isTs ? "@customElement({ name: 'foo', template })" : ""}
export class Foo {
  ${prop('prop', 'Map<string, Set<number>>[]', isTs)}
}
`;
}

for (const lang of langs) {
  describe(`type-checking / template-controller.repeat (misc) — ${lang.name}`, () => {
    it(`repeat FileList - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="file of files">\${file.name}</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryWithFiles(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "filelist-pass"),
      });
      assertSuccess(ts, diags);
    });

    it(`repeat - kitchen sink - pass`, async () => {
      const { ts, diags } = await compileFromEntry({
        html: `<template repeat.for="map of prop">
  <template repeat.for="[key, value] of map">
    \${key.toUpperCase()}
    <template repeat.for="item of value">
      <template repeat.for="i of item">\${i.toExponential(2)}</template>
    </template>
  </template>
</template>`,
        markupFile: "view.html",
        isJs: lang.isJs,
        entrySource: entryKitchenSink(lang.isJs),
        preludeText: PRELUDE_TS, exprParser, attrParser,
        overlayBaseName: nextBase(lang.langKey, "kitchen-sink"),
      });
      assertSuccess(ts, diags);
    });
  });
}
