import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, realpathSync, rmSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname);
const distDir = resolve(packageDir, "dist");
const tsSource = join(__dirname, "node_modules/typescript");
const projectSchemaSource = join(__dirname, "../semantic-runtime/schema/aurelia.project.schema.json");
const projectDialectSchemaSource = join(__dirname, "src/schemas/aurelia.project.jsonc.schema.json");

function resetDistDir() {
  const expectedDistDir = resolve(packageDir, "../..", "packages", "vscode", "dist");
  if (
    distDir !== expectedDistDir
    || basename(packageDir) !== "vscode"
    || basename(dirname(packageDir)) !== "packages"
  ) {
    throw new Error(`Refusing to clean unexpected VS Code dist path: ${distDir}`);
  }

  rmSync(distDir, { recursive: true, force: true });
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
  banner: {
    js: 'const { pathToFileURL: __aureliaPathToFileURL } = require("url"); const import_meta_url = __aureliaPathToFileURL(__filename).href;',
  },
  define: {
    "import.meta.url": "import_meta_url",
  },
  sourcemap: true,
  minify,
  logLevel: "info",
};

// Extension bundle - use .cjs to avoid ESM/CJS conflict with "type": "module"
const extensionOptions = {
  ...commonOptions,
  entryPoints: [join(__dirname, "out/extension.js")],
  outfile: join(distDir, "extension.cjs"),
  external: ["vscode"],
};

// Language server bundle - use .cjs to avoid ESM/CJS conflict
// TypeScript must be external so it can resolve its lib.d.ts files at runtime
const serverOptions = {
  ...commonOptions,
  entryPoints: [join(__dirname, "../language-server/out/main.js")],
  outfile: join(distDir, "server/main.cjs"),
  external: ["typescript"],
};

// Copy TypeScript to dist/node_modules so the language server can find it at runtime.
// TypeScript must be external (not bundled) because it resolves lib.d.ts files relative
// to its installation location. We use realpathSync to follow pnpm symlinks.
function copyRuntimeAssets() {
  const tsDest = join(distDir, "node_modules/typescript");
  const realTsSource = realpathSync(tsSource);
  console.log(`Copying TypeScript from ${realTsSource}...`);
  cpSync(realTsSource, tsDest, { recursive: true });
  console.log("TypeScript copied to dist/node_modules/typescript");

  // Bundle the semantic-runtime-owned native project schema without creating a second checked-in authority.
  const projectSchemaDest = join(distDir, "schemas/aurelia.project.schema.json");
  mkdirSync(dirname(projectSchemaDest), { recursive: true });
  cpSync(projectSchemaSource, projectSchemaDest);
  cpSync(projectDialectSchemaSource, join(distDir, "schemas/aurelia.project.jsonc.schema.json"));
}

// Validate required runtime assets before replacing a previously usable bundle.
if (!existsSync(tsSource)) {
  throw new Error(`Required TypeScript runtime is missing: ${tsSource}`);
}
if (!existsSync(projectSchemaSource)) {
  throw new Error(`Required Aurelia project schema is missing: ${projectSchemaSource}`);
}
if (!existsSync(projectDialectSchemaSource)) {
  throw new Error(`Required Aurelia project JSONC dialect schema is missing: ${projectDialectSchemaSource}`);
}

resetDistDir();

async function watchBundles() {
  /** @type {esbuild.BuildContext[]} */
  const contexts = [];
  /** @type {Promise<void> | undefined} */
  let stopPromise;
  let stopRequested = false;

  const stop = () => {
    stopPromise ??= Promise.allSettled(contexts.map((context) => context.dispose())).then((results) => {
      const failures = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
      if (failures.length > 0) {
        throw new AggregateError(failures, "Failed to dispose VS Code bundle watchers");
      }
    });
    return stopPromise;
  };

  const stopAndExit = () => {
    stopRequested = true;
    process.exitCode = 0;
    void stop().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  };

  try {
    contexts.push(await esbuild.context(extensionOptions));
    contexts.push(await esbuild.context(serverOptions));
    process.once("SIGINT", stopAndExit);
    process.once("SIGTERM", stopAndExit);
    await Promise.all(contexts.map((context) => context.watch()));
    if (stopRequested) {
      await stop();
      return;
    }
    copyRuntimeAssets();
    console.log("Watching extension and language server bundles.");
  } catch (error) {
    try {
      await stop();
    } catch (disposeError) {
      if (stopRequested) throw disposeError;
      throw new AggregateError([error, disposeError], "VS Code bundle watch setup and disposal failed");
    }
    if (!stopRequested) throw error;
  }
}

if (watch) {
  await watchBundles();
} else {
  await Promise.all([
    esbuild.build(extensionOptions),
    esbuild.build(serverOptions),
  ]);
  copyRuntimeAssets();
  console.log("Build complete.");
}
