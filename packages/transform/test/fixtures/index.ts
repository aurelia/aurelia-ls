/**
 * Transform Package - Test Fixtures Index
 *
 * Exports all fixture metadata for testing.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fixtures live in test/fixtures/ in the source tree, not in the output
// This resolves the correct path whether running from src or out
const fixturesDir = __dirname.includes("out")
  ? resolve(__dirname, "..", "..", "..", "test", "fixtures")
  : __dirname;

export interface FixtureInfo {
  name: string;
  file: string;
  className: string;
  resourceName: string;
  declarationForm: "decorator" | "decorator-config" | "static-au" | "convention";
  resourceType: "custom-element" | "custom-attribute";
  hasTemplate: boolean;
  description: string;
}

export const fixtures: FixtureInfo[] = [
  {
    name: "decorator-simple",
    file: "decorator-simple.ts",
    className: "MyElement",
    resourceName: "my-element",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Simple decorator with inline template",
  },
  {
    name: "decorator-name-only",
    file: "decorator-name-only.ts",
    className: "CounterElement",
    resourceName: "counter-element",
    declarationForm: "decorator",
    resourceType: "custom-element",
    hasTemplate: false,
    description: "Decorator with name string only",
  },
  {
    name: "decorator-config",
    file: "decorator-config.ts",
    className: "UserCard",
    resourceName: "user-card",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Decorator with full config object",
  },
  {
    name: "convention",
    file: "convention.ts",
    className: "NavBarCustomElement",
    resourceName: "nav-bar",
    declarationForm: "convention",
    resourceType: "custom-element",
    hasTemplate: false,
    description: "Convention-based naming (no decorator)",
  },
  {
    name: "static-au",
    file: "static-au.ts",
    className: "StatusBadge",
    resourceName: "status-badge",
    declarationForm: "static-au",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Existing static $au definition",
  },
  {
    name: "custom-attribute",
    file: "custom-attribute.ts",
    className: "Highlight",
    resourceName: "highlight",
    declarationForm: "decorator",
    resourceType: "custom-attribute",
    hasTemplate: false,
    description: "Custom attribute with decorator",
  },
  {
    name: "template-controllers",
    file: "template-controllers.ts",
    className: "TodoList",
    resourceName: "todo-list",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Template with if/repeat controllers",
  },
  {
    name: "binding-modes",
    file: "binding-modes.ts",
    className: "BindingDemo",
    resourceName: "binding-demo",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Various binding modes",
  },
  {
    name: "events-refs",
    file: "events-refs.ts",
    className: "InteractiveForm",
    resourceName: "interactive-form",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Event listeners and ref bindings",
  },
  {
    name: "child-components",
    file: "child-components.ts",
    className: "ParentComponent",
    resourceName: "parent-component",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Parent with child custom elements",
  },
  {
    name: "let-element",
    file: "let-element.ts",
    className: "ComputedValues",
    resourceName: "computed-values",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Let element for computed values",
  },
  {
    name: "interpolations",
    file: "interpolations.ts",
    className: "StyledCard",
    resourceName: "styled-card",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Interpolation bindings in various contexts",
  },
  {
    name: "default-export",
    file: "default-export.ts",
    className: "DefaultComponent",
    resourceName: "default-component",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Default export class",
  },
  {
    name: "export-variations",
    file: "export-variations.ts",
    className: "NamedExport",
    resourceName: "named-export",
    declarationForm: "decorator-config",
    resourceType: "custom-element",
    hasTemplate: true,
    description: "Different export forms (named, internal, later)",
  },
];

/**
 * Load fixture source code.
 */
export function loadFixture(name: string): string {
  const fixture = fixtures.find(f => f.name === name);
  if (!fixture) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return readFileSync(join(fixturesDir, fixture.file), "utf-8");
}

/**
 * Get fixture info by name.
 */
export function getFixture(name: string): FixtureInfo | undefined {
  return fixtures.find(f => f.name === name);
}
