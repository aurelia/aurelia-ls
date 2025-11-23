import { createEmptyResourceCollections, emptyDiscoveryResult } from "./shared.js";
import { runDecoratorDiscovery } from "./decorator-discovery.js";
import { runConventionDiscovery } from "./convention-discovery.js";
import { runDiRegistryDiscovery } from "./di-registry-discovery.js";
import type { DiscoveryResult, DiscoveredResource, ResourceRegistration } from "./types.js";
import type { Logger } from "../../types.js";
import type ts from "typescript";
import type { ResourceCollections } from "@aurelia-ls/domain";

export function runDiscovery(program: ts.Program, logger: Logger): DiscoveryResult {
  const decorator = runDecoratorDiscovery(program, logger);
  const conventions = runConventionDiscovery(program, logger);
  const di = runDiRegistryDiscovery(program, logger);

  return mergeDiscoveryResults(decorator, conventions, di);
}

export function emptyDiscovery(): DiscoveryResult {
  return emptyDiscoveryResult();
}

function mergeDiscoveryResults(...results: DiscoveryResult[]): DiscoveryResult {
  const resources: ResourceCollections = createEmptyResourceCollections();
  const descriptors: DiscoveredResource[] = [];
  const registrations: ResourceRegistration[] = [];

  for (const result of results) {
    mergeResourceCollections(resources, result.resources);
    descriptors.push(...result.descriptors);
    registrations.push(...result.registrations);
  }

  return { resources, descriptors, registrations };
}

function mergeResourceCollections(target: ResourceCollections, incoming: ResourceCollections): void {
  Object.assign(target.elements, incoming.elements);
  Object.assign(target.attributes, incoming.attributes);
  Object.assign(target.controllers, incoming.controllers);
  Object.assign(target.valueConverters, incoming.valueConverters);
  Object.assign(target.bindingBehaviors, incoming.bindingBehaviors);
}
