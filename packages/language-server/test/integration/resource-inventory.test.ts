import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ResourceExplorerResponse,
  ScopeResourcesResponse,
} from "../../src/protocol.js";
import {
  copyFixtureDirectory,
  fileUri,
  initialize,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

test("resource inventory preserves live definition and visibility identity", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    const result = await connection.sendRequest<ResourceExplorerResponse>("aurelia/getResources", {});

    expect(result.fingerprint).not.toBe("");
    expect(result.evidence.definitions.schemaVersion).toBe("0.2");
    expect(result.evidence.definitions.page).toBeNull();
    expect(result.evidence.definitions.result).toBe("answered");
    expect(result.evidence.visibility.result).toBe("answered");
    expect(result.evidence.compilations.result).toBe("answered");
    expect(new Set(result.resources.map((resource) => resource.id)).size).toBe(result.resources.length);

    const productCards = result.resources.filter((resource) =>
      resource.kind === "custom-element" && resource.name === "product-card"
    );
    expect(productCards).toHaveLength(1);

    const productCard = productCards[0]!;
    const definitionHandle = productCard.definition?.handles?.definitionProductHandle ?? null;
    expect(definitionHandle).not.toBeNull();
    expect(productCard.visibility.length).toBeGreaterThan(0);
    expect(productCard.visibility.some((row) =>
      row.handles?.definitionProductHandle === definitionHandle
    )).toBe(true);
    expect(productCard.bindables).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "item", attribute: "item" }),
      expect.objectContaining({ name: "labelText", attribute: "display-label" }),
      expect.objectContaining({ name: "selected", attribute: "selected" }),
    ]));

    const scope = await connection.sendRequest<ScopeResourcesResponse>(
      "aurelia/getScopeResources",
      { uri: fileUri(fixture, "src/my-app.html") },
    );
    expect(scope).not.toBeNull();
    expect(scope?.compilerWorlds).toHaveLength(1);
    expect(scope?.evidence.visibility.result).toBe("answered");
    const scopedProductCards = scope?.resources.filter((resource) =>
      resource.kind === "custom-element" && resource.name === "product-card"
    ) ?? [];
    expect(scopedProductCards).toHaveLength(1);
    expect(scopedProductCards[0]).toEqual(expect.objectContaining({
      id: productCard.id,
      aliases: productCard.aliases,
      bindables: productCard.bindables,
      definition: productCard.definition,
    }));
    expect(scopedProductCards[0]?.visibility.every((row) =>
      scope?.compilerWorlds.includes(row.compilerWorld)
    )).toBe(true);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
