import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzePackages } from "../../../src/project-semantics/npm/index.js";
import { resourceName } from "./resource-helpers.js";

type TempPackage = {
  root: string;
  packagePath: string;
  cacheDir: string;
};

describe("npm analysis cache invalidation", () => {
  it("uses cached result when fingerprint is unchanged", async () => {
    const temp = createTempPackage("1.0.0", "cached-el");
    try {
      const first = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(first).toBe("cached-el");

      updateResource(temp.packagePath, "cached-el-updated");
      const second = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(second).toBe("cached-el");
    } finally {
      cleanupTempPackage(temp);
    }
  });

  it("re-analyzes when fingerprint changes", async () => {
    const temp = createTempPackage("1.0.0", "fingerprint-el");
    try {
      const first = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(first).toBe("fingerprint-el");

      updateResource(temp.packagePath, "fingerprint-el-next");
      const second = await analyze(temp, { fingerprint: "b", schemaVersion: 1 });
      expect(second).toBe("fingerprint-el-next");
    } finally {
      cleanupTempPackage(temp);
    }
  });

  it("re-analyzes when schema version changes", async () => {
    const temp = createTempPackage("1.0.0", "schema-el");
    try {
      const first = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(first).toBe("schema-el");

      updateResource(temp.packagePath, "schema-el-next");
      const second = await analyze(temp, { fingerprint: "a", schemaVersion: 2 });
      expect(second).toBe("schema-el-next");
    } finally {
      cleanupTempPackage(temp);
    }
  });

  it("re-analyzes when package.json metadata changes", async () => {
    const temp = createTempPackage("1.0.0", "version-el");
    try {
      const first = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(first).toBe("version-el");

      updateResource(temp.packagePath, "version-el-next");
      updateVersion(temp.packagePath, "1.0.1");
      const second = await analyze(temp, { fingerprint: "a", schemaVersion: 1 });
      expect(second).toBe("version-el-next");
    } finally {
      cleanupTempPackage(temp);
    }
  });
});

function analyze(
  temp: TempPackage,
  options: { fingerprint: string; schemaVersion: number },
): Promise<string> {
  return analyzePackages([temp.packagePath], {
    preferSource: true,
    cache: {
      dir: temp.cacheDir,
      mode: "read-write",
      fingerprint: options.fingerprint,
      schemaVersion: options.schemaVersion,
    },
  }).then((result) => {
    const analysis = result.get(temp.packagePath);
    if (!analysis) {
      throw new Error("Expected analysis result for temp package.");
    }
    const resource = analysis.value.resources[0];
    if (!resource) {
      throw new Error("Expected at least one resource in analysis.");
    }
    return resourceName(resource);
  });
}

function createTempPackage(version: string, elementName: string): TempPackage {
  const root = mkdtempSync(join(tmpdir(), "npm-cache-"));
  const packagePath = join(root, "package");
  const cacheDir = join(root, "cache");
  mkdirSync(join(packagePath, "src"), { recursive: true });
  writePackageJson(packagePath, {
    name: "aurelia-cache-fixture",
    version,
  });
  writeResource(packagePath, elementName);
  return { root, packagePath, cacheDir };
}

function cleanupTempPackage(temp: TempPackage): void {
  rmSync(temp.root, { recursive: true, force: true });
}

function updateResource(packagePath: string, elementName: string): void {
  writeResource(packagePath, elementName);
}

function updateVersion(packagePath: string, version: string): void {
  writePackageJson(packagePath, {
    name: "aurelia-cache-fixture",
    version,
  });
}

function writePackageJson(
  packagePath: string,
  data: { name: string; version: string },
): void {
  const pkg = {
    name: data.name,
    version: data.version,
    exports: "./src/analysis/20-link/resolution/index.ts",
    dependencies: {
      aurelia: "^2.0.0",
    },
  };
  writeFileSync(join(packagePath, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
}

function writeResource(packagePath: string, elementName: string): void {
  const contents = [
    "import { customElement } from \"aurelia\";",
    "",
    `@customElement("${elementName}")`,
    "export class CacheElement {}",
    "",
  ].join("\n");
  writeFileSync(join(packagePath, "src", "index.ts"), contents, "utf-8");
}
