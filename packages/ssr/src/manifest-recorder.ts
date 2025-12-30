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
 * Interface for ViewportCustomElement's public API.
 * The router exposes currentController for accessing the routed component.
 */
interface IViewportPublicAPI {
  readonly currentController: ICustomElementController | null;
}

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

  // Router viewport: access routed component through ViewportAgent
  if (name === "au-viewport") {
    return buildViewportManifest(ctrl);
  }

  return buildScopeManifest(ctrl);
}

/**
 * Build manifest entry for a router viewport.
 *
 * Viewports are like template controllers - they manage child content through
 * their own mechanism (ViewportAgent) rather than the standard children array.
 * The router exposes currentController as a public getter for this purpose.
 */
function buildViewportManifest(ctrl: ICustomElementController): ISSRScope {
  const scope: ISSRScope = { name: "au-viewport", children: [] };

  // Use the public API to get the routed component's controller
  const viewport = ctrl.viewModel as IViewportPublicAPI;
  const routedController = viewport.currentController;

  if (routedController != null) {
    const routedScope = buildScopeManifest(routedController);
    scope.children.push(routedScope);
  }

  return scope;
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
      const vm = ctrl.viewModel as Switch;
      const activeCases = (vm as unknown as { activeCases: { view?: ISyntheticView }[] }).activeCases;
      const views: ISSRScope[] = [];
      for (const c of activeCases) {
        if (c.view) views.push(buildViewScope(c.view));
      }
      return { type, views };
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
        const name = ctrl.definition.name;
        lines.push(`${pad}CE: ${name}`);

        // Special handling for router viewport
        if (name === "au-viewport") {
          const viewport = ctrl.viewModel as IViewportPublicAPI;
          const routedController = viewport.currentController;
          if (routedController != null) {
            lines.push(`${pad}  [routed component]`);
            visit(routedController, indent + 2);
          } else {
            lines.push(`${pad}  (no routed component)`);
          }
          break;
        }

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
