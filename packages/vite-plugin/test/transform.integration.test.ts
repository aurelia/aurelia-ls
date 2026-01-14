import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import type { ResolvedConfig } from "vite";
import { aurelia } from "../src/plugin.js";
import type { AureliaPluginOptions } from "../src/types.js";
import { createResolutionContext } from "../src/resolution.js";
import { normalizeOptions } from "../src/defaults.js";
import { compileWithAot, patchComponentDefinition, render } from "@aurelia-ls/ssr";

const LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

type Workspace = {
  root: string;
  appRoot: string;
  appCode: string;
  appPath: string;
  appTemplatePath: string;
  packageRoot: string;
  tsconfigPath: string;
};

describe("vite plugin transform integration", () => {
  it("injects AOT output using third-party resources", async () => {
    const workspace = createWorkspace();
    try {
      const options: AureliaPluginOptions = {
        entry: "./src/app.html",
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: "../packages/user-card" }],
        },
      };

      const plugins = aurelia(options);
      const main = plugins.find((plugin) => plugin.name === "aurelia-ssr");
      if (!main) {
        throw new Error("Expected aurelia-ssr plugin to be available.");
      }

      const config = createResolvedConfig(workspace.appRoot);
      await main.configResolved?.(config);

      const result = await main.transform?.(workspace.appCode, workspace.appPath);
      expect(result).not.toBeNull();
      const code = (result as { code: string }).code;
      expect(code).toContain('res: "user-card"');
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("threads third-party config through resolution into SSR output", async () => {
    const workspace = createWorkspace();
    try {
      const options: AureliaPluginOptions = {
        entry: "./src/app.html",
        tsconfig: "tsconfig.json",
        thirdParty: {
          scan: false,
          packages: [{ path: "../packages/user-card" }],
        },
      };

      const resolved = normalizeOptions(options, {
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

      expect(ctx).not.toBeNull();
      const elements = ctx!.resourceGraph.scopes[ctx!.resourceGraph.root]?.resources?.elements ?? {};
      expect(elements["user-card"]).toBeDefined();

      const markup = readFileSync(workspace.appTemplatePath, "utf-8");
      const aot = compileWithAot(markup, {
        name: "app",
        semantics: ctx!.semantics,
        resourceGraph: ctx!.resourceGraph,
        resourceScope: ctx!.resourceGraph.root,
      });

      const serialized = JSON.stringify(aot.raw.codeResult.definition.instructions);
      expect(serialized).toContain("\"res\":\"user-card\"");

      const moduleUrl = pathToFileURL(join(workspace.packageRoot, "src", "index.ts")).href;
      const thirdParty = await import(moduleUrl) as { UserCard: new () => { name: string } };
      const UserCard = thirdParty.UserCard;

      class App {
        name = "Jane";
        static $au = {
          type: "custom-element",
          name: "app",
          template: markup,
          dependencies: [UserCard],
        };
      }

      patchComponentDefinition(App, aot, { name: "app" });
      const result = await render(App, { childComponents: [UserCard] });
      expect(result.html).toContain("Jane");
      expect(result.html).toContain("user-card");
      expect(result.html).toContain("class=\"user-card\"");
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

function createResolvedConfig(root: string): ResolvedConfig {
  return {
    root,
    command: "serve",
    mode: "development",
    configFile: null,
    build: {
      ssr: false,
      outDir: join(root, "dist"),
    },
    logger: LOGGER,
  } as unknown as ResolvedConfig;
}

function createWorkspace(): Workspace {
  const root = mkdtempSync(join(tmpdir(), "aurelia-vite-transform-"));
  const appRoot = join(root, "app");
  const packageRoot = join(root, "packages", "user-card");
  mkdirSync(join(appRoot, "src"), { recursive: true });
  mkdirSync(join(packageRoot, "src"), { recursive: true });

  writeAppPackageJson(appRoot);
  writeTsconfig(appRoot);

  const appCode = [
    'import { customElement } from "aurelia";',
    "",
    '@customElement("app")',
    "export class App {",
    "  name = \"Jane\";",
    "}",
    "",
  ].join("\n");
  const appPath = join(appRoot, "src", "app.ts");
  const appTemplatePath = join(appRoot, "src", "app.html");
  writeFileSync(appPath, appCode, "utf-8");
  writeFileSync(appTemplatePath, "<user-card name.bind=\"name\"></user-card>\n", "utf-8");
  writeFileSync(join(appRoot, "src", "main.ts"), "export const marker = 0;\n", "utf-8");

  writeThirdPartyPackage(packageRoot);

  const tsconfigPath = resolvePath(appRoot, "tsconfig.json");

  return { root, appRoot, appCode, appPath, appTemplatePath, packageRoot, tsconfigPath };
}

function cleanupWorkspace(workspace: Workspace): void {
  rmSync(workspace.root, { recursive: true, force: true });
}

function writeAppPackageJson(appRoot: string): void {
  const pkg = {
    name: "vite-transform-app",
    version: "0.0.0",
    dependencies: {
      "user-card": "1.0.0",
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

function writeThirdPartyPackage(packageRoot: string): void {
  const pkg = {
    name: "user-card",
    version: "1.0.0",
    exports: "./src/index.ts",
    dependencies: {
      aurelia: "^2.0.0",
    },
  };
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");

  const source = [
    "function customElement(def) {",
    "  return function(target) {",
    "    const existing = target.$au ?? {};",
    "    const name = typeof def === \"string\" ? def : def.name;",
    "    const template = typeof def === \"string\" ? existing.template : def.template;",
    "    target.$au = {",
    "      ...existing,",
    "      type: \"custom-element\",",
    "      name,",
    "      template,",
    "      bindables: existing.bindables ?? {},",
    "    };",
    "  };",
    "}",
    "",
    "function bindable() {",
    "  return function(target, key) {",
    "    const ctor = target.constructor;",
    "    const existing = ctor.$au ?? {};",
    "    const bindables = { ...(existing.bindables ?? {}), [key]: { mode: 2 } };",
    "    ctor.$au = { ...existing, bindables };",
    "  };",
    "}",
    "",
    "@customElement({",
    "  name: \"user-card\",",
    "  template: \"<span class=\\\"user-card\\\">${name}</span>\",",
    "})",
    "export class UserCard {",
    "  @bindable name = \"\";",
    "}",
    "",
  ].join("\n");
  writeFileSync(join(packageRoot, "src", "index.ts"), source, "utf-8");
}
