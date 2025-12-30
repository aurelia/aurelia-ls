/**
 * Test for the tree-shaped manifest recorder
 *
 * This tests the approach: walk the controller tree AFTER render,
 * building a manifest that mirrors the controller tree structure.
 */

import { test, describe, expect } from "vitest";

import { JSDOM } from "jsdom";
import { DI, Registration, LoggerConfiguration, LogLevel, ConsoleSink } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";

// Functions from build package (local implementation)
import {
  recordManifest,
  debugControllerTree,
} from "@aurelia-ls/ssr";

// Types and type guards from runtime (needed for hydration)
import {
  isSSRTemplateController,
  isSSRScope,
} from "@aurelia/runtime-html";

// =============================================================================
// HELPER: Count TCs of a given type in the manifest tree
// =============================================================================

function countTCsOfType(scope, type) {
  let count = 0;
  for (const child of scope.children ?? []) {
    if (isSSRTemplateController(child)) {
      if (child.type === type) count++;
      // Views are scopes directly, not { scope: ISSRScope }
      for (const view of child.views ?? []) {
        count += countTCsOfType(view, type);
      }
    } else if (isSSRScope(child)) {
      // CE scope - recurse into it
      count += countTCsOfType(child, type);
    }
  }
  return count;
}

function countAllTCs(scope) {
  let count = 0;
  for (const child of scope.children ?? []) {
    if (isSSRTemplateController(child)) {
      count++;
      for (const view of child.views ?? []) {
        count += countAllTCs(view);
      }
    } else if (isSSRScope(child)) {
      count += countAllTCs(child);
    }
  }
  return count;
}

function countCEs(scope) {
  let count = 0;
  for (const child of scope.children ?? []) {
    if (isSSRTemplateController(child)) {
      for (const view of child.views ?? []) {
        count += countCEs(view);
      }
    } else if (isSSRScope(child)) {
      count++; // This is a CE
      count += countCEs(child); // Recurse
    }
  }
  return count;
}

// =============================================================================
// TESTS
// =============================================================================

describe("Tree-shaped Manifest Recorder", () => {
  test("builds tree-shaped manifest from controller tree", async () => {
    // Create fresh components inline
    const StatusBadge = CustomElement.define({
      name: 'status-badge-rec',
      template: '<span class="${statusClass}">${statusText}</span>',
      bindables: ['active'],
    }, class {
      active = false;
      get statusText() { return this.active ? 'Active' : 'Inactive'; }
      get statusClass() { return this.active ? 'status-active' : 'status-inactive'; }
    });

    const ItemCard = CustomElement.define({
      name: 'item-card-rec',
      template: `<div class="item-card">
        <span class="label">\${item.label}</span>
        <status-badge-rec if.bind="item.active" active.bind="true"></status-badge-rec>
        <status-badge-rec else active.bind="false"></status-badge-rec>
      </div>`,
      bindables: ['item'],
      dependencies: [StatusBadge],
    }, class {
      item = { label: 'Default', active: false };
    });

    const SectionPanel = CustomElement.define({
      name: 'section-panel-rec',
      template: `<div class="section-panel">
        <h2>\${section.name}</h2>
        <item-card-rec repeat.for="item of section.items" item.bind="item"></item-card-rec>
      </div>`,
      bindables: ['section'],
      dependencies: [ItemCard],
    }, class {
      section = { name: 'Default', items: [] };
    });

    const StressApp = CustomElement.define({
      name: 'stress-app-rec',
      template: `<div class="stress-app">
        <h1>\${title}</h1>
        <section-panel-rec repeat.for="section of sections" section.bind="section"></section-panel-rec>
      </div>`,
      dependencies: [SectionPanel],
    }, class {
      title = 'Stress Test';
      sections = [
        { name: 'Alpha', items: [{ label: 'A1', active: true }, { label: 'A2', active: false }] },
        { name: 'Beta', items: [{ label: 'B1', active: true }] },
      ];
    });

    const dom = new JSDOM('<!DOCTYPE html><html><body><stress-app-rec></stress-app-rec></body></html>', {
      pretendToBeVisual: true,
      runScripts: 'dangerously',
    });

    const window = dom.window;
    const document = window.document;
    const platform = new BrowserPlatform(window);

    const container = DI.createContainer();
    container.register(
      StandardConfiguration,
      Registration.instance(IPlatform, platform),
      LoggerConfiguration.create({ level: LogLevel.warn, sinks: [ConsoleSink] }),
    );

    const host = document.querySelector('stress-app-rec');
    const au = new Aurelia(container);

    await au.app({ host, component: StressApp }).start();

    // Get the root controller
    const rootController = CustomElement.for(host);

    // Verify controller tree exists and is navigable
    const treeDebug = debugControllerTree(rootController);
    expect(treeDebug).toContain("stress-app-rec");
    expect(treeDebug).toContain("section-panel-rec");
    expect(treeDebug).toContain("item-card-rec");
    expect(treeDebug).toContain("status-badge-rec");

    // Build manifest using new API (no host parameter needed)
    const manifest = recordManifest(rootController);

    // =======================================================================
    // ASSERTIONS
    // =======================================================================

    expect(manifest).toBeTruthy();
    expect(manifest.root).toBe("stress-app-rec");
    expect(manifest.manifest).toBeTruthy();
    expect(Array.isArray(manifest.manifest.children)).toBe(true);

    // Count TCs
    const repeatCount = countTCsOfType(manifest.manifest, "repeat");
    const ifCount = countTCsOfType(manifest.manifest, "if");
    const elseCount = countTCsOfType(manifest.manifest, "else");
    const totalTCs = countAllTCs(manifest.manifest);
    const ceCount = countCEs(manifest.manifest);

    // Verify TC counts exactly:
    // - 3 repeats: 1 outer (sections) + 2 inner (items per section)
    // - 3 ifs: one per item-card (A1, A2, B1)
    // - 3 elses: one per item-card (siblings to if)
    expect(repeatCount).toBe(3);
    expect(ifCount).toBe(3);
    expect(elseCount).toBe(3);
    expect(totalTCs).toBe(9);

    // Verify CE count - should have section panels, item cards, status badges
    // 2 section-panel-rec + 3 item-card-rec + 3 status-badge-rec = 8 CEs (excluding root)
    expect(ceCount).toBe(8);

    // Verify if values (which branch rendered)
    // A1: active=true → value=true
    // A2: active=false → value=false
    // B1: active=true → value=true
    function collectIfValues(scope) {
      const values = [];
      for (const child of scope.children ?? []) {
        if (isSSRTemplateController(child)) {
          if (child.type === "if" && child.state?.value !== undefined) {
            values.push(child.state.value);
          }
          for (const view of child.views ?? []) {
            values.push(...collectIfValues(view));
          }
        } else if (isSSRScope(child)) {
          values.push(...collectIfValues(child));
        }
      }
      return values;
    }

    const ifValues = collectIfValues(manifest.manifest);
    const trueCount = ifValues.filter(v => v === true).length;
    const falseCount = ifValues.filter(v => v === false).length;

    expect(trueCount).toBe(2);
    expect(falseCount).toBe(1);
    expect(ifValues.sort()).toEqual([false, true, true].sort());

    // Verify DOM wasn't duplicated
    const itemCards = document.querySelectorAll('.item-card');
    expect(itemCards.length).toBe(3);

    await au.stop();
    dom.window.close();
  });

  test("type guards work correctly", () => {
    const tcEntry = { type: "repeat", views: [] };
    const ceScope = { name: "my-ce", children: [] };
    const viewScope = { children: [] };

    expect(isSSRTemplateController(tcEntry)).toBe(true);
    expect(isSSRTemplateController(ceScope)).toBe(false);
    expect(isSSRTemplateController(viewScope)).toBe(false);

    expect(isSSRScope(ceScope)).toBe(true);
    expect(isSSRScope(viewScope)).toBe(true);
    expect(isSSRScope(tcEntry)).toBe(false);
  });
});
