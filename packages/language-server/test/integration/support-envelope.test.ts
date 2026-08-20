import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import { URI } from "vscode-uri";
import {
  AureliaProtocolRequest,
  type RelatedFilesResponse,
  type ResourceInventoryResponse,
  type SourceOwnershipResponse,
} from "../../src/protocol.js";
import {
  copyFixtureDirectory,
  changeDocument,
  createAureliaAppFixture,
  createFixture,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

const admittedSources = [
  ["src/view.html", "html", "template", true],
  ["src/unrelated.html", "html", "template", false],
  ["src/support.ts", "typescript", "app-source", false],
  ["src/support.tsx", "typescriptreact", "app-source", false],
  ["src/support.mts", "typescript", "app-source", false],
  ["src/support.cts", "typescript", "app-source", false],
  ["src/support.js", "javascript", "app-source", false],
  ["src/support.jsx", "javascriptreact", "app-source", false],
  ["src/support.mjs", "javascript", "app-source", false],
  ["src/support.cjs", "javascript", "app-source", false],
] as const;

test("separates authored source admission from exact template-document ownership", async () => {
  const fixture = createAureliaAppFixture({
    "src/app.ts": [
      "import { customElement } from 'aurelia';",
      "import template from './view.html';",
      "@customElement({ name: 'app-root', template })",
      "export class AppRoot {}",
    ].join("\n"),
    "src/aurelia-assets.d.ts": "declare module '*.html' { const markup: string; export default markup; }\n",
    "src/view.html": "<template>${message}</template>\n",
    "src/unrelated.html": "<main>${notAnAureliaTemplate}</main>\n",
    "src/support.ts": "export const typescriptMarker = true;\n",
    "src/support.tsx": "export const tsxMarker = true;\n",
    "src/support.mts": "export const mtsMarker = true;\n",
    "src/support.cts": "export const ctsMarker = true;\n",
    "src/support.js": "export const javascriptMarker = true;\n",
    "src/support.jsx": "export const jsxMarker = true;\n",
    "src/support.mjs": "export const mjsMarker = true;\n",
    "src/support.cjs": "exports.cjsMarker = true;\n",
  });
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    for (const [relativePath, languageId, role, templateOwned] of admittedSources) {
      const sourcePath = path.join(fixture, relativePath);
      const uri = fileUri(fixture, relativePath);
      openDocument(connection, uri, languageId, fs.readFileSync(sourcePath, "utf8"));

      const response = await connection.sendRequest<SourceOwnershipResponse>(
        AureliaProtocolRequest.SourceOwnership,
        { uri },
      );

      expect(response.sourceUri).toBe(uri);
      expect(response.answer).toMatchObject({
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
      });
      expect(response.owners).toContainEqual(expect.objectContaining({
        rootUri: fileUri(fixture, ""),
        projectPath: relativePath.replaceAll("\\", "/"),
        role,
      }));
      expect(response.templateOwned).toBe(templateOwned);
      if (relativePath === "src/unrelated.html") {
        const diagnostics = await connection.sendRequest<{ kind: string; items: readonly unknown[] }>(
          "textDocument/diagnostic",
          { textDocument: { uri } },
        );
        expect(diagnostics).toMatchObject({ kind: "full", items: [] });
      }
    }
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("owns a recognized resource-library template without requiring an app root", async () => {
  const fixture = createFixture({
    "package.json": JSON.stringify({
      name: "aurelia-resource-library-fixture",
      private: true,
      type: "module",
      dependencies: { aurelia: "^2.0.0-rc.2" },
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        allowArbitraryExtensions: true,
        noEmit: true,
      },
      include: ["src"],
    }),
    "src/aurelia-assets.d.ts": "declare module '*.html' { const markup: string; export default markup; }\n",
    "src/library-card.ts": [
      "import { customElement } from 'aurelia';",
      "import template from './library-card.html';",
      "@customElement({ name: 'library-card', template })",
      "export class LibraryCard {}",
    ].join("\n"),
    "src/library-card.html": "<strong>${label}</strong>\n",
    "src/unrelated.html": "<article>Documentation preview</article>\n",
  });
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    for (const [relativePath, templateOwned] of [
      ["src/library-card.html", true],
      ["src/unrelated.html", false],
    ] as const) {
      const sourcePath = path.join(fixture, relativePath);
      const uri = fileUri(fixture, relativePath);
      openDocument(connection, uri, "html", fs.readFileSync(sourcePath, "utf8"));

      const response = await connection.sendRequest<SourceOwnershipResponse>(
        AureliaProtocolRequest.SourceOwnership,
        { uri },
      );

      expect(response.owners).toContainEqual(expect.objectContaining({
        projectPath: relativePath,
        role: "template",
      }));
      expect(response.templateOwned).toBe(templateOwned);
    }
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("withdraws and restores exact external-template ownership after a live decorator edit", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const componentPath = path.join(fixture, "src/components/product-card.ts");
  const componentUri = fileUri(fixture, "src/components/product-card.ts");
  const templatePath = path.join(fixture, "src/components/product-card.html");
  const templateUri = fileUri(fixture, "src/components/product-card.html");
  const baselineSource = fs.readFileSync(componentPath, "utf8");
  const externalTemplateField = "  template,";
  const inlineTemplateField = "  template: '<div>temporarily inline</div>',";
  expect(baselineSource).toContain(externalTemplateField);
  const inlineSource = baselineSource.replace(externalTemplateField, inlineTemplateField);
  expect(inlineSource).not.toBe(baselineSource);

  const analysisEvents: Array<{
    readonly fingerprint?: string;
    readonly changeKind?: string;
    readonly changedSourceUris?: readonly string[];
  }> = [];
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: {
        onAnalysisChanged: (params) => {
          analysisEvents.push(params as {
            readonly fingerprint?: string;
            readonly changeKind?: string;
            readonly changedSourceUris?: readonly string[];
          });
        },
      },
    });
    openDocument(connection, componentUri, "typescript", baselineSource, 1);
    openDocument(connection, templateUri, "html", fs.readFileSync(templatePath, "utf8"), 1);

    const baselineOwnership = await sourceOwnership(connection, templateUri);
    expect(baselineOwnership.templateOwned).toBe(true);

    const inlineChangeCursor = analysisEvents.length;
    changeDocument(connection, componentUri, inlineSource, 2);
    await expectNewSourceAnalysis(analysisEvents, inlineChangeCursor, baselineOwnership.fingerprint, componentUri);

    const inlineOwnership = await sourceOwnership(connection, templateUri);
    expect(inlineOwnership.templateOwned).toBe(false);
    expect(inlineOwnership.owners).toContainEqual(expect.objectContaining({
      projectPath: "src/components/product-card.html",
      role: "template",
    }));

    const restoreCursor = analysisEvents.length;
    changeDocument(connection, componentUri, baselineSource, 3);
    await expectNewSourceAnalysis(analysisEvents, restoreCursor, inlineOwnership.fingerprint, componentUri);

    const restoredOwnership = await sourceOwnership(connection, templateUri);
    expect(restoredOwnership.templateOwned).toBe(true);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

test.runIf(process.platform !== "win32")(
  "preserves a remote-style URI namespace through real semantic projections",
  async () => {
    const fixture = copyFixtureDirectory(helloWorldFixture);
    const remoteRootUri = remoteWorkspaceUri(fixture);
    const componentUri = remoteChildUri(remoteRootUri, "src/components/product-card.ts");
    const templateUri = remoteChildUri(remoteRootUri, "src/components/product-card.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture, { rootUri: remoteRootUri });
      openDocument(
        connection,
        componentUri,
        "typescript",
        fs.readFileSync(path.join(fixture, "src/components/product-card.ts"), "utf8"),
      );

      const ownership = await connection.sendRequest<SourceOwnershipResponse>(
        AureliaProtocolRequest.SourceOwnership,
        { uri: componentUri },
      );
      expectRemoteNamespace(ownership.sourceUri, remoteRootUri);
      expect(ownership.owners).toContainEqual(expect.objectContaining({
        rootUri: remoteRootUri,
        projectPath: "src/components/product-card.ts",
      }));

      const inventory = await connection.sendRequest<ResourceInventoryResponse>(
        AureliaProtocolRequest.ResourceInventory,
        {},
      );
      const project = inventory.projects.find((candidate) => candidate.status === "ready");
      if (project?.status !== "ready") throw new Error("Expected a ready remote-style project inventory.");
      const productCard = project.resources.find((resource) =>
        resource.kind === "custom-element" && resource.name === "product-card"
      );
      if (productCard?.navigation.state !== "available") {
        throw new Error("Expected product-card remote-style navigation.");
      }
      expectRemoteNamespace(productCard.navigation.location.uri, remoteRootUri);

      const related = await connection.sendRequest<RelatedFilesResponse>(
        AureliaProtocolRequest.RelatedFiles,
        { uri: templateUri },
      );
      expect(related).toHaveLength(1);
      expectRemoteNamespace(related[0]!.uri, remoteRootUri);
      expect(related[0]!.uri).toBe(componentUri);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  },
  30_000,
);

function remoteWorkspaceUri(workspaceRoot: string): string {
  const filePath = URI.file(workspaceRoot).path;
  if (!filePath.startsWith("/")) {
    throw new Error(`Remote-style fixture path must be absolute: ${workspaceRoot}`);
  }
  return URI.from({
    scheme: "vscode-remote",
    authority: "ssh-remote+stage4",
    path: filePath,
  }).toString();
}

function remoteChildUri(rootUri: string, relativePath: string): string {
  const root = URI.parse(rootUri);
  return URI.from({
    scheme: root.scheme,
    authority: root.authority,
    path: path.posix.join(root.path, relativePath.replaceAll("\\", "/")),
  }).toString();
}

function expectRemoteNamespace(uri: string, rootUri: string): void {
  const candidate = URI.parse(uri);
  const root = URI.parse(rootUri);
  expect(candidate.scheme).toBe(root.scheme);
  expect(candidate.authority).toBe(root.authority);
  expect(uri.startsWith("file:")).toBe(false);
}

async function sourceOwnership(
  connection: ReturnType<typeof startServer>["connection"],
  uri: string,
): Promise<SourceOwnershipResponse> {
  return await connection.sendRequest<SourceOwnershipResponse>(
    AureliaProtocolRequest.SourceOwnership,
    { uri },
  );
}

async function expectNewSourceAnalysis(
  events: readonly {
    readonly fingerprint?: string;
    readonly changeKind?: string;
    readonly changedSourceUris?: readonly string[];
  }[],
  cursor: number,
  previousFingerprint: string,
  changedSourceUri: string,
): Promise<void> {
  await vi.waitFor(() => {
    expect(events.slice(cursor).some((event) =>
      event.changeKind === "source-text"
      && typeof event.fingerprint === "string"
      && event.fingerprint !== previousFingerprint
      && event.changedSourceUris?.includes(changedSourceUri) === true
    )).toBe(true);
  }, { timeout: 30_000, interval: 20 });
}
