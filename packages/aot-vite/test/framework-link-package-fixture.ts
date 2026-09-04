import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type {
  AotFrameworkLinkPackageInput,
  AotFrameworkLinksOptions,
  AotLinkedFrameworkPackageArtifact,
  AotPreparedFrameworkLinksApplied,
} from "../src/index.js";

/** Small real import graph: all three public entries must share one kernel object. */
export async function frameworkPackageFixture(temporaryRoots: string[]) {
  const root = await mkdtemp(path.join(tmpdir(), "aurelia-aot-link-packages-"));
  temporaryRoots.push(root);
  const modules: AotFrameworkLinksOptions["modules"][number][] = [];
  const packages: AotFrameworkLinkPackageInput[] = [];
  const artifacts: AotPreparedFrameworkLinksApplied["modules"][number][] = [];
  const packageArtifacts: AotLinkedFrameworkPackageArtifact[] = [];
  for (const name of ["kernel", "runtime", "runtime-html"]) {
    const packageName = `@aurelia/${name}`;
    const packageRoot = path.join(root, name);
    const standardEntry = path.join(packageRoot, "dist/esm/index.mjs");
    const entryResolvedId = path.join(packageRoot, "dist/link/index.mjs");
    const dependency = name === "runtime-html" ? "runtime" : "kernel";
    const shared = name === "kernel"
      ? "export const singleton = {};\n"
      : `export { singleton } from '../../../${dependency}/dist/esm/index.mjs';\n`;
    const standardCode = shared + "export const marker = 'ordinary';\n";
    const linkedCode = "export * from '../link/index.mjs';\n";
    const packageCode = shared + "export const marker = 'linked';\n//# sourceMappingURL=index.mjs.map\n";
    const unusedId = path.join(packageRoot, "dist/link/unused.mjs");
    const unusedCode = "export const unused = 'unreached';\n";
    const manifestSha256 = digest(name);
    const sourceMap = {
      version: 3,
      file: "index.mjs",
      sources: name === "kernel" ? ["../../src/index.ts"] : [],
      sourcesContent: name === "kernel" ? [packageCode] : [],
      names: [],
      mappings: name === "kernel" ? "AAAA" : ";;",
    };
    await mkdir(path.dirname(standardEntry), { recursive: true });
    await mkdir(path.dirname(entryResolvedId), { recursive: true });
    await Promise.all([
      writeFile(standardEntry, standardCode),
      writeFile(entryResolvedId, packageCode),
      writeFile(unusedId, unusedCode),
    ]);
    modules.push({
      role: "target", packageName, packageRelativePath: "dist/esm/index.mjs",
      resolvedId: standardEntry, expectedSha256: digest(standardCode),
    });
    packages.push({
      packageName, packageRoot, expectedManifestSha256: manifestSha256,
      expectedStandardEntrySha256: digest(standardCode),
    });
    artifacts.push({
      packageName, packageRelativePath: "dist/esm/index.mjs", resolvedId: standardEntry,
      inputSha256: digest(standardCode), linkedSha256: digest(linkedCode), code: linkedCode, map: null,
    });
    packageArtifacts.push({
      packageName, packageRoot, manifestSha256, entryResolvedId,
      modules: [
        { resolvedId: entryResolvedId, sha256: digest(packageCode), code: packageCode, map: sourceMap },
        { resolvedId: unusedId, sha256: digest(unusedCode), code: unusedCode, map: sourceMap },
      ],
    });
  }
  const entry = path.join(root, "main.js");
  await writeFile(entry, [
    "import { singleton as kernel, marker } from './kernel/dist/esm/index.mjs';",
    "import { singleton as runtime } from './runtime/dist/esm/index.mjs';",
    "import { singleton as html } from './runtime-html/dist/esm/index.mjs';",
    "export const sameIdentity = kernel === runtime && runtime === html;",
    "export { marker };",
  ].join("\n"));
  const options: AotFrameworkLinksOptions = {
    protocol: 1, graphFingerprint: digest("package-graph"), mapPosture: "performance-no-map",
    policy: "allow-c0-fallback", modules, packages,
  };
  const result: AotPreparedFrameworkLinksApplied = {
    disposition: "applied", recipeFingerprint: digest("package-recipe"), modules: artifacts, packages: packageArtifacts,
  };
  return { root, entry, options, result, packages: packageArtifacts };
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
