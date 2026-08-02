import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { runTests } from "@vscode/test-electron";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const extensionDevelopmentPath = resolve(__dirname, "..");
const extensionTestsPath = join(extensionDevelopmentPath, "test", "extension-host", "suite", "index.cjs");
const sourceWorkspace = join(repoRoot, "fixtures", "hello-world");
const tempRoot = join(repoRoot, ".temp", "vscode-extension-host");
const aureliaWorkspace = join(tempRoot, "hello-world");
const excludedAureliaWorkspace = join(aureliaWorkspace, "excluded-project");
const plainTypeScriptWorkspace = join(tempRoot, "plain-typescript");
const testWorkspace = join(tempRoot, "extension-host.code-workspace");

function assertInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  if (childPath !== parentPath && !childPath.startsWith(`${parentPath}\\`) && !childPath.startsWith(`${parentPath}/`)) {
    throw new Error(`Refusing to touch path outside ${parentPath}: ${childPath}`);
  }
}

assertInside(join(repoRoot, ".temp"), tempRoot);
assertInside(tempRoot, aureliaWorkspace);
assertInside(aureliaWorkspace, excludedAureliaWorkspace);
assertInside(tempRoot, plainTypeScriptWorkspace);
assertInside(tempRoot, testWorkspace);

if (existsSync(tempRoot)) {
  rmSync(tempRoot, { recursive: true, force: true });
}
mkdirSync(join(plainTypeScriptWorkspace, "src"), { recursive: true });
cpSync(sourceWorkspace, aureliaWorkspace, { recursive: true });
mkdirSync(join(excludedAureliaWorkspace, ".vscode"), { recursive: true });
mkdirSync(join(excludedAureliaWorkspace, "src"), { recursive: true });
writeFileSync(join(excludedAureliaWorkspace, ".vscode", "settings.json"), JSON.stringify({
  "aurelia.activationMode": "off",
}, null, 2));
writeFileSync(join(excludedAureliaWorkspace, "package.json"), JSON.stringify({
  name: "excluded-aurelia-extension-host-fixture",
  private: true,
  dependencies: { aurelia: "workspace:*" },
}, null, 2));
writeFileSync(join(excludedAureliaWorkspace, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    strict: true,
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
  },
  include: ["src/**/*.ts"],
}, null, 2));
writeFileSync(
  join(excludedAureliaWorkspace, "src", "excluded-view.ts"),
  "export class ExcludedView { excludedMessage = 'not owned'; }\n",
);
writeFileSync(
  join(excludedAureliaWorkspace, "src", "excluded-view.html"),
  "<p>${excludedMessage}</p>\n",
);
writeFileSync(join(plainTypeScriptWorkspace, "package.json"), JSON.stringify({
  name: "plain-typescript-extension-host-fixture",
  private: true,
}, null, 2));
writeFileSync(join(plainTypeScriptWorkspace, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    strict: true,
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
  },
  include: ["src/**/*.ts"],
}, null, 2));
writeFileSync(
  join(plainTypeScriptWorkspace, "src", "plain.ts"),
  "export const standaloneName = 1;\nconsole.log(standaloneName);\n",
);
writeFileSync(testWorkspace, JSON.stringify({
  folders: [
    { name: "hello-world", path: "hello-world" },
    { name: "excluded-project", path: "hello-world/excluded-project" },
    { name: "plain-typescript", path: "plain-typescript" },
  ],
}, null, 2));

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
    AURELIA_LS_EXTENSION_HOST_WORKSPACE: aureliaWorkspace,
    AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE: excludedAureliaWorkspace,
    AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE: plainTypeScriptWorkspace,
    ...(process.env.AURELIA_LS_EXTENSION_HOST_GREP
      ? { AURELIA_LS_EXTENSION_HOST_GREP: process.env.AURELIA_LS_EXTENSION_HOST_GREP }
      : {}),
  },
});
