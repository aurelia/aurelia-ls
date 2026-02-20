import { test, expect, onTestFinished } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { createPathUtils, OverlayFs, TsService } from "@aurelia-ls/semantic-workspace";

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

test("path utils canonicalization follows explicit case-sensitivity policy", () => {
  const sensitive = createPathUtils(true);
  const insensitive = createPathUtils(false);
  const input = "C:\\Foo\\Bar.ts";

  expect(sensitive.canonical(input)).toBe("C:/Foo/Bar.ts");
  expect(insensitive.canonical(input)).toBe("c:/foo/bar.ts");
});

test("configure loads tsconfig and base roots", () => {
  const { tsService, overlay, paths } = createHarness();
  const before = tsService.getProjectVersion();
  tsService.configure({ workspaceRoot: fixtureRoot });

  expect(tsService.compilerOptions().allowJs).toBe(false);
  expect(tsService.compilerOptions().target).toBe(ts.ScriptTarget.ES2020);
  expect(tsService.getProjectVersion()).toBe(before + 1);

  const canonicalComponent = paths.canonical(componentPath);
  expect(tsService.getRootFileNames()).toContain(canonicalComponent);
  expect(new Set(overlay.listScriptRoots()).has(canonicalComponent)).toBe(true);
});

test("overlays are treated as script roots and preferred for snapshots", () => {
  const { tsService, paths } = createHarness();
  tsService.configure({ workspaceRoot: fixtureRoot });

  const overlayPath = componentPath;
  tsService.upsertOverlay(overlayPath, "export const fromOverlay = 1;");

  const program = tsService.getService().getProgram();
  const sourceFile = program?.getSourceFile(paths.canonical(overlayPath));
  expect(sourceFile, "expected overlay source file in program").toBeTruthy();
  expect(sourceFile.text, "overlay text should win over disk").toContain("fromOverlay");

  const virtualOverlay = path.join(fixtureRoot, ".aurelia", "virtual.ts");
  tsService.upsertOverlay(virtualOverlay, "export const virtual = 1;");
  const roots = tsService.getService().getProgram()?.getRootFileNames() ?? [];
  expect(roots, "virtual overlay should be a root file").toContain(paths.canonical(virtualOverlay));
});

test("configure reloads when tsconfig changes on disk", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-ls-tsconfig-"));
  onTestFinished(() => fs.rmSync(tmp, { recursive: true, force: true }));

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
  expect(tsService.getRootFileNames()).toContain(paths.canonical(filePath));

  fs.writeFileSync(tsconfigPath, JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext" },
    include: ["src/**/*"],
  }));

  tsService.configure({ workspaceRoot: tmp, tsconfigPath });

  expect(tsService.getProjectVersion(), "project version should bump after config change").toBeGreaterThan(baselineVersion);
  expect(tsService.compilerOptions().target, "compiler options should reflect updated tsconfig").not.toBe(baselineTarget);
});
