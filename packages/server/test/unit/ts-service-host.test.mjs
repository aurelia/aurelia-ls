import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { createPathUtils } from "../../out/services/paths.js";
import { OverlayFs } from "../../out/services/overlay-fs.js";
import { TsService } from "../../out/services/ts-service.js";

const fixtureRoot = fileURLToPath(new URL("../../../../fixtures/server/ts-host/basic", import.meta.url));
const componentPath = path.join(fixtureRoot, "src", "component.ts");

function createLogger() {
  return {
    log() {},
    info() {},
    warn() {},
    error() {},
  };
}

function createHarness() {
  const paths = createPathUtils();
  const overlay = new OverlayFs(paths);
  const tsService = new TsService(overlay, paths, createLogger());
  return { paths, overlay, tsService };
}

test("configure loads tsconfig and base roots", () => {
  const { tsService, overlay, paths } = createHarness();
  const before = tsService.getProjectVersion();
  tsService.configure({ workspaceRoot: fixtureRoot });

  assert.equal(tsService.compilerOptions().allowJs, false);
  assert.equal(tsService.compilerOptions().target, ts.ScriptTarget.ES2020);
  assert.equal(tsService.getProjectVersion(), before + 1);

  const canonicalComponent = paths.canonical(componentPath);
  assert.ok(tsService.getRootFileNames().includes(canonicalComponent));
  assert.ok(new Set(overlay.listScriptRoots()).has(canonicalComponent));
});

test("overlays are treated as script roots and preferred for snapshots", () => {
  const { tsService, paths } = createHarness();
  tsService.configure({ workspaceRoot: fixtureRoot });

  const overlayPath = componentPath;
  tsService.upsertOverlay(overlayPath, "export const fromOverlay = 1;");

  const program = tsService.getService().getProgram();
  const sourceFile = program?.getSourceFile(paths.canonical(overlayPath));
  assert.ok(sourceFile, "expected overlay source file in program");
  assert.ok(sourceFile.text.includes("fromOverlay"), "overlay text should win over disk");

  const virtualOverlay = path.join(fixtureRoot, ".aurelia", "virtual.ts");
  tsService.upsertOverlay(virtualOverlay, "export const virtual = 1;");
  const roots = tsService.getService().getProgram()?.getRootFileNames() ?? [];
  assert.ok(roots.includes(paths.canonical(virtualOverlay)), "virtual overlay should be a root file");
});

test("configure reloads when tsconfig changes on disk", (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-ls-tsconfig-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const tsconfigPath = path.join(tmp, "tsconfig.json");
  const srcDir = path.join(tmp, "src");
  const filePath = path.join(srcDir, "example.ts");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(filePath, "export const value = 1;");
  fs.writeFileSync(tsconfigPath, JSON.stringify({
    compilerOptions: { target: "ES2019" },
    include: ["src/**/*"],
  }));

  const { tsService, paths } = createHarness();
  tsService.configure({ workspaceRoot: tmp, tsconfigPath });

  const baselineVersion = tsService.getProjectVersion();
  const baselineTarget = tsService.compilerOptions().target;
  assert.ok(tsService.getRootFileNames().includes(paths.canonical(filePath)));

  fs.writeFileSync(tsconfigPath, JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext" },
    include: ["src/**/*"],
  }));

  tsService.configure({ workspaceRoot: tmp, tsconfigPath });

  assert.ok(tsService.getProjectVersion() > baselineVersion, "project version should bump after config change");
  assert.notEqual(tsService.compilerOptions().target, baselineTarget, "compiler options should reflect updated tsconfig");
});
