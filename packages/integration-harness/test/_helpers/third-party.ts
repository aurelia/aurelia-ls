import { CustomElement } from "@aurelia/runtime-html";
import { compileWithAot, patchComponentDefinition } from "@aurelia-ls/ssr";
import {
  resolveExternalPackagePath,
  type IntegrationRun,
} from "@aurelia-ls/integration-harness";
import { loadExternalModule } from "./external-modules.js";

const AURELIA_TABLE_PACKAGE = resolveExternalPackagePath("aurelia2-table");

export function ensureBoundLifecycle(elementCtor: unknown): void {
  const proto = (
    elementCtor as {
      prototype?: { bind?: (...args: unknown[]) => void; bound?: (...args: unknown[]) => void };
    }
  ).prototype;
  if (proto?.bind && !proto.bound) {
    proto.bound = function (...args: unknown[]) {
      return proto.bind?.apply(this, args);
    };
  }
}

function stripTemplateWrapper(markup: string): string {
  const trimmed = markup.trim();
  const match = trimmed.match(/^<template[^>]*>([\s\S]*)<\/template>$/i);
  if (!match) {
    return markup;
  }
  return match[1].trim();
}

export async function patchAutPaginationDefinition(
  elementCtor: new () => Record<string, unknown>,
  run: Pick<IntegrationRun, "semantics" | "resourceGraph">,
  packagePath = AURELIA_TABLE_PACKAGE,
): Promise<void> {
  const templateModule = await loadExternalModule(
    packagePath,
    "src/aurelia-table-pagination.html.ts",
  );
  const template = templateModule.default;
  if (typeof template !== "string") {
    throw new Error("Unable to load aut-pagination template from aurelia2-table.");
  }
  const normalizedTemplate = stripTemplateWrapper(template);
  const paginationAot = compileWithAot(normalizedTemplate, {
    name: "aut-pagination",
    semantics: run.semantics,
    resourceGraph: run.resourceGraph,
    resourceScope: run.resourceGraph.root,
  });
  patchComponentDefinition(elementCtor, paginationAot, { name: "aut-pagination" });
  CustomElement.clearDefinition(elementCtor);
  const elementWithAu = elementCtor as { $au?: Record<string, unknown> };
  if (elementWithAu.$au) {
    CustomElement.define(elementWithAu.$au, elementCtor);
  }
}
