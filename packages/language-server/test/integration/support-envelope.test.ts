import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { URI } from "vscode-uri";
import {
  AureliaProtocolRequest,
  type RelatedFilesResponse,
  type ResourceInventoryResponse,
  type SourceOwnershipResponse,
} from "../../src/protocol.js";
import {
  copyFixtureDirectory,
  createAureliaAppFixture,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

const admittedSources = [
  ["src/view.html", "html", "template"],
  ["src/support.ts", "typescript", "app-source"],
  ["src/support.tsx", "typescriptreact", "app-source"],
  ["src/support.mts", "typescript", "app-source"],
  ["src/support.cts", "typescript", "app-source"],
  ["src/support.js", "javascript", "app-source"],
  ["src/support.jsx", "javascriptreact", "app-source"],
  ["src/support.mjs", "javascript", "app-source"],
  ["src/support.cjs", "javascript", "app-source"],
] as const;

test("admits and projects every supported script module form through the real server", async () => {
  const fixture = createAureliaAppFixture({
    "src/app.ts": "export class AppRoot {}\n",
    "src/view.html": "<template>${message}</template>\n",
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
    for (const [relativePath, languageId, role] of admittedSources) {
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
    }
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

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
