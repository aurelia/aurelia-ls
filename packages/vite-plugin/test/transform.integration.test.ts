import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ResolvedConfig } from "vite";
import { aurelia } from "../src/plugin.js";
import type { AureliaPluginOptions } from "../src/types.js";

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
  writeFileSync(appPath, appCode, "utf-8");
  writeFileSync(join(appRoot, "src", "app.html"), "<user-card name.bind=\"name\"></user-card>\n", "utf-8");
  writeFileSync(join(appRoot, "src", "main.ts"), "export const marker = 0;\n", "utf-8");

  writeThirdPartyPackage(packageRoot);

  return { root, appRoot, appCode, appPath };
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
    'import { customElement, bindable } from "aurelia";',
    "",
    '@customElement("user-card")',
    "export class UserCard {",
    "  @bindable name = \"\";",
    "}",
    "",
  ].join("\n");
  writeFileSync(join(packageRoot, "src", "index.ts"), source, "utf-8");
}
