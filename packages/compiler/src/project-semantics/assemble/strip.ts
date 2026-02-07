import type { BindableDef, ResourceDef, Sourced } from '../compiler.js';

export interface StripSourcedNodesResult {
  removed: number;
}

export function stripSourcedNodes(resources: readonly ResourceDef[]): StripSourcedNodesResult {
  let removed = 0;
  for (const resource of resources) {
    removed += stripResourceDef(resource);
  }
  return { removed };
}

function stripResourceDef(resource: ResourceDef): number {
  let removed = 0;
  removed += stripSourced(resource.className);

  switch (resource.kind) {
    case "custom-element":
      removed += stripSourced(resource.name);
      removed += stripSourcedArray(resource.aliases);
      removed += stripSourced(resource.containerless);
      removed += stripSourced(resource.shadowOptions);
      removed += stripSourced(resource.capture);
      removed += stripSourced(resource.processContent);
      removed += stripSourced(resource.boundary);
      removed += stripSourcedArray(resource.dependencies);
      if (resource.inlineTemplate) {
        removed += stripSourced(resource.inlineTemplate);
      }
      removed += stripBindables(resource.bindables);
      break;
    case "custom-attribute":
      removed += stripSourced(resource.name);
      removed += stripSourcedArray(resource.aliases);
      removed += stripSourced(resource.noMultiBindings);
      if (resource.primary) {
        removed += stripSourced(resource.primary);
      }
      removed += stripBindables(resource.bindables);
      break;
    case "template-controller":
      removed += stripSourced(resource.name);
      removed += stripSourced(resource.aliases);
      removed += stripSourced(resource.noMultiBindings);
      removed += stripBindables(resource.bindables);
      break;
    case "value-converter":
      removed += stripSourced(resource.name);
      if (resource.fromType) {
        removed += stripSourced(resource.fromType);
      }
      if (resource.toType) {
        removed += stripSourced(resource.toType);
      }
      break;
    case "binding-behavior":
      removed += stripSourced(resource.name);
      break;
  }

  return removed;
}

function stripBindables(bindables: Readonly<Record<string, BindableDef>>): number {
  let removed = 0;
  for (const def of Object.values(bindables)) {
    removed += stripSourced(def.property);
    removed += stripSourced(def.attribute);
    removed += stripSourced(def.mode);
    removed += stripSourced(def.primary);
    if (def.type) {
      removed += stripSourced(def.type);
    }
    if (def.doc) {
      removed += stripSourced(def.doc);
    }
  }
  return removed;
}

function stripSourcedArray<T>(values: readonly Sourced<T>[]): number {
  let removed = 0;
  for (const value of values) {
    removed += stripSourced(value);
  }
  return removed;
}

function stripSourced<T>(value: Sourced<T> | undefined): number {
  if (!value || value.origin !== "source") return 0;
  if (!("node" in value)) return 0;
  delete (value as { node?: unknown }).node;
  return 1;
}
