/**
 * SSR Manifest Recording
 *
 * Records the controller tree structure after SSR render to produce
 * a manifest for client-side hydration.
 *
 * This lives in the build package (not runtime) because:
 * 1. Only used during SSR (server-side), not needed in client bundle
 * 2. Can have cross-package awareness (runtime-html, router, etc.)
 * 3. Allows faster iteration without touching aurelia runtime
 *
 * Types (ISSRManifest, ISSRScope, etc.) remain in runtime-html since
 * hydration needs them on the client.
 */

import type {
  ICustomElementController,
  ICustomAttributeController,
  ISyntheticView,
  IHydratedController,
  ISSRManifest,
  ISSRScope,
  ISSRTemplateController,
} from "@aurelia/runtime-html";

// TC types for accessing view model internals
import type {
  If,
  Repeat,
  With,
  Switch,
  PromiseTemplateController,
  Portal,
} from "@aurelia/runtime-html";

/**
 * Record the SSR manifest from the root controller after rendering completes.
 *
 * The manifest mirrors the controller tree structure and is used by the client
 * to locate DOM nodes during hydration.
 */
export function recordManifest(rootController: ICustomElementController): ISSRManifest {
  const rootScope = buildScopeManifest(rootController);
  return {
    root: rootController.definition.name,
    manifest: rootScope,
  };
}

function buildScopeManifest(ctrl: IHydratedController, isContainerless: boolean = false): ISSRScope {
  const scope: ISSRScope = { children: [] };

  if (ctrl.vmKind === "customElement") {
    scope.name = ctrl.definition.name;
    // TODO: Check if CE is containerless and set nodeCount if so
  }

  if (isContainerless) {
    scope.nodeCount = countViewNodes(ctrl as ISyntheticView);
  }

  const children = ctrl.children ?? [];
  for (const child of children) {
    if (child.vmKind === "customElement") {
      const childScope = buildCEManifest(child);
      if (childScope) scope.children.push(childScope);
    } else if (child.vmKind === "customAttribute" && child.definition.isTemplateController) {
      const tcEntry = buildTCEntry(child);
      if (tcEntry) scope.children.push(tcEntry);
    }
  }

  return scope;
}

function buildCEManifest(ctrl: ICustomElementController): ISSRScope | null {
  const name = ctrl.definition.name;
  // Skip special elements that don't have manifest entries
  if (name === "au-compose" || name === "au-slot") return null;
  // TODO: Add router viewport handling here when router support is added
  // if (name === 'au-viewport') { ... }
  return buildScopeManifest(ctrl);
}

function buildTCEntry(ctrl: ICustomAttributeController): ISSRTemplateController | null {
  const type = ctrl.definition.name;

  switch (type) {
    case "if": {
      const vm = ctrl.viewModel as If;
      const views: ISSRScope[] = vm.view ? [buildViewScope(vm.view)] : [];
      return { type, state: { value: !!vm.value }, views };
    }

    case "else":
      // Placeholder to maintain children order alignment
      return { type: "else", views: [] };

    case "repeat": {
      const vm = ctrl.viewModel as Repeat;
      return { type, views: vm.views.map((view) => buildViewScope(view)) };
    }

    case "with": {
      const vm = ctrl.viewModel as With;
      const views: ISSRScope[] = vm.view ? [buildViewScope(vm.view)] : [];
      return { type, views };
    }

    case "switch": {
      const _vm = ctrl.viewModel as Switch;
      // TODO: implement switch/case manifest recording
      return { type, views: [] };
    }

    case "promise": {
      const _vm = ctrl.viewModel as PromiseTemplateController;
      // TODO: implement promise manifest recording
      return { type, views: [] };
    }

    case "portal":
      // Portals render elsewhere, not part of manifest tree
      return null;

    default:
      // Unknown TC - warn in dev mode
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[recordManifest] Unknown template controller: ${type}`);
      }
      return null;
  }
}

function buildViewScope(ctrl: ISyntheticView): ISSRScope {
  return buildScopeManifest(ctrl, true);
}

function countViewNodes(ctrl: ISyntheticView): number {
  const nodes = ctrl.nodes;
  if (!nodes) return 0;
  if (nodes.childNodes) return nodes.childNodes.length;

  let count = 0;
  let node = nodes.firstChild;
  while (node) {
    count++;
    if (node === nodes.lastChild) break;
    node = node.nextSibling;
  }
  return count;
}

/**
 * Debug utility: print the controller tree structure.
 *
 * Useful for understanding what Aurelia rendered and debugging
 * manifest recording issues.
 */
export function debugControllerTree(rootController: ICustomElementController): string {
  const lines: string[] = [];

  function visit(ctrl: IHydratedController, indent: number): void {
    const pad = "  ".repeat(indent);

    switch (ctrl.vmKind) {
      case "customElement": {
        lines.push(`${pad}CE: ${ctrl.definition.name}`);
        const children = ctrl.children ?? [];
        for (const child of children) {
          visit(child, indent + 1);
        }
        break;
      }
      case "customAttribute": {
        if (ctrl.definition.isTemplateController) {
          const type = ctrl.definition.name;

          switch (type) {
            case "if": {
              const vm = ctrl.viewModel as If;
              const branch = vm.value ? "if" : "else";
              lines.push(`${pad}TC: if (branch: ${branch}, view: ${vm.view ? "yes" : "no"})`);
              if (vm.view) {
                visit(vm.view, indent + 1);
              }
              break;
            }
            case "else": {
              lines.push(`${pad}TC: else (linked to if)`);
              break;
            }
            case "repeat": {
              const vm = ctrl.viewModel as Repeat;
              const views = vm.views ?? [];
              lines.push(`${pad}TC: repeat (${views.length} views)`);
              views.forEach((view: ISyntheticView, i: number) => {
                lines.push(`${pad}  [view ${i}]`);
                visit(view, indent + 2);
              });
              break;
            }
            case "with": {
              const vm = ctrl.viewModel as With;
              lines.push(`${pad}TC: with (view: ${vm.view ? "yes" : "no"})`);
              if (vm.view) {
                visit(vm.view, indent + 1);
              }
              break;
            }
            case "switch": {
              const _vm = ctrl.viewModel as Switch;
              lines.push(`${pad}TC: ${type}`);
              break;
            }

            case "promise": {
              const _vm = ctrl.viewModel as PromiseTemplateController;
              lines.push(`${pad}TC: ${type}`);
              break;
            }

            case "portal": {
              const _vm = ctrl.viewModel as Portal;
              lines.push(`${pad}TC: ${type}`);
              break;
            }

            default: {
              lines.push(`${pad}TC: ${type}`);
              break;
            }
          }
        }
        break;
      }
      case "synthetic": {
        lines.push(`${pad}VIEW (synthetic)`);
        const children = ctrl.children ?? [];
        for (const child of children) {
          visit(child, indent + 1);
        }
        break;
      }
    }
  }

  visit(rootController, 0);
  return lines.join("\n");
}
