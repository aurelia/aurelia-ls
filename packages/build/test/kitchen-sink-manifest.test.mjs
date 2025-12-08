/**
 * Kitchen Sink Manifest Test
 *
 * Goal: Exercise all structural patterns needed for hydration manifest design.
 * Using plain Aurelia bootstrapping - no AOT, no Vite, no patching.
 */

import test from "node:test";
import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, IPlatform, StandardConfiguration, refs } from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";

// =============================================================================
// COMPONENTS (normal Aurelia style - template in $au)
// =============================================================================

class HeaderWidget {
  static $au = {
    type: "custom-element",
    name: "header-widget",
    template: `<header>\${title}</header>`,
    bindables: ["title"],
  };
}

class FooterWidget {
  static $au = {
    type: "custom-element",
    name: "footer-widget",
    template: `<footer>\${text}</footer>`,
    bindables: ["text"],
  };
}

class SectionBadge {
  static $au = {
    type: "custom-element",
    name: "section-badge",
    template: `<span class="badge">Count: \${count}</span>`,
    bindables: ["count"],
  };
}

class ItemCard {
  static $au = {
    type: "custom-element",
    name: "item-card",
    template: `<div class="item-card">
      <span class="name">\${item.name}</span>
      <span if.bind="item.highlighted" class="highlighted">!</span>
      <span else class="normal">-</span>
    </div>`,
    bindables: ["item"],
  };
}

class KitchenSink {
  headerTitle = "Test App";
  footerText = "Footer";
  sections = [
    { visible: true, items: [{ name: "A1", highlighted: true }, { name: "A2", highlighted: false }] },
    { visible: false, items: [{ name: "B1", highlighted: false }] },
    { visible: true, items: [{ name: "C1", highlighted: false }, { name: "C2", highlighted: true }] },
  ];

  static $au = {
    type: "custom-element",
    name: "kitchen-sink",
    template: `<div class="kitchen-sink">
      <header-widget title.bind="headerTitle"></header-widget>
      <div repeat.for="section of sections">
        <div if.bind="section.visible">
          <div repeat.for="item of section.items">
            <item-card item.bind="item"></item-card>
          </div>
        </div>
        <section-badge count.bind="section.items.length"></section-badge>
      </div>
      <footer-widget text.bind="footerText"></footer-widget>
    </div>`,
    dependencies: [HeaderWidget, FooterWidget, SectionBadge, ItemCard],
  };
}

// =============================================================================
// TEST
// =============================================================================

test("kitchen sink renders", async () => {
  // Create a JSDOM environment
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div></body></html>`, {
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // Create Aurelia with browser platform
  const platform = new BrowserPlatform(window);
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
  );

  // Start Aurelia
  const host = window.document.getElementById("app");
  const au = new Aurelia(container);
  au.app({ host, component: KitchenSink });
  await au.start();

  // Output
  console.log("\n=== RENDERED HTML ===");
  console.log(host.innerHTML);

  console.log("\n=== CONTROLLER TREE ===");
  visitController(au.root.controller, {});
  console.log("=== END CONTROLLER TREE ===");

  console.log("\n=== HYDRATION MANIFEST ===");
  const manifest = buildHydrationManifest(au.root.controller);
  console.log(JSON.stringify(manifest, null, 2));
  console.log("=== END HYDRATION MANIFEST ===");

  // Cleanup
  await au.stop();
});

/**
 * key takeaway: customElements and synthetic controller types (which internally are rendered as if they are anonymous custom elements)
 * always have the `children` property, making child traversal easy.
 *
 * customAttributes that are templateControllers will need special semantic awareness to understand where their views are stored
 * - for built-ins we have this knowledge, for userland TCs we will need to define and document a protocol in the future
 */
const visitController = (ctrl, manifest, indent = 0) => {
  // ctrl is the Controller class from `packages\runtime-html\src\templating\controller.ts`
  // it has useful things like:
  // - `definition` (CE or CA)
  // - `host` (for CE) / `location` (for containerless CE, or TC)
  // - `children` (child controllers, for CE or synthetics)
  // - `nodes` (the nodes within the host or in-between the start/end markers if containerless)
  // - `viewModel` (the CE or CA/TC class; synthetics don't have a viewModel)
  // - `scope` (where the `bindingContext` is the VM class instance or just an object in the case of a synthetic)
  // - `container` (the scoped container for the resource)
  // - `viewFactory` (only present for synthetic views)

  const pad = "  ".repeat(indent);

  switch (ctrl.vmKind) {
    case "customElement": {
      // definition is CustomElementDefinition

      switch (ctrl.definition.name) {
        case "au-compose": {
          // just let it render on the client
          console.log(`${pad}CE: au-compose (skip)`);
          break;
        }
        case "au-slot": {
          // just let it render on the client
          console.log(`${pad}CE: au-slot (skip)`);
          break;
        }
        default: {
          // Userland CE
          console.log(`${pad}CE: ${ctrl.definition.name}`);

          // build/record something?
          const manifestObj = {};
          // put it on the `manifest` somehow?

          const children = ctrl.children ?? [];
          // children can be TCs or CEs
          for (const child of children) {
            // or manifestObj per child?
            visitController(child, manifestObj, indent + 1);
          }
          break;
        }
      }
      break;
    }
    case "customAttribute": {
      // definition is CustomAttributeDefinition
      if (ctrl.definition.isTemplateController) {
        // definition.name is the canonical resource name
        switch (ctrl.definition.name) {
          case "if": {
            // The `If` class instance at `packages\runtime-html\src\resources\template-controllers\if.ts`
            const vm = ctrl.viewModel;
            // The currently active view (vmKind 'synthetic') - this can be either the `ifView` or the `elseView` and has the corresponding viewFactory on it
            const view = vm.view;

            const branch = vm.value ? 'if' : 'else';
            console.log(`${pad}TC: if (branch: ${branch}, view: ${view ? 'yes' : 'no'})`);

            // build/record something?
            const manifestObj = {};
            // put it on the `manifest` somehow?

            if (view) {
              visitController(view, manifestObj, indent + 1);
            }
            break;
          }
          case "else": {
            // The `Else` class is linked to the `If` - it doesn't have its own view, it shares with `if`
            console.log(`${pad}TC: else (linked to if, no separate view)`);
            break;
          }
          case "repeat": {
            // The `Repeat` class instance at `packages\runtime-html\src\resources\template-controllers\repeat.ts`
            const vm = ctrl.viewModel;
            // The currently active views (vmKind 'synthetic')
            const views = vm.views ?? [];
            console.log(`${pad}TC: repeat (${views.length} views)`);

            // build/record something?
            const manifestObj = {};
            // put it on the `manifest` somehow?

            for (let i = 0; i < views.length; i++) {
              console.log(`${pad}  [view ${i}]`);
              // or manifestObj per view?
              visitController(views[i], manifestObj, indent + 2);
            }
            break;
          }
          case "promise": {
            // The `PromiseTemplateController` class instance at `packages\runtime-html\src\resources\template-controllers\promise.ts`
            const vm = ctrl.viewModel;
            // The view for the promise controller itself (should only contain elements with pending/fulfilled/rejected on them)
            const view = vm.view;

            // The `PendingTemplateController`, `FulfilledTemplateController` and `RejectedTemplateController` at `packages\runtime-html\src\resources\template-controllers\promise.ts`
            // These are linked during render and don't need to be discovered in any special way
            const { pending, fulfilled, rejected } = vm;

            console.log(`${pad}TC: promise (skip for now)`);
            break;
          }
          case "switch": {
            // The `Switch` class instance at `packages\runtime-html\src\resources\template-controllers\switch.ts`
            const vm = ctrl.viewModel;

            console.log(`${pad}TC: switch (TODO)`);
            break;
          }
          case "with": {
            // The `With` class instance at `packages\runtime-html\src\resources\template-controllers\with.ts`
            const vm = ctrl.viewModel;
            const view = vm.view;
            console.log(`${pad}TC: with (view: ${view ? 'yes' : 'no'})`);

            if (view) {
              visitController(view, {}, indent + 1);
            }
            break;
          }
          case "portal": {
            // The `Portal` class instance at `packages\runtime-html\src\resources\template-controllers\portal.ts`
            const vm = ctrl.viewModel;

            console.log(`${pad}TC: portal (skip for now)`);
            break;
          }
          default: {
            // probably some kind of userland CE or plugin
            // we can document some kind of public contract for SSR support later
            console.log(`${pad}TC: ${ctrl.definition.name} (unknown)`);
            break;
          }
        }
      }
      break;
    }
    case "synthetic": {
      // Something created by a template controller (or a fancy custom element like au-compose);
      // this is essentially an anonymous custom element
      console.log(`${pad}VIEW (synthetic)`);

      // build/record something?
      const manifestObj = {};
      // put it on the `manifest` somehow?

      const children = ctrl.children ?? [];
      // children can be TCs or CEs
      for (const child of children) {
        // or manifestObj per child?
        visitController(child, manifestObj, indent + 1);
      }
      break;
    }
  }
};

// =============================================================================
// MANIFEST BUILDING
//
// Manifest structure mirrors the controller tree:
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
//     type: string                      // 'repeat' | 'if' | 'with' | ...
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

/**
 * Build the hydration manifest from the root controller.
 * This is the main entry point for manifest generation.
 */
const buildHydrationManifest = (rootCtrl) => {
  const rootScope = buildScopeManifest(rootCtrl);
  return {
    root: rootCtrl.definition.name,
    manifest: rootScope,
  };
};

/**
 * Build a scope manifest for a CE or synthetic view.
 * Both CEs and synthetic views have the same structure - a `children` array
 * containing TCs and CEs in the same order as ctrl.children.
 *
 * This mirrors the controller tree exactly:
 * - ctrl.children contains both TCs and CEs
 * - We preserve that order in manifest.children
 */
const buildScopeManifest = (ctrl) => {
  const scope = {
    children: [],
  };

  // Add name for CE scopes (not for synthetic/view scopes)
  if (ctrl.vmKind === "customElement") {
    scope.name = ctrl.definition.name;
  }

  // Process children in order - they can be TCs (customAttribute) or CEs (customElement)
  const children = ctrl.children ?? [];
  for (const child of children) {
    if (child.vmKind === "customElement") {
      // Child CE - build its scope manifest
      const childScope = buildCEManifest(child);
      if (childScope) {
        scope.children.push(childScope);
      }
    } else if (child.vmKind === "customAttribute" && child.definition.isTemplateController) {
      // TC - build its entry with views
      const tcEntry = buildTCEntry(child);
      if (tcEntry) {
        scope.children.push(tcEntry);
      }
    }
    // Note: non-TC custom attributes don't affect manifest structure
  }

  return scope;
};

/**
 * Build manifest for a CE.
 * Returns null for special CEs we skip (au-compose, au-slot).
 */
const buildCEManifest = (ctrl) => {
  const name = ctrl.definition.name;

  // Skip special CEs - they render dynamically on the client
  if (name === "au-compose" || name === "au-slot") {
    return null;
  }

  return buildScopeManifest(ctrl);
};

/**
 * Build a TC entry with its type and rendered views.
 * Returns null for TCs we skip (else, portal, etc.).
 */
const buildTCEntry = (ctrl) => {
  const type = ctrl.definition.name;
  const vm = ctrl.viewModel;

  switch (type) {
    case "if": {
      // vm.view is the currently active view (could be if-branch OR else-branch)
      // vm.value tells us which branch: true = if-branch, false = else-branch
      // We record `value` so hydration knows which branch SSR rendered
      const view = vm.view;
      const views = [];
      if (view) {
        views.push(buildViewEntry(view));
      }
      // value: true means if-branch rendered, false means else-branch rendered
      return { type, value: vm.value, views };
    }

    case "else": {
      // else is linked to if - it doesn't have its own views
      // But we MUST include it to maintain children order alignment with ctrl.children
      // The hydration consumer will see this and know to skip it
      return { type: "else", views: [] };
    }

    case "repeat": {
      // vm.views is the array of rendered views (one per item)
      // Index in views array corresponds to item index
      const views = (vm.views ?? []).map(v => buildViewEntry(v));
      return { type, views };
    }

    case "with": {
      // with always has exactly one view (if the value is truthy)
      const view = vm.view;
      const views = [];
      if (view) {
        views.push(buildViewEntry(view));
      }
      return { type, views };
    }

    case "switch": {
      // TODO: switch is complex - it has special properties:
      // - vm.cases: array of case VIEW MODELS (not controllers)
      // - vm.defaultCase: default case VIEW MODEL
      // - vm.activeCases: currently active case VIEW MODELS
      // - vm.view: just the owning view, not the case views
      // To get controllers: vm.cases[i].$controller, vm.defaultCase.$controller, etc.
      // Note: case/default-case are NESTED inside switch, not siblings like else is to if
      return { type, views: [], todo: "switch support" };
    }

    case "promise": {
      // TODO: promise is complex - it has special properties:
      // - vm.pending: pending VIEW MODEL (not controller)
      // - vm.fulfilled: fulfilled VIEW MODEL
      // - vm.rejected: rejected VIEW MODEL
      // - vm.view: just the owning view
      // To get controllers: vm.pending.$controller, vm.fulfilled.$controller, etc.
      // Note: pending/fulfilled/rejected are NESTED inside promise, not siblings
      return { type, views: [], todo: "promise support" };
    }

    case "portal": {
      // Portal moves content to another DOM location - skip for SSR
      return null;
    }

    default: {
      // Unknown TC - skip
      return null;
    }
  }
};

/**
 * Build a view entry for a synthetic controller (TC's rendered view).
 * Each view has:
 * - nodeCount: number of top-level DOM nodes in this view
 * - scope: nested manifest for this view's contents (a view scope)
 */
const buildViewEntry = (ctrl) => {
  // Count top-level nodes in this view
  const nodeCount = countViewNodes(ctrl);

  // Build the scope for this view's contents (nested TCs and CEs)
  // This is a "view scope" - it won't have a name, only children
  const scope = buildScopeManifest(ctrl);

  return { nodeCount, scope };
};

/**
 * Count the top-level DOM nodes in a synthetic view.
 * This excludes the TC's own anchor/comment nodes.
 */
const countViewNodes = (ctrl) => {
  // ctrl.nodes is a FragmentNodeSequence
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
};

