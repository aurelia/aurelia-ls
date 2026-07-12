import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { runTests } from "@vscode/test-electron";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const extensionDevelopmentPath = resolve(__dirname, "..");
const extensionTestsPath = join(extensionDevelopmentPath, "test", "extension-host", "suite", "index.cjs");
const sourceWorkspace = join(repoRoot, "fixtures", "hello-world");
const tempRoot = join(repoRoot, ".temp", "vscode-extension-host");
const testWorkspace = join(tempRoot, "hello-world");

function assertInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  if (childPath !== parentPath && !childPath.startsWith(`${parentPath}\\`) && !childPath.startsWith(`${parentPath}/`)) {
    throw new Error(`Refusing to touch path outside ${parentPath}: ${childPath}`);
  }
}

assertInside(join(repoRoot, ".temp"), tempRoot);
assertInside(tempRoot, testWorkspace);

if (existsSync(testWorkspace)) {
  rmSync(testWorkspace, { recursive: true, force: true });
}
mkdirSync(tempRoot, { recursive: true });
cpSync(sourceWorkspace, testWorkspace, { recursive: true });

const version = process.env.AURELIA_VSCODE_TEST_VERSION || undefined;

await runTests({
  ...(version ? { version } : {}),
  extensionDevelopmentPath,
  extensionTestsPath,
  launchArgs: [
    testWorkspace,
    "--disable-extensions",
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
  ],
  extensionTestsEnv: {
    AURELIA_LS_EXTENSION_HOST_WORKSPACE: testWorkspace,
    ...(process.env.AURELIA_LS_EXTENSION_HOST_GREP
      ? { AURELIA_LS_EXTENSION_HOST_GREP: process.env.AURELIA_LS_EXTENSION_HOST_GREP }
      : {}),
  },
});
