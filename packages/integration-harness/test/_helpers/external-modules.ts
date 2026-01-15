import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

import { resolveRepoRoot } from "@aurelia-ls/integration-harness";

const runtimeModuleCache = new Map<string, Promise<Record<string, unknown>>>();

export async function loadExternalModule(
  modulePath: string,
  entry?: string,
): Promise<Record<string, unknown>> {
  const cacheKey = entry ? `${modulePath}::${entry}` : modulePath;
  if (!runtimeModuleCache.has(cacheKey)) {
    runtimeModuleCache.set(cacheKey, buildExternalModuleBundle(modulePath, entry));
  }
  return runtimeModuleCache.get(cacheKey)!;
}

async function buildExternalModuleBundle(
  modulePath: string,
  entry?: string,
): Promise<Record<string, unknown>> {
  const cacheKey = entry ? `${modulePath}::${entry}` : modulePath;
  const entryPath = entry
    ? (path.isAbsolute(entry) ? entry : path.join(modulePath, entry))
    : path.join(modulePath, "src", "index.ts");
  const repoRoot = resolveRepoRoot();
  const buildDir = path.join(repoRoot, ".temp", "integration-harness", hashCacheKey(cacheKey));
  const outfile = path.join(buildDir, "index.mjs");

  await fs.promises.mkdir(buildDir, { recursive: true });
  await ensureAureliaWorkspaceModules(buildDir, repoRoot);

  await build({
    entryPoints: [entryPath],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    sourcemap: "inline",
    resolveExtensions: [".ts", ".js"],
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: false,
      },
    },
    define: {
      __DEV__: "false",
    },
    plugins: [
      {
        name: "resolve-ts-fallbacks",
        setup(build) {
          build.onResolve({ filter: /\.js$/ }, (args) => {
            const tsPath = path.resolve(args.resolveDir, args.path.replace(/\.js$/, ".ts"));
            if (fs.existsSync(tsPath)) {
              return { path: tsPath };
            }
            return null;
          });

          build.onResolve({ filter: /\.html$/ }, (args) => {
            const tsPath = path.resolve(args.resolveDir, `${args.path}.ts`);
            if (fs.existsSync(tsPath)) {
              return { path: tsPath };
            }
            return null;
          });
        },
      },
    ],
    external: ["aurelia", "@aurelia/*"],
  });

  return import(/* @vite-ignore */ pathToFileURL(outfile).href);
}

function hashCacheKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function ensureAureliaWorkspaceModules(
  buildDir: string,
  repoRoot: string,
): Promise<void> {
  const aureliaPackagesRoot = path.join(repoRoot, "aurelia", "packages");
  const nodeModulesRoot = path.join(buildDir, "node_modules");
  await fs.promises.mkdir(nodeModulesRoot, { recursive: true });

  const entries = await fs.promises.readdir(aureliaPackagesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgRoot = path.join(aureliaPackagesRoot, entry.name);
    const pkgJsonPath = path.join(pkgRoot, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf8")) as {
      name?: string;
    };
    if (!pkgJson.name) continue;

    let targetPath: string | null = null;
    if (pkgJson.name === "aurelia") {
      targetPath = path.join(nodeModulesRoot, "aurelia");
    } else if (pkgJson.name.startsWith("@aurelia/")) {
      const pkgName = pkgJson.name.slice("@aurelia/".length);
      targetPath = path.join(nodeModulesRoot, "@aurelia", pkgName);
    }

    if (!targetPath) continue;
    if (fs.existsSync(targetPath)) continue;

    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.symlink(pkgRoot, targetPath, "junction");
  }
}
