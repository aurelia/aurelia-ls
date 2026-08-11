import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { semanticWorkspaceDescriptorForRuntimeOptions } from "@aurelia-ls/semantic-runtime";
import { afterEach, expect, test } from "vitest";
import type { MessageConnection } from "vscode-languageserver/node";

import {
  changeDocument,
  createDiagnosticsRecorder,
  decodeHover,
  fileUri,
  initialize,
  openDocument,
  positionAt,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const pressureFixtureRoot = path.join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "fixtures",
  "pressure",
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("route hover keeps authored string literals closed beside a dynamic context", async () => {
  const fixture = await createBroadRoutedWorkspace();
  const htmlPath = path.join(fixture, "src/app.html");
  const appPath = path.join(fixture, "src/app.ts");
  const htmlUri = fileUri(fixture, "src/app.html");
  const appUri = fileUri(fixture, "src/app.ts");
  const htmlBaseline = await readFile(htmlPath, "utf8");
  const appBaseline = await readFile(appPath, "utf8");
  const closedLine = "      <a load=\"route.bind: 'item-detail'; params.bind: { itemId: 'item-1' }\">Detail by id</a>";
  const dynamicLine = "      <a load=\"route: item-detail; context.bind: alternateContext; params.bind: { itemId: 'item-1' }\">Open detail</a>";
  const htmlText = htmlBaseline.replace(
    "    </nav>",
    `${closedLine}\n${dynamicLine}\n    </nav>`,
  );
  const appText = appBaseline.replace(
    "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');",
    "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');\n  alternateContext!: unknown;",
  );
  const server = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(
    server.connection,
    server.child,
    () => server.getStderr(),
  );

  try {
    await initialize(
      server.connection,
      server.child,
      () => server.getStderr(),
      fixture,
      { diagnostics: {} },
    );
    openDocument(server.connection, appUri, "typescript", appBaseline);
    openDocument(server.connection, htmlUri, "html", htmlBaseline);
    await diagnostics.wait(htmlUri, 60_000);
    changeDocument(server.connection, appUri, appText, 2);
    changeDocument(server.connection, htmlUri, htmlText, 2);
    await diagnostics.wait(htmlUri, 120_000);

    expect(await hoverAtRouteTarget(server.connection, htmlUri, htmlText, "route.bind: 'item-detail'"))
      .toBe("```text\n(route id) 'item-detail'\n```");
    expect(await hoverAtRouteTarget(server.connection, htmlUri, htmlText, "route: item-detail"))
      .toBe("Dynamic route target.");
  } finally {
    diagnostics.dispose();
    server.dispose();
    server.child.kill("SIGKILL");
    await waitForExit(server.child);
  }
}, 180_000);

async function hoverAtRouteTarget(
  connection: MessageConnection,
  uri: string,
  text: string,
  marker: string,
): Promise<string> {
  const markerStart = text.indexOf(marker);
  expect(markerStart).toBeGreaterThanOrEqual(0);
  const targetStart = text.indexOf("item-detail", markerStart);
  expect(targetStart).toBeGreaterThanOrEqual(0);
  const hover = await connection.sendRequest("textDocument/hover", {
    textDocument: { uri },
    position: positionAt(text, targetStart + 2),
  });
  return decodeHover(hover);
}

async function createBroadRoutedWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "language-server-route-hover-"));
  temporaryRoots.push(workspaceRoot);
  await cp(
    path.join(pressureFixtureRoot, "app-pattern-routed-catalog-storefront"),
    workspaceRoot,
    { recursive: true },
  );
  for (const [fixtureName, destinationName] of [
    ["resource-registration-local-templates", "local-templates"],
    ["plugin-capability-app-root-isolation", "overlap"],
    ["resource-registration-duplicates", "duplicates"],
    ["resource-registration-effective-definitions", "effective-definitions"],
  ] as const) {
    await cp(
      path.join(pressureFixtureRoot, fixtureName),
      path.join(workspaceRoot, "host-corpus", destinationName),
      { recursive: true },
    );
  }
  const projects = [
    {
      rootDir: workspaceRoot,
      projectKey: "host-alpha",
      sourceFiles: await sourceFilesUnder(workspaceRoot, [
        "src",
        "host-corpus/local-templates/src",
        "host-corpus/overlap/src",
        "host-corpus/duplicates/src",
        "host-corpus/effective-definitions/src",
      ]),
    },
    {
      rootDir: workspaceRoot,
      projectKey: "host-beta",
      sourceFiles: await sourceFilesUnder(workspaceRoot, ["host-corpus/overlap/src"]),
    },
  ];
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({ workspaceRoot, projects });
  await writeFile(
    path.join(workspaceRoot, "semantic-workspace.json"),
    `${JSON.stringify(descriptor, null, 2)}\n`,
    "utf8",
  );
  return workspaceRoot;
}

async function sourceFilesUnder(
  workspaceRoot: string,
  relativeRoots: readonly string[],
): Promise<{ readonly path: string }[]> {
  const sourceFiles: { readonly path: string }[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (/\.(?:css|html|ts)$/u.test(entry.name)) {
        sourceFiles.push({ path: path.relative(workspaceRoot, entryPath) });
      }
    }
  };
  for (const relativeRoot of relativeRoots) {
    await visit(path.join(workspaceRoot, relativeRoot));
  }
  return sourceFiles.sort((left, right) => left.path.localeCompare(right.path));
}
