/**
 * Regenerate SSR golden files after manifest format changes
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DefaultTemplateBuildService,
  DefaultTemplateProgram,
} from "./packages/compiler/out/program/index.js";
import { DEFAULT_SYNTAX, getExpressionParser } from "./packages/compiler/out/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_VM = {
  getRootVmTypeExpr: () => "RootVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

const ssrFixtures = [
  {
    name: "basic",
    dir: path.join(__dirname, "fixtures/ssr/basic/src/"),
    template: "my-app",
    vm: { getRootVmTypeExpr: () => "MyApp" },
  },
  {
    name: "nested",
    dir: path.join(__dirname, "fixtures/ssr/nested/"),
    template: "template",
    vm: { getRootVmTypeExpr: () => "NestedVm" },
  },
  {
    name: "kitchen-sink",
    dir: path.join(__dirname, "fixtures/overlays/kitchen-sink/"),
    template: "template",
    vm: { getRootVmTypeExpr: () => "any" },
  },
];

function createProgram(vmTypeProvider) {
  return new DefaultTemplateProgram({
    tsconfig: { compilerOptions: {} },
    exprParser: getExpressionParser(),
    attrParser: DEFAULT_SYNTAX,
    vmTypeProvider,
  });
}

function getCanonicalUri(filePath) {
  return new URL("file://" + filePath.replace(/\\/g, "/")).href;
}

async function loadFixture(dir, templateName) {
  const htmlPath = path.join(dir, `${templateName}.html`);
  const markup = fs.readFileSync(htmlPath, "utf8");
  const uri = getCanonicalUri(htmlPath);
  return { uri, markup };
}

async function regenerateGoldens() {
  console.log("Regenerating SSR golden files...\n");

  for (const fixture of ssrFixtures) {
    console.log(`Processing ${fixture.name}...`);

    const loaded = await loadFixture(fixture.dir, fixture.template);
    const program = createProgram(fixture.vm);
    program.upsertTemplate(loaded.uri, loaded.markup);

    const build = new DefaultTemplateBuildService(program);
    const artifact = build.getSsr(loaded.uri);

    // Save manifest
    const manifestPath = path.join(fixture.dir, `${fixture.template}.__au.ssr.json`);
    fs.writeFileSync(manifestPath, artifact.manifest.text, "utf8");
    console.log(`  ✓ Updated ${path.basename(manifestPath)}`);

    // Save HTML
    const htmlPath = path.join(fixture.dir, `${fixture.template}.__au.ssr.html`);
    fs.writeFileSync(htmlPath, artifact.html.text, "utf8");
    console.log(`  ✓ Updated ${path.basename(htmlPath)}`);
  }

  console.log("\n✅ All goldens regenerated!");
}

await regenerateGoldens();
