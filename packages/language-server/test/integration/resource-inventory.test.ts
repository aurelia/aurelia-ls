import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AureliaProtocolRequest,
  type RelatedFilesResponse,
  type ResourceInventoryResponse,
  type TemplateResourceAvailabilityResponse,
} from "../../src/protocol.js";
import {
  copyFixtureDirectory,
  changeDocument,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

test("resource discovery transports exact project inventory and cursor-selected availability", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  seedAdversarialResourceDiscovery(fixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    const productCardUri = fileUri(fixture, "src/components/product-card.ts");
    const productCardPath = path.join(fixture, "src/components/product-card.ts");
    const productCardText = fs.readFileSync(productCardPath, "utf8");
    openDocument(connection, productCardUri, "typescript", productCardText);
    const result = await connection.sendRequest<ResourceInventoryResponse>(
      AureliaProtocolRequest.ResourceInventory,
      {},
    );

    expect(result.fingerprint).not.toBe("");
    expect(result.projects).toHaveLength(1);
    const project = result.projects[0]!;
    expect(project.status).toBe("ready");
    if (project.status !== "ready") throw new Error(project.message);
    expect(project.answer).toMatchObject({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      page: null,
    });
    expect(project.typeSurfacesIncluded).toBe(false);
    expect(new Set(project.resources.map((resource) => resource.identityKey)).size).toBe(project.resources.length);
    expect(project.resources.map((resource) => String(resource.kind))).not.toEqual(expect.arrayContaining([
      "binding-command",
      "attribute-pattern",
    ]));

    const productCard = project.resources.find((resource) =>
      resource.kind === "custom-element" && resource.name === "product-card"
    );
    expect(productCard).toBeDefined();
    expect(productCard?.navigation).toMatchObject({
      state: "available",
      location: {
        uri: fileUri(fixture, "src/components/product-card.ts"),
        role: "public-name",
      },
    });
    if (productCard?.navigation.state !== "available") {
      throw new Error("Expected product-card to have an authored navigation target.");
    }
    const initialProductCardLine = productCard.navigation.location.range.start.line;
    expect(productCard?.aliases).toEqual([
      expect.objectContaining({
        name: "store-card",
        source: expect.objectContaining({ state: "available" }),
        navigation: expect.objectContaining({ state: "available" }),
      }),
    ]);
    expect(sourceTargetText(productCardText, productCard?.aliases[0]?.navigation)).toBe("store-card");
    expect(productCard?.bindables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "item",
        attribute: "item",
        navigation: expect.objectContaining({ state: "available" }),
      }),
      expect.objectContaining({
        name: "labelText",
        attribute: "display-label",
        sources: expect.objectContaining({
          name: expect.objectContaining({ state: "available" }),
          attribute: expect.objectContaining({ state: "available" }),
        }),
      }),
    ]));
    const labelText = productCard?.bindables.find((bindable) => bindable.name === "labelText");
    expect(productCard?.bindables.every((bindable) => bindable.valueType == null)).toBe(true);
    expect(sourceTargetText(productCardText, labelText?.sources.name)).toBe("labelText");
    expect(sourceTargetText(productCardText, labelText?.sources.attribute)).toBe("display-label");

    const richResult = await connection.sendRequest<ResourceInventoryResponse>(
      AureliaProtocolRequest.ResourceInventory,
      { includeTypeSurfaces: true },
    );
    const richProject = richResult.projects[0];
    if (richProject?.status !== "ready") throw new Error("Expected rich resource inventory project.");
    expect(richProject.typeSurfacesIncluded).toBe(true);
    expect(richProject.resources.find((resource) =>
      resource.identityKey === productCard?.identityKey
    )?.bindables.find((bindable) => bindable.name === "labelText")?.valueType).toBe("string");

    const localPill = project.resources.find((resource) =>
      resource.kind === "custom-element" && resource.name === "local-pill"
    );
    expect(localPill).toMatchObject({
      locality: { kind: "local-template", ownerName: "my-app" },
      navigation: { state: "available", location: { role: "public-name" } },
    });
    expect(localPill?.bindables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "text",
        attribute: "display-text",
        navigation: expect.objectContaining({
          state: "available",
          location: expect.objectContaining({ role: "bindable-name" }),
        }),
      }),
    ]));

    const repeat = project.resources.find((resource) =>
      resource.kind === "template-controller" && resource.name === "repeat"
    );
    expect(repeat).toMatchObject({
      origin: { kind: "framework", packageName: "@aurelia/runtime-html" },
      navigation: { state: "unavailable", reason: "external-catalog" },
    });

    const templatePath = path.join(fixture, "src/my-app.html");
    const template = fs.readFileSync(templatePath, "utf8");
    const position = positionAt(template, template.indexOf("<product-card") + 1);
    const availability = await connection.sendRequest<TemplateResourceAvailabilityResponse>(
      AureliaProtocolRequest.TemplateResourceAvailability,
      { uri: fileUri(fixture, "src/my-app.html"), position },
    );
    expect(availability.fingerprint).toBe(result.fingerprint);
    expect(availability.projectSelection.status).toBe("exact");
    if (availability.projectSelection.status !== "exact") {
      throw new Error(`Expected exact project selection, received ${availability.projectSelection.status}.`);
    }
    expect(availability.projectSelection.answer.selection).toBe("exact");
    expect(availability.projectSelection.selectedTemplate?.definitionName).toBe("my-app");
    const scopedProductCard = availability.projectSelection.resources.find((row) =>
      row.resource.identityKey === productCard?.identityKey
    );
    expect(scopedProductCard).toMatchObject({
      state: "available",
      resource: { name: "product-card" },
    });
    expect(scopedProductCard?.availabilitySource.state).not.toBe("absent");
    const scopedLocalPill = availability.projectSelection.resources.find((row) =>
      row.resource.identityKey === localPill?.identityKey
    );
    expect(scopedLocalPill).toMatchObject({
      state: "available",
      resource: { identityKey: localPill?.identityKey, name: "local-pill" },
    });

    const shiftedProductCardText = `// shifts every authored resource token\n${productCardText}`;
    changeDocument(connection, productCardUri, shiftedProductCardText, 2);
    const refreshed = await waitForInventory(connection, (candidate) => {
      if (candidate.fingerprint === result.fingerprint) return false;
      const refreshedProject = candidate.projects.find((entry) => entry.status === "ready");
      if (refreshedProject?.status !== "ready") return false;
      const refreshedCard = refreshedProject.resources.find((resource) => resource.identityKey === productCard?.identityKey);
      return refreshedCard?.navigation.state === "available"
        && refreshedCard.navigation.location.range.start.line === initialProductCardLine + 1;
    });
    const refreshedProject = refreshed.projects.find((entry) => entry.status === "ready");
    if (refreshedProject?.status !== "ready") throw new Error("Expected refreshed resource project.");
    const refreshedCard = refreshedProject.resources.find((resource) => resource.identityKey === productCard?.identityKey);
    expect(refreshedCard?.navigation).toMatchObject({
      state: "available",
      location: { role: "public-name" },
    });
    expect(sourceTargetText(shiftedProductCardText, refreshedCard?.navigation)).toBe("product-card");

    const related = await connection.sendRequest<RelatedFilesResponse>(
      AureliaProtocolRequest.RelatedFiles,
      { uri: fileUri(fixture, "src/components/product-card.html") },
    );
    expect(related).toEqual([expect.objectContaining({
      uri: fileUri(fixture, "src/components/product-card.ts"),
      role: "component-source",
      elementName: "product-card",
      className: "ProductCard",
    })]);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function seedAdversarialResourceDiscovery(fixture: string): void {
  const cardPath = path.join(fixture, "src/components/product-card.ts");
  const card = fs.readFileSync(cardPath, "utf8").replace(
    "  name: 'product-card',\n",
    "  name: 'product-card',\n  aliases: ['store-card'],\n",
  );
  fs.writeFileSync(cardPath, card);

  const templatePath = path.join(fixture, "src/my-app.html");
  const template = fs.readFileSync(templatePath, "utf8").replace(
    "<template>\n",
    `<template>\n  <template as-custom-element="local-pill">\n    <bindable name="text" attribute="display-text"></bindable>\n    <span>\${text}</span>\n  </template>\n  <local-pill display-text.bind="heading"></local-pill>\n`,
  );
  fs.writeFileSync(templatePath, template);
}

async function waitForInventory(
  connection: ReturnType<typeof startServer>["connection"],
  predicate: (response: ResourceInventoryResponse) => boolean,
  timeoutMs = 30_000,
): Promise<ResourceInventoryResponse> {
  const started = Date.now();
  let last: ResourceInventoryResponse | null = null;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await connection.sendRequest<ResourceInventoryResponse>(AureliaProtocolRequest.ResourceInventory, {});
      if (predicate(last)) return last;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for refreshed resource inventory; last=${JSON.stringify(last)}`);
}

function sourceTargetText(
  text: string,
  target: { readonly state: string; readonly location?: { readonly range: { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } } } } | undefined,
): string | null {
  if (target?.state !== "available" || target.location == null) return null;
  const start = offsetAt(text, target.location.range.start);
  const end = offsetAt(text, target.location.range.end);
  return text.slice(start, end);
}

function positionAt(text: string, offset: number): { readonly line: number; readonly character: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return { line: lines.length - 1, character: lines.at(-1)?.length ?? 0 };
}

function offsetAt(text: string, position: { readonly line: number; readonly character: number }): number {
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    offset += (lines[line]?.length ?? 0) + 1;
  }
  return offset + position.character;
}
