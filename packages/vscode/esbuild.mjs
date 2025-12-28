import * as esbuild from "esbuild";
import { existsSync, mkdirSync } from "fs";
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
const serverBuild = esbuild.build({
  ...commonOptions,
  entryPoints: [join(__dirname, "../language-server/out/main.js")],
  outfile: join(distDir, "server/main.cjs"),
});

await Promise.all([extensionBuild, serverBuild]);

console.log("Build complete.");
