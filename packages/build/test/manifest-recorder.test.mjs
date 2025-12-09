/**
 * Test for the tree-shaped manifest recorder
 *
 * This tests the approach: walk the controller tree AFTER render,
 * building a manifest that mirrors the controller tree structure.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { JSDOM } from "jsdom";
import { DI, Registration, LoggerConfiguration, LogLevel, ConsoleSink } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";

import {
  recordManifest,
  debugControllerTree,
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
      // Also count inside TC views
      for (const view of child.views ?? []) {
        count += countTCsOfType(view.scope, type);
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
        count += countAllTCs(view.scope);
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
        count += countCEs(view.scope);
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

    console.log("\n=== CONTROLLER TREE ===");
    console.log(debugControllerTree(rootController));

    // Build manifest using new API (no host parameter needed)
    const manifest = recordManifest(rootController);

    console.log("\n=== HYDRATION MANIFEST ===");
    console.log(JSON.stringify(manifest, null, 2));

    // =======================================================================
    // ASSERTIONS
    // =======================================================================

    assert.ok(manifest, "recordManifest should return a manifest");
    assert.equal(manifest.root, "stress-app-rec", "Root should be stress-app-rec");
    assert.ok(manifest.manifest, "Should have root scope manifest");
    assert.ok(Array.isArray(manifest.manifest.children), "Root scope should have children");

    // Count TCs
    const repeatCount = countTCsOfType(manifest.manifest, "repeat");
    const ifCount = countTCsOfType(manifest.manifest, "if");
    const elseCount = countTCsOfType(manifest.manifest, "else");
    const totalTCs = countAllTCs(manifest.manifest);
    const ceCount = countCEs(manifest.manifest);

    console.log("\n=== SUMMARY ===");
    console.log(`Total TCs: ${totalTCs}`);
    console.log(`  - repeat: ${repeatCount}`);
    console.log(`  - if: ${ifCount}`);
    console.log(`  - else: ${elseCount}`);
    console.log(`Total CEs (excluding root): ${ceCount}`);

    // We expect:
    // - 3 repeats: 1 outer (sections) + 2 inner (items per section)
    // - 3 ifs: one per item-card (A1, A2, B1)
    // - 3 elses: one per item-card (siblings to if)
    assert.equal(repeatCount, 3, "Should have 3 repeat TCs");
    assert.equal(ifCount, 3, "Should have 3 if TCs");
    assert.equal(elseCount, 3, "Should have 3 else TCs");

    // Verify if values (which branch rendered)
    // A1: active=true → value=true
    // A2: active=false → value=false
    // B1: active=true → value=true
    // We need to dig into the manifest to find the if entries
    function collectIfValues(scope) {
      const values = [];
      for (const child of scope.children ?? []) {
        if (isSSRTemplateController(child)) {
          if (child.type === "if" && child.value !== undefined) {
            values.push(child.value);
          }
          for (const view of child.views ?? []) {
            values.push(...collectIfValues(view.scope));
          }
        } else if (isSSRScope(child)) {
          values.push(...collectIfValues(child));
        }
      }
      return values;
    }

    const ifValues = collectIfValues(manifest.manifest);
    console.log(`If values (branch indicators): ${JSON.stringify(ifValues)}`);

    const trueCount = ifValues.filter(v => v === true).length;
    const falseCount = ifValues.filter(v => v === false).length;

    assert.equal(trueCount, 2, "Should have 2 if branches (A1, B1)");
    assert.equal(falseCount, 1, "Should have 1 else branch (A2)");

    // Verify DOM wasn't duplicated
    const itemCards = document.querySelectorAll('.item-card');
    assert.equal(itemCards.length, 3, "Should have 3 item-cards");

    await au.stop();
    dom.window.close();

    console.log("\n=== TEST PASSED ===\n");
  });

  test("type guards work correctly", () => {
    const tcEntry = { type: "repeat", views: [] };
    const ceScope = { name: "my-ce", children: [] };
    const viewScope = { children: [] };

    assert.ok(isSSRTemplateController(tcEntry), "Should identify TC entry");
    assert.ok(!isSSRTemplateController(ceScope), "Should not identify CE scope as TC");
    assert.ok(!isSSRTemplateController(viewScope), "Should not identify view scope as TC");

    assert.ok(isSSRScope(ceScope), "Should identify CE scope");
    assert.ok(isSSRScope(viewScope), "Should identify view scope");
    assert.ok(!isSSRScope(tcEntry), "Should not identify TC entry as scope");
  });
});
