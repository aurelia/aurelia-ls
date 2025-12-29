import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, realpathSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

/** @type {esbuild.BuildOptions} */
const commonOptions = {
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs", // VS Code extensions must be CJS
  sourcemap: true,
  minify,
  logLevel: "info",
};

// Extension bundle - use .cjs to avoid ESM/CJS conflict with "type": "module"
const extensionBuild = esbuild.build({
  ...commonOptions,
  entryPoints: [join(__dirname, "out/extension.js")],
  outfile: join(distDir, "extension.cjs"),
  external: ["vscode"],
});

// Language server bundle - use .cjs to avoid ESM/CJS conflict
// TypeScript must be external so it can resolve its lib.d.ts files at runtime
const serverBuild = esbuild.build({
  ...commonOptions,
  entryPoints: [join(__dirname, "../language-server/out/main.js")],
  outfile: join(distDir, "server/main.cjs"),
  external: ["typescript"],
});

await Promise.all([extensionBuild, serverBuild]);

// Copy TypeScript to dist/node_modules so the language server can find it at runtime.
// TypeScript must be external (not bundled) because it resolves lib.d.ts files relative
// to its installation location. We use realpathSync to follow pnpm symlinks.
const tsSource = join(__dirname, "node_modules/typescript");
const tsDest = join(distDir, "node_modules/typescript");

if (existsSync(tsSource)) {
  const realTsSource = realpathSync(tsSource);
  console.log(`Copying TypeScript from ${realTsSource}...`);
  cpSync(realTsSource, tsDest, { recursive: true });
  console.log("TypeScript copied to dist/node_modules/typescript");
} else {
  console.warn("WARNING: TypeScript not found in node_modules, language server may fail");
}

console.log("Build complete.");
