/**
 * Hydration Manifest Recorder
 *
 * Records the controller tree structure after SSR render completes.
 * The manifest mirrors the controller tree exactly, enabling hydration
 * to consume it in the same order as rendering.
 *
 * Key design decisions:
 * - Tree-shaped manifest (no global indices)
 * - Single `children` array preserves controller order
 * - Discriminator: 'type' in child → TC entry, otherwise → CE/view scope
 * - `if` includes `value` to identify which branch was rendered
 * - `else` included as placeholder to maintain order alignment
 */

import type {
  ICustomElementController,
  ICustomAttributeController,
  ISyntheticView,
  IHydratedController,
  If,
  Repeat,
  With,
  Switch,
  PromiseTemplateController,
  Portal,
} from '@aurelia/runtime-html';

// =============================================================================
// MANIFEST TYPES
//
// The manifest structure mirrors the controller tree:
//
//   IHydrationManifest {
//     root: string                      // Root CE name
//     manifest: IHydrationScopeManifest // Root scope
//   }
//
//   IHydrationScopeManifest {
//     name?: string                     // CE name (only for CE scopes, not view scopes)
//     children: IHydrationChild[]       // TCs and CEs in controller tree order
//   }
//
//   IHydrationChild = ITCEntry | IHydrationScopeManifest
//     - TC entries have `type` and `views`
//     - CE scopes have `name` and `children`
//     - View scopes (inside TC views) have only `children`
//
//   ITCEntry {
//     type: string                      // 'repeat' | 'if' | 'else' | 'with' | ...
//     value?: boolean                   // Only for 'if' - which branch rendered
//     views: IViewEntry[]               // Rendered views (empty if condition false)
//   }
//
//   IViewEntry {
//     nodeCount: number                 // Top-level DOM nodes in this view
//     scope: IHydrationScopeManifest    // Nested content (view scope)
//   }
//
// Discriminator: 'type' in child → TC entry, otherwise → scope
// =============================================================================

export interface IHydrationManifest {
  root: string;
  manifest: IHydrationScopeManifest;
}

export interface IHydrationScopeManifest {
  name?: string;
  children: IHydrationChild[];
}

export type IHydrationChild = ITCEntry | IHydrationScopeManifest;

export interface ITCEntry {
  type: string;
  value?: boolean;
  views: IViewEntry[];
}

export interface IViewEntry {
  nodeCount: number;
  scope: IHydrationScopeManifest;
}

/**
 * Type guard: check if a child is a TC entry (has 'type' property)
 */
export function isTCEntry(child: IHydrationChild): child is ITCEntry {
  return 'type' in child;
}

/**
 * Type guard: check if a child is a scope (CE or view scope)
 */
export function isScopeManifest(child: IHydrationChild): child is IHydrationScopeManifest {
  return !('type' in child);
}

// =============================================================================
// MANIFEST RECORDING
// =============================================================================

/**
 * Record the hydration manifest from the root controller.
 * Call this after `await au.start()` completes.
 *
 * @param rootController - The root custom element controller (au.root.controller)
 */
export function recordManifest(rootController: ICustomElementController): IHydrationManifest {
  const rootScope = buildScopeManifest(rootController);
  return {
    root: rootController.definition.name,
    manifest: rootScope,
  };
}

/**
 * Build a scope manifest for a CE or synthetic view.
 * Both CEs and synthetic views have the same structure - a `children` array
 * containing TCs and CEs in the same order as ctrl.children.
 */
function buildScopeManifest(ctrl: IHydratedController): IHydrationScopeManifest {
  const scope: IHydrationScopeManifest = {
    children: [],
  };

  // Add name for CE scopes (not for synthetic/view scopes)
  if (ctrl.vmKind === 'customElement') {
    scope.name = ctrl.definition.name;
  }

  // Process children in order - they can be TCs (customAttribute) or CEs (customElement)
  const children = ctrl.children ?? [];
  for (const child of children) {
    if (child.vmKind === 'customElement') {
      // Child CE - build its scope manifest
      const childScope = buildCEManifest(child);
      if (childScope) {
        scope.children.push(childScope);
      }
    } else if (child.vmKind === 'customAttribute' && child.definition.isTemplateController) {
      // Note: non-TC custom attributes don't affect manifest structure
      // TC - build its entry with views
      const tcEntry = buildTCEntry(child);
      if (tcEntry) {
        scope.children.push(tcEntry);
      }
    }
  }

  return scope;
}

/**
 * Build manifest for a CE.
 * Returns null for special CEs we skip (au-compose, au-slot).
 */
function buildCEManifest(ctrl: ICustomElementController): IHydrationScopeManifest | null {
  const name = ctrl.definition.name;

  // Skip special CEs - they render dynamically on the client
  if (name === 'au-compose' || name === 'au-slot') {
    return null;
  }

  return buildScopeManifest(ctrl);
}

/**
 * Build a TC entry with its type and rendered views.
 * Returns null for TCs we skip (portal).
 */
function buildTCEntry(ctrl: ICustomAttributeController): ITCEntry | null {
  const type = ctrl.definition.name;

  switch (type) {
    case 'if': {
      const vm = ctrl.viewModel as If;
      // vm.view is the currently active view (could be if-branch OR else-branch)
      // vm.value tells us which branch: true = if-branch, false = else-branch
      const view = vm.view;
      const views: IViewEntry[] = [];
      if (view) {
        views.push(buildViewEntry(view));
      }
      return { type, value: !!vm.value, views };
    }

    case 'else': {
      // else is linked to if - it doesn't have its own views
      // But we MUST include it to maintain children order alignment with ctrl.children
      return { type: 'else', views: [] };
    }

    case 'repeat': {
      const vm = ctrl.viewModel as Repeat;
      // vm.views is the array of rendered views (one per item)
      const views = vm.views.map(view => buildViewEntry(view));
      return { type, views };
    }

    case 'with': {
      const vm = ctrl.viewModel as With;
      // with always has exactly one view (if the value is truthy)
      const view = vm.view;
      const views: IViewEntry[] = [];
      if (view) {
        views.push(buildViewEntry(view));
      }
      return { type, views };
    }

    case 'switch': {
      const _vm = ctrl.viewModel as Switch;
      // TODO: switch is complex - it has special properties:
      // - vm.cases: array of case VIEW MODELS (not controllers)
      // - vm.defaultCase: default case VIEW MODEL
      // - vm.activeCases: currently active case VIEW MODELS
      // - vm.view: just the owning view, not the case views
      // To get controllers: vm.cases[i].$controller, vm.defaultCase.$controller, etc.
      // Note: case/default-case are NESTED inside switch, not siblings like else is to if
      return { type, views: [] };
    }

    case 'promise': {
      const _vm = ctrl.viewModel as PromiseTemplateController;
      // TODO: promise is complex - it has special properties:
      // - vm.pending: pending VIEW MODEL (not controller)
      // - vm.fulfilled: fulfilled VIEW MODEL
      // - vm.rejected: rejected VIEW MODEL
      // - vm.view: just the owning view
      // To get controllers: vm.pending.$controller, vm.fulfilled.$controller, etc.
      // Note: pending/fulfilled/rejected are NESTED inside promise, not siblings
      return { type, views: [] };
    }

    case 'portal': {
      // Portal moves content to another DOM location - skip for SSR
      return null;
    }

    default: {
      // Unknown TC - skip but log for debugging
      console.warn(`[manifest-recorder] Unknown template controller: ${type}`);
      return null;
    }
  }
}

/**
 * Build a view entry for a synthetic controller (TC's rendered view).
 */
function buildViewEntry(ctrl: ISyntheticView): IViewEntry {
  const nodeCount = countViewNodes(ctrl);
  const scope = buildScopeManifest(ctrl);
  return { nodeCount, scope };
}

/**
 * Count the top-level DOM nodes in a synthetic view.
 * This excludes the TC's own anchor/comment nodes.
 */
function countViewNodes(ctrl: ISyntheticView): number {
  const nodes = ctrl.nodes;
  if (!nodes) return 0;

  // nodes.childNodes gives us the array of top-level nodes
  if (nodes.childNodes) {
    return nodes.childNodes.length;
  }

  // Fallback: traverse firstChild → lastChild
  let count = 0;
  let node = nodes.firstChild;
  while (node) {
    count++;
    if (node === nodes.lastChild) break;
    node = node.nextSibling;
  }
  return count;
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Debug utility: print the controller tree structure
 */
export function debugControllerTree(rootController: ICustomElementController): string {
  const lines: string[] = [];

  function visit(ctrl: IHydratedController, indent: number): void {
    const pad = '  '.repeat(indent);

    switch (ctrl.vmKind) {
      case 'customElement': {
        lines.push(`${pad}CE: ${ctrl.definition.name}`);
        const children = ctrl.children ?? [];
        for (const child of children) {
          visit(child, indent + 1);
        }
        break;
      }
      case 'customAttribute': {
        if (ctrl.definition.isTemplateController) {
          const type = ctrl.definition.name;

          switch (type) {
            case 'if': {
              const vm = ctrl.viewModel as If;
              const branch = vm.value ? 'if' : 'else';
              lines.push(`${pad}TC: if (branch: ${branch}, view: ${vm.view ? 'yes' : 'no'})`);
              if (vm.view) {
                visit(vm.view, indent + 1);
              }
              break;
            }
            case 'else': {
              lines.push(`${pad}TC: else (linked to if)`);
              break;
            }
            case 'repeat': {
              const vm = ctrl.viewModel as Repeat;
              const views = vm.views ?? [];
              lines.push(`${pad}TC: repeat (${views.length} views)`);
              views.forEach((view: ISyntheticView, i: number) => {
                lines.push(`${pad}  [view ${i}]`);
                visit(view, indent + 2);
              });
              break;
            }
            case 'with': {
              const vm = ctrl.viewModel as With;
              lines.push(`${pad}TC: with (view: ${vm.view ? 'yes' : 'no'})`);
              if (vm.view) {
                visit(vm.view, indent + 1);
              }
              break;
            }
            case 'switch': {
              const _vm = ctrl.viewModel as Switch;
              lines.push(`${pad}TC: ${type}`);
              break;
            }

            case 'promise': {
              const _vm = ctrl.viewModel as PromiseTemplateController;
              lines.push(`${pad}TC: ${type}`);
              break;
            }

            case 'portal': {
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
      case 'synthetic': {
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
  return lines.join('\n');
}
