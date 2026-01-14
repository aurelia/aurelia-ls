import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { tmpdir } from "node:os";
import type { AureliaPluginOptions, ResolutionContext } from "../src/types.js";
import { createResolutionContext } from "../src/resolution.js";
import { loadConfigFile, mergeConfigs, normalizeOptions } from "../src/defaults.js";

type Workspace = {
  root: string;
  appRoot: string;
  tsconfigPath: string;
  packageRoots: Record<string, string>;
};

const LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe("third-party scanning (vite plugin)", () => {
  it("scans aurelia-related deps by default and skips non-aurelia packages", async () => {
    const workspace = createWorkspace();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
      });

      expect(ctx).not.toBeNull();
      const resources = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(resources["external-thing"]).toBeDefined();
      expect(resources["example-widget"]).toBeUndefined();
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("disables scanning when scan is false", async () => {
    const workspace = createWorkspace();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: { scan: false },
      });

      const resources = ctx?.resourceGraph.scopes[ctx.resourceGraph.root]?.resources?.elements ?? {};
      expect(resources["external-thing"]).toBeUndefined();
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("scans only explicit packages when scan is false but packages are listed", async () => {
    const workspace = createWorkspace();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
        },
      });

      const resources = ctx?.resourceGraph.scopes[ctx.resourceGraph.root]?.resources?.elements ?? {};
      expect(resources["external-thing"]).toBeDefined();
      expect(resources["example-widget"]).toBeUndefined();
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("resolves scoped packages via packageRoots mapping", async () => {
    const workspace = createWorkspaceWithScopedPackage();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["@test/scoped-fixture"],
        },
      });

      const resources = ctx?.resourceGraph.scopes[ctx.resourceGraph.root]?.resources?.elements ?? {};
      expect(resources["scoped-thing"]).toBeDefined();
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

describe("config precedence (config file vs inline)", () => {
  it("inline config overrides aurelia.config.* for explicit resources", async () => {
    const workspace = createWorkspace();
    try {
      writeConfigFile(workspace.appRoot, {
        thirdParty: {
          resources: {
            elements: {
              "override-el": {
                bindables: { fromFile: {} },
              },
            },
          },
        },
      });

      const fileConfig = await loadConfigFile(workspace.appRoot, workspace.appRoot);
      expect(fileConfig).not.toBeNull();

      const inlineConfig: AureliaPluginOptions = {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          resources: {
            elements: {
              "override-el": {
                bindables: { fromInline: {} },
              },
            },
          },
        },
      };

      const merged = mergeConfigs(fileConfig, inlineConfig);
      const resolved = normalizeOptions(merged, {
        command: "serve",
        mode: "development",
        root: workspace.appRoot,
      });

      const ctx = await createResolutionContext(workspace.tsconfigPath, LOGGER, {
        thirdParty: resolved.conventions.thirdParty,
        conventions: resolved.conventions.config,
        packagePath: resolved.packagePath,
        packageRoots: resolved.packageRoots,
        templateExtensions: resolved.conventions.config.templateExtensions,
        styleExtensions: resolved.conventions.config.styleExtensions,
      });

      const resources = ctx?.resourceGraph.scopes[ctx.resourceGraph.root]?.resources?.elements ?? {};
      const override = resources["override-el"];
      expect(override).toBeDefined();
      const bindables = override?.bindables ?? {};
      expect(Object.keys(bindables)).toContain("fromInline");
      expect(Object.keys(bindables)).not.toContain("fromFile");
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

describe("analysis fingerprint triggers", () => {
  it("re-analyzes when lockfile changes", async () => {
    const workspace = createWorkspace();
    try {
      writeLockfile(workspace.appRoot, "lock-v1");

      const options: AureliaPluginOptions = {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
        },
      };

      const first = await resolveWithOptions(workspace, options);
      expect(hasElement(first, "external-thing")).toBe(true);

      updateResource(workspace.packageRoots["aurelia-fixture"], "external-thing-next");
      const second = await resolveWithOptions(workspace, options);
      expect(hasElement(second, "external-thing")).toBe(true);
      expect(hasElement(second, "external-thing-next")).toBe(false);

      writeLockfile(workspace.appRoot, "lock-v2");
      const third = await resolveWithOptions(workspace, options);
      expect(hasElement(third, "external-thing-next")).toBe(true);
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("re-analyzes when third-party config changes", async () => {
    const workspace = createWorkspace();
    try {
      writeLockfile(workspace.appRoot, "lock-v1");

      const baseOptions: AureliaPluginOptions = {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
        },
      };

      const first = await resolveWithOptions(workspace, baseOptions);
      expect(hasElement(first, "external-thing")).toBe(true);

      updateResource(workspace.packageRoots["aurelia-fixture"], "external-config-next");
      const second = await resolveWithOptions(workspace, baseOptions);
      expect(hasElement(second, "external-thing")).toBe(true);
      expect(hasElement(second, "external-config-next")).toBe(false);

      const updatedOptions: AureliaPluginOptions = {
        ...baseOptions,
        thirdParty: {
          ...baseOptions.thirdParty,
          resources: {
            elements: {
              "override-el": {
                bindables: { fromConfig: {} },
              },
            },
          },
        },
      };

      const third = await resolveWithOptions(workspace, updatedOptions);
      expect(hasElement(third, "external-config-next")).toBe(true);
      expect(hasElement(third, "override-el")).toBe(true);
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

describe("third-party policy merge strategies", () => {
  it("root-scope policy merges external resources into graph and keeps locals", async () => {
    const workspace = createWorkspaceWithLocalScope();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
          policy: "root-scope",
        },
      });

      expect(ctx).not.toBeNull();
      const rootResources = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(rootResources["external-thing"]).toBeDefined();
      const localScopes = collectLocalScopes(ctx!);
      expect(localScopes.length).toBeGreaterThan(0);
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("semantics policy keeps locals but does not alter resource graph", async () => {
    const workspace = createWorkspaceWithLocalScope();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
          policy: "semantics",
        },
      });

      expect(ctx).not.toBeNull();
      const rootResources = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(rootResources["external-thing"]).toBeUndefined();
      const localScopes = collectLocalScopes(ctx!);
      expect(localScopes.length).toBeGreaterThan(0);
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("rebuild-graph policy rebuilds root graph and drops locals", async () => {
    const workspace = createWorkspaceWithLocalScope();
    try {
      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        packageRoots: workspace.packageRoots,
        thirdParty: {
          scan: false,
          packages: ["aurelia-fixture"],
          policy: "rebuild-graph",
        },
      });

      expect(ctx).not.toBeNull();
      const rootResources = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(rootResources["external-thing"]).toBeDefined();
      const localScopes = collectLocalScopes(ctx!);
      expect(localScopes.length).toBe(0);
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

describe("third-party error paths", () => {
  it("emits package-not-found gap when package.json is missing", async () => {
    const workspace = createWorkspace();
    try {
      const missingPackage = createPackageRoot(workspace.root, "missing-package");

      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: missingPackage }],
        },
      });

      expect(ctx).not.toBeNull();
      const codes = ctx!.result.diagnostics.map((d) => d.code);
      expect(codes).toContain("gap:package-not-found");
      expect(ctx!.result.catalog.confidence).toBe("conservative");
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("emits invalid-package-json gap for malformed package.json", async () => {
    const workspace = createWorkspace();
    try {
      const invalidPackage = createPackageRoot(workspace.root, "invalid-package");
      writeFileSync(
        join(invalidPackage, "package.json"),
        "{ invalid json",
        "utf-8",
      );

      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: invalidPackage }],
        },
      });

      expect(ctx).not.toBeNull();
      const codes = ctx!.result.diagnostics.map((d) => d.code);
      expect(codes).toContain("gap:invalid-package-json");
      expect(ctx!.result.catalog.confidence).toBe("conservative");
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("emits entry-point-not-found gap for missing exports target", async () => {
    const workspace = createWorkspace();
    try {
      const brokenPackage = createPackageRoot(workspace.root, "broken-entry");
      writeFileSync(
        join(brokenPackage, "package.json"),
        JSON.stringify(
          {
            name: "broken-entry",
            version: "1.0.0",
            exports: "./dist/index.js",
            dependencies: { aurelia: "^2.0.0" },
          },
          null,
          2,
        ),
        "utf-8",
      );

      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: brokenPackage }],
        },
      });

      expect(ctx).not.toBeNull();
      const codes = ctx!.result.diagnostics.map((d) => d.code);
      expect(codes).toContain("gap:entry-point-not-found");
      expect(ctx!.result.catalog.confidence).toBe("conservative");
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("flags packages with no resources as no-source gaps", async () => {
    const workspace = createWorkspace();
    try {
      const emptyPackage = createPackageRoot(workspace.root, "empty-package");
      writePackageJson(emptyPackage, {
        name: "empty-package",
        version: "1.0.0",
        hasAureliaDeps: true,
      });
      writeFileSync(
        join(emptyPackage, "src", "index.ts"),
        "export const marker = 0;\n",
        "utf-8",
      );

      const ctx = await resolveWithOptions(workspace, {
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: emptyPackage }],
        },
      });

      expect(ctx).not.toBeNull();
      const codes = ctx!.result.diagnostics.map((d) => d.code);
      expect(codes).toContain("gap:no-source");
      expect(ctx!.result.catalog.confidence).toBe("conservative");

      const resources = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(resources["empty-widget"]).toBeUndefined();
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

function resolveWithOptions(
  workspace: Workspace,
  options: AureliaPluginOptions,
) {
  const resolved = normalizeOptions(options, {
    command: "serve",
    mode: "development",
    root: workspace.appRoot,
  });
  const tsconfigPath = resolvePath(workspace.appRoot, resolved.tsconfig ?? "tsconfig.json");
  return createResolutionContext(tsconfigPath, LOGGER, {
    thirdParty: resolved.conventions.thirdParty,
    conventions: resolved.conventions.config,
    packagePath: resolved.packagePath,
    packageRoots: resolved.packageRoots,
    templateExtensions: resolved.conventions.config.templateExtensions,
    styleExtensions: resolved.conventions.config.styleExtensions,
  });
}

function hasElement(ctx: ResolutionContext | null, name: string): boolean {
  if (!ctx) return false;
  const rootScope = ctx.resourceGraph.scopes[ctx.resourceGraph.root];
  return Boolean(rootScope?.resources?.elements?.[name]);
}

function createWorkspace(): Workspace {
  const root = mkdtempSync(join(tmpdir(), "aurelia-vite-"));
  const appRoot = join(root, "app");
  const packagesRoot = join(root, "packages");
  const aureliaFixture = join(packagesRoot, "aurelia-fixture");
  const exampleLib = join(packagesRoot, "example-lib");

  mkdirSync(join(appRoot, "src"), { recursive: true });
  mkdirSync(join(aureliaFixture, "src"), { recursive: true });
  mkdirSync(join(exampleLib, "src"), { recursive: true });

  writeProjectPackageJson(appRoot);
  writeTsconfig(appRoot);
  writeFileSync(join(appRoot, "src", "main.ts"), "export const marker = 0;\n", "utf-8");

  writePackageJson(aureliaFixture, {
    name: "aurelia-fixture",
    version: "1.0.0",
    hasAureliaDeps: true,
  });
  writeResource(aureliaFixture, "external-thing");

  writePackageJson(exampleLib, {
    name: "example-lib",
    version: "1.0.0",
    hasAureliaDeps: false,
  });
  writeResource(exampleLib, "example-widget");

  const tsconfigPath = join(appRoot, "tsconfig.json");
  const packageRoots = {
    "aurelia-fixture": aureliaFixture,
    "example-lib": exampleLib,
  };

  return { root, appRoot, tsconfigPath, packageRoots };
}

function createWorkspaceWithLocalScope(): Workspace {
  const workspace = createWorkspace();
  writeLocalResources(workspace.appRoot);
  return workspace;
}

function createWorkspaceWithScopedPackage(): Workspace {
  const workspace = createWorkspace();
  const scopedRoot = join(workspace.root, "packages", "@test", "scoped-fixture");
  mkdirSync(join(scopedRoot, "src"), { recursive: true });
  writePackageJson(scopedRoot, {
    name: "@test/scoped-fixture",
    version: "1.0.0",
    hasAureliaDeps: true,
  });
  writeResource(scopedRoot, "scoped-thing");
  addDependency(workspace.appRoot, "@test/scoped-fixture", "1.0.0");

  return {
    ...workspace,
    packageRoots: {
      ...workspace.packageRoots,
      "@test/scoped-fixture": scopedRoot,
    },
  };
}

function cleanupWorkspace(workspace: Workspace): void {
  rmSync(workspace.root, { recursive: true, force: true });
}

function writeProjectPackageJson(appRoot: string): void {
  const pkg = {
    name: "vite-test-app",
    version: "0.0.0",
    dependencies: {
      "aurelia-fixture": "1.0.0",
      "example-lib": "1.0.0",
    },
  };
  writeFileSync(join(appRoot, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
}

function writeTsconfig(appRoot: string): void {
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      experimentalDecorators: true,
      noEmit: true,
      strict: true,
    },
    include: ["src/**/*.ts"],
  };
  writeFileSync(join(appRoot, "tsconfig.json"), JSON.stringify(tsconfig, null, 2), "utf-8");
}

function writePackageJson(
  packageRoot: string,
  data: { name: string; version: string; hasAureliaDeps: boolean },
): void {
  const pkg = {
    name: data.name,
    version: data.version,
    exports: "./src/index.ts",
    dependencies: data.hasAureliaDeps ? { aurelia: "^2.0.0" } : {},
  };
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
}

function addDependency(appRoot: string, name: string, version: string): void {
  const pkgPath = join(appRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
  };
  const deps = { ...(pkg.dependencies ?? {}) };
  deps[name] = version;
  writeFileSync(pkgPath, JSON.stringify({ ...pkg, dependencies: deps }, null, 2), "utf-8");
}

function createPackageRoot(root: string, name: string): string {
  const pkgRoot = join(root, "packages", name);
  mkdirSync(join(pkgRoot, "src"), { recursive: true });
  return pkgRoot;
}

function writeLockfile(appRoot: string, marker: string): void {
  const contents = [
    `# ${marker}`,
    "lockfileVersion: 1",
    "packages:",
    "  /aurelia/2.0.0:",
    "    resolution: { integrity: sha512-mock }",
    "",
  ].join("\n");
  writeFileSync(join(appRoot, "pnpm-lock.yaml"), contents, "utf-8");
}

function writeResource(packageRoot: string, elementName: string): void {
  const contents = [
    "import { customElement } from \"aurelia\";",
    "",
    `@customElement(\"${elementName}\")`,
    "export class ExampleElement {}",
    "",
  ].join("\n");
  writeFileSync(join(packageRoot, "src", "index.ts"), contents, "utf-8");
}

function updateResource(packageRoot: string, elementName: string): void {
  writeResource(packageRoot, elementName);
}

function writeLocalResources(appRoot: string): void {
  const contents = [
    "import { customElement } from \"aurelia\";",
    "",
    "@customElement(\"local-part\")",
    "export class LocalPart {}",
    "",
  ].join("\n");
  writeFileSync(join(appRoot, "src", "local-part.ts"), contents, "utf-8");

  const appContents = [
    "import { customElement } from \"aurelia\";",
    "import { LocalPart } from \"./local-part\";",
    "",
    "@customElement({ name: \"my-app\", dependencies: [LocalPart] })",
    "export class MyApp {}",
    "",
  ].join("\n");
  writeFileSync(join(appRoot, "src", "my-app.ts"), appContents, "utf-8");
  writeFileSync(join(appRoot, "src", "main.ts"), "import \"./my-app\";\n", "utf-8");
}

function collectLocalScopes(ctx: ResolutionContext): string[] {
  return Object.keys(ctx.resourceGraph.scopes).filter((id) => id.startsWith("local:"));
}

function writeConfigFile(appRoot: string, config: Record<string, unknown>): void {
  const contents = `module.exports = ${JSON.stringify(config, null, 2)};`;
  writeFileSync(join(appRoot, "aurelia.config.cjs"), contents, "utf-8");
}
