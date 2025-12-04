import {
  DEFAULT_SEMANTICS,
  type ResourceCollections,
} from "@aurelia-ls/domain";
import type { DiscoveryResult } from "./types.js";

export function createEmptyResourceCollections(): ResourceCollections {
  return {
    elements: {},
    attributes: {},
    controllers: { ...DEFAULT_SEMANTICS.resources.controllers },
    valueConverters: {},
    bindingBehaviors: {},
  };
}

export function emptyDiscoveryResult(): DiscoveryResult {
  return {
    resources: createEmptyResourceCollections(),
    descriptors: [],
    registrations: [],
  };
}
