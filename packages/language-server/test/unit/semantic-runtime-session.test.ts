import { afterEach, describe, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  InquiryContinuationKind,
  FrameworkRegistrationCapability,
  ManagedSemanticWorkspaceOperationReceipt,
  NodeSemanticRuntimeProjectInputHost,
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticAppQueryKind,
  SemanticRuntime,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticSourceWorldCurrentnessKind,
  semanticWorkspaceDescriptorForRuntimeOptions,
  type SemanticAnalysisLimitationsResult,
  type SemanticAuthoredSourceOwnershipResult,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimeSummary,
  type SemanticTemplateResourceAvailabilityRow,
  type SemanticWorkspaceDescriptor,
} from "@aurelia-ls/semantic-runtime";
import {
  EXTENSION_HOST_OBSERVATION_ENVIRONMENT,
  loadExtensionHostTestSemanticWorkspaceDescriptor,
  MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES,
  RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT,
  RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT,
} from "../../src/runtime/extension-host-test-topology.js";
import {
  checkpointSemanticRuntimeLspOperation,
  SemanticRuntimeLspRequestAbortedError,
  SemanticRuntimeLspReentrantLifecycleError,
  SemanticRuntimeLspSession,
  drainSemanticRuntimePages,
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspGeneration,
  type SemanticRuntimeLspOperation,
} from "../../src/runtime/semantic-runtime-session.js";
import {
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentListener,
  type OpenTextDocumentStore,
} from "../../src/runtime/open-document-source-text-overlay.js";
import { mapTemplateResourceAvailabilityItem } from "../../src/mapping/resource-discovery.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const temporaryWorkspaceRoots: string[] = [];

const OVERLAP_BASE_RESOURCE_IDENTITY_KEYS = [
  "framework-resource:v1:ao3wTTlYz7gkydrxZPeA8g",
  "framework-resource:v1:XFZvawNY8tSHKfMrkPYlVR",
  "framework-resource:v1:JmEwA1AmCPgbpnvMLPw58D",
  "framework-resource:v1:RALZMjfBSmX4ddzovn5609",
  "framework-resource:v1:UL6PxX66V_s24aIUucaLCa",
  "framework-resource:v1:DwQXc67bKMgBxSqvewUPt7",
  "framework-resource:v1:5Cw0YndFzEBfg1QqTZ3THf",
  "framework-resource:v1:eKzi7MC8mjUYcxn3I_l2QF",
  "framework-resource:v1:vHWQn-abkAkcdMFER7dheM",
  "framework-resource:v1:MbyOB0rd7zRpAU1zntucZZ",
  "framework-resource:v1:12x4HoZx9h_bPJr4W8YG7k",
  "framework-resource:v1:mAcTTtBp28SDAMHflblLj8",
  "framework-resource:v1:D_YoVx1_tZjK_HsBt6baFQ",
  "framework-resource:v1:rPJTn6pYcjOQz7CXSVpuKX",
  "framework-resource:v1:yvoliOYVJchBwlnUvNp1aD",
  "framework-resource:v1:_g9f2vA2KLEKUxsOwmKiES",
  "framework-resource:v1:4IB3hhpkPsBLdXPWhYVTYa",
  "framework-resource:v1:jFAQaLC0jv5WKRUG0VbxXT",
  "framework-resource:v1:R_Xe8kqyXWDMIrY8BVI6IK",
  "framework-resource:v1:4wil6_SwjRTRbF2z3xrkna",
  "framework-resource:v1:6C6s6QIhanOjNwqYdwlihR",
  "framework-resource:v1:A06kH3i292JXWo0jcEDbjL",
  "framework-resource:v1:QM8wgkWsK5FwRJzQ1PtXju",
  "framework-resource:v1:0De9lC7RwXvUG4SG4zs2i9",
  "framework-resource:v1:Ou0ahKqK7IJu4ET65i4CiB",
  "framework-resource:v1:K4dO4eL0tOG7gaAHMXbADm",
  "framework-resource:v1:UFcH3lWbZSCC8WaY_-LROr",
] as const;

const OVERLAP_I18N_RESOURCE_IDENTITY_KEYS = [
  "framework-resource:v1:GmDIWXEaclFXDfPZCc5TTZ",
  "framework-resource:v1:q62Q2pjVSKinxBFgCjCl5s",
  "framework-resource:v1:vfuHn1iT2Tv8E05WAiRfz9",
  "framework-resource:v1:aHxO4elfWRr5A7wif0kkIE",
  "framework-resource:v1:nIsAFXiPczseixTncQhn66",
  "framework-resource:v1:nZJdZSlr_4dcfHiC5Te-q8",
  "framework-resource:v1:wLF9HAV7CnLAGIlNstI5lU",
  "framework-resource:v1:yGFE27i0AA4ZP_MkERXG5F",
] as const;

const LONG_SUFFIX_BASELINE_AVAILABILITY_ROWS = [
  availabilityStateFact("typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA", "local"),
  ...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS.map((identityKey) =>
    availabilityStateFact(identityKey, "local")),
] as const;

const LONG_SUFFIX_RIGHT_ONLY_AVAILABILITY_ROWS = [
  availabilityStateFact("typescript-resource:v1:azpBidTgEqjH8hleJeG8v2", "local"),
  ...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS.map((identityKey) =>
    availabilityStateFact(identityKey, "local")),
] as const;

const LONG_SUFFIX_AFTER_REMOVAL_AVAILABILITY_ROWS = [
  ...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS.map((identityKey) =>
    availabilityStateFact(identityKey, "local")),
  availabilityStateFact("typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA", "local"),
] as const;

const LONG_SUFFIX_AVAILABILITY_NAVIGATION_FACTS = {
  rowCount: 28,
  selectableRowCount: 1,
  navigationUnavailableIdentityKeys: OVERLAP_BASE_RESOURCE_IDENTITY_KEYS,
  navigationUnavailable: OVERLAP_BASE_RESOURCE_IDENTITY_KEYS.map((identityKey) => ({
    identityKey,
    reason: "external-catalog",
  })),
} as const;

function availabilityStateFact(identityKey: string, visibilityKind: string): unknown {
  return { identityKey, state: "available", visibilityKind };
}

function mappedAvailabilityNavigationFacts(
  rows: readonly SemanticTemplateResourceAvailabilityRow[],
  workspaceRoot: string,
) {
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(workspaceRoot).toString());
  const mappedRows = rows.map((row) => mapTemplateResourceAvailabilityItem(row, {
    documentUris,
    lookupText: (uri: string): string | null => {
      const hostPath = documentUris.hostPath(uri);
      if (hostPath == null) return null;
      try {
        return fs.readFileSync(hostPath, "utf8");
      } catch {
        return null;
      }
    },
  }));
  const unavailable = mappedRows
    .filter((row) => row.resource.navigation.state === "unavailable")
    .map((row) => ({
      identityKey: row.resource.identityKey,
      reason: row.resource.navigation.state === "unavailable"
        ? row.resource.navigation.reason
        : null,
    }));
  return {
    rowCount: mappedRows.length,
    selectableRowCount: mappedRows.length - unavailable.length,
    navigationUnavailableIdentityKeys: unavailable.map((row) => row.identityKey),
    navigationUnavailable: unavailable,
  };
}

const OVERLAP_PREFLIGHT_EXPECTATION = [
  overlapProjectExpectation(
    "host-alpha",
    "template-source:v1:ydeLXlnc_mBAQZBxX7Utun",
    [
      ["template-resource-scope:v1:kQWeKrSZ95gLvmXbZfgHGV", true],
      ["template-resource-scope:v1:sYGd8lgb0DmojJtGcGvScL", false],
    ],
  ),
  overlapProjectExpectation(
    "host-beta",
    "template-source:v1:aXAp9VL3Etbnnw5m7uZlUx",
    [
      ["template-resource-scope:v1:DyenXVI3F4LdZsCEbczI_4", false],
      ["template-resource-scope:v1:yNEIWOdR2n--gCE9MlTL-T", true],
    ],
  ),
] as const;

function overlapProjectExpectation(
  projectKey: string,
  templateIdentityKey: string,
  scopes: readonly (readonly [scopeIdentityKey: string, includesI18n: boolean])[],
): unknown {
  return {
    projectKey,
    candidates: scopes.map(([scopeIdentityKey]) => ({
      templateIdentityKey,
      scopeIdentityKey,
      definitionName: "shared-plugin-app",
      compilationLane: "app-runtime",
      source: {
        path: "host-corpus/overlap/src/shared-plugin-app.html",
        start: 0,
        end: 52,
      },
    })),
    selected: scopes.map(([scopeIdentityKey, includesI18n]) => ({
      selection: "exact",
      scopeIdentityKey,
      resourceIdentityKeys: includesI18n
        ? [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS, ...OVERLAP_I18N_RESOURCE_IDENTITY_KEYS]
        : [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS],
      rowCount: includesI18n ? 35 : 27,
      selectableRowCount: 0,
      navigationUnavailableIdentityKeys: includesI18n
        ? [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS, ...OVERLAP_I18N_RESOURCE_IDENTITY_KEYS]
        : [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS],
      navigationUnavailable: (includesI18n
        ? [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS, ...OVERLAP_I18N_RESOURCE_IDENTITY_KEYS]
        : [...OVERLAP_BASE_RESOURCE_IDENTITY_KEYS]).map((identityKey) => ({
          identityKey,
          reason: "external-catalog",
        })),
    })),
  };
}

const COMPOSITE_INVENTORY_WITNESS_FACTS = {
  pageDrain: [
    {
      identityKey: "typescript-resource:v1:uUlPN8dTsbnF50cz40Wrk9",
      kind: "custom-element",
      name: "page-drain-000",
      path: "host-corpus/page-drain/src/main.ts",
      start: 75,
      end: 89,
    },
    {
      identityKey: "typescript-resource:v1:PRF4xWb1OJ6VM7Xdd8ywya",
      kind: "custom-element",
      name: "page-drain-500",
      path: "host-corpus/page-drain/src/main.ts",
      start: 65075,
      end: 65089,
    },
  ],
  longSuffixDuplicates: [
    {
      identityKey: "typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA",
      kind: "custom-element",
      name: "duplicate-card",
      path: "host-corpus/long-scent/left/shared/duplicate-card.ts",
      start: 68,
      end: 82,
    },
    {
      identityKey: "typescript-resource:v1:azpBidTgEqjH8hleJeG8v2",
      kind: "custom-element",
      name: "duplicate-card",
      path: "host-corpus/long-scent/right/shared/duplicate-card.ts",
      start: 68,
      end: 82,
    },
  ],
  localTemplates: [
    localTemplateFact(
      "local-template-resource:v1:O7K0fKSFZ2Hd3gEeu4g8CY",
      "local-chip",
      "typescript-resource:v1:wZ7Erzdq3JePDEWb3Nz_cm",
      "local-templates-app",
      "host-corpus/local-templates/src/local-templates-app.html",
      42,
      52,
      [bindableFact("resource-bindable:v1:Vi1cqgkjAl0QiCZaWRvahT", "label", "public-label")],
    ),
    localTemplateFact(
      "local-template-resource:v1:Tl4PBXWFHMiN0xwd3vfb-D",
      "local-icon",
      "typescript-resource:v1:wZ7Erzdq3JePDEWb3Nz_cm",
      "local-templates-app",
      "host-corpus/local-templates/src/local-templates-app.html",
      283,
      293,
      [bindableFact("resource-bindable:v1:blJbJ47pWS59m3Vod0O9Bt", "value", "value")],
    ),
    localTemplateFact(
      "local-template-resource:v1:_IC3Pmgr7hV-73x_50Ba75",
      "outer-local",
      "typescript-resource:v1:wZ7Erzdq3JePDEWb3Nz_cm",
      "local-templates-app",
      "host-corpus/local-templates/src/local-templates-app.html",
      407,
      418,
      [bindableFact("resource-bindable:v1:tnVPX7y-4wfvwqD11cVfAw", "outerValue", "outer-value")],
    ),
    localTemplateFact(
      "local-template-resource:v1:3hu-DkXwQr8JukFX6twbbV",
      "nested-local",
      "typescript-resource:v1:wZ7Erzdq3JePDEWb3Nz_cm",
      "local-templates-app",
      "host-corpus/local-templates/src/local-templates-app.html",
      522,
      534,
      [bindableFact("resource-bindable:v1:4bI3pL_4XWn24PNh4BDZ1P", "nestedValue", "nested-value")],
    ),
    localTemplateFact(
      "local-template-resource:v1:9KfnkpHjb7m0Atj1q3KaU-",
      "local-chip",
      "typescript-resource:v1:I57WkBJEJI_rwx6Ki_swuP",
      "secondary-host",
      "host-corpus/local-templates/src/secondary-host.html",
      42,
      52,
      [bindableFact("resource-bindable:v1:ic87mmz7Hwvq725b81Lza6", "secondaryLabel", "secondary-label")],
    ),
  ],
  sameKindDuplicates: [
    definitionFact("typescript-resource:v1:zE-xXYphvL7Qdfqpv_K0--", "binding-behavior", "duplicateTrack", 959, 973),
    definitionFact("typescript-resource:v1:z6sa6iUKKQXYmDbslaD0Wm", "binding-behavior", "duplicateTrack", 1084, 1098),
    definitionFact("typescript-resource:v1:1wQOYrWXyvikcOAp4VSl8t", "custom-attribute", "duplicate-flag", 489, 503),
    definitionFact("typescript-resource:v1:BuMoqRu6hwl5eYQMHNUG9y", "custom-attribute", "duplicate-flag", 573, 587),
    definitionFact("typescript-resource:v1:eKfiwZYbF4NKP8SjrmBMgZ", "custom-element", "duplicate-card", 231, 245),
    definitionFact("typescript-resource:v1:YiwXspGB0cx_KSGavwll0Y", "custom-element", "duplicate-card", 364, 378),
    definitionFact("typescript-resource:v1:JEDJ_gZpqPafx0l4u09HwH", "value-converter", "duplicateFormat", 656, 671),
    definitionFact("typescript-resource:v1:cDD_axH87ix99NCyXrJ1yl", "value-converter", "duplicateFormat", 807, 822),
  ],
  aliasCollisions: [
    aliasFact(
      "typescript-resource:v1:dd1_tUIy4fVH8eDb3WYCzm",
      "alias-after-primary",
      "alias-primary",
      "resource-alias:v1:KmrBqAi1dc7nqIpzatGRP7",
      2323,
      2336,
    ),
    aliasFact(
      "typescript-resource:v1:6ZkGur6DuiTIuSKdUp8cmv",
      "alias-before-primary",
      "primary-after-alias",
      "resource-alias:v1:6rgKkGJjMOYiPQkxZH06f7",
      2470,
      2489,
    ),
    aliasFact(
      "typescript-resource:v1:97e80_ZvGyfA2RwSM4nFAv",
      "alias-owner-one",
      "shared-card-alias",
      "resource-alias:v1:qUUmtnt3JJNHCHRMcfGfH-",
      1927,
      1944,
    ),
    aliasFact(
      "typescript-resource:v1:62nl1tO598tO53ebhz9c6S",
      "alias-owner-two",
      "shared-card-alias",
      "resource-alias:v1:ZbUyP6Ip21bugLJvIqPCaI",
      2068,
      2085,
    ),
  ],
  crossKindCollisions: [
    effectiveDefinitionFact("typescript-resource:v1:zxNXJTXXb94kmSL0n7oeEk", "binding-behavior", "shared", 3433, 3439),
    effectiveDefinitionFact("typescript-resource:v1:RA01Hcju_jOxurmNFarRD7", "custom-attribute", "shared", 3105, 3111),
    effectiveDefinitionFact("typescript-resource:v1:ikUz5nEJEvfZ5s6UuZMJRo", "custom-attribute", "shared-control", 4308, 4322),
    effectiveDefinitionFact("typescript-resource:v1:oy3vnsXEaD9yGV3XQEerfz", "custom-element", "shared", 2938, 2944),
    effectiveDefinitionFact("typescript-resource:v1:BFHTJc5v2jUeyhHUOVVg4W", "template-controller", "shared-control", 4213, 4227),
    effectiveDefinitionFact("typescript-resource:v1:B7Z3_wTmWy4_QDh-CAFwjK", "value-converter", "shared", 3302, 3308),
  ],
  pathlessFramework: {
    identityKey: "framework-resource:v1:12x4HoZx9h_bPJr4W8YG7k",
    kind: "template-controller",
    name: "repeat",
    originKind: "framework",
    packageName: "@aurelia/runtime-html",
    publicName: null,
    navigationRole: null,
    navigationUnavailableReason: "external-catalog",
  },
  packageOrigins: [
    {
      identityKey: "typescript-resource:v1:zCJQhkzFyTXAsII48F_LH-",
      name: "installed-package-card",
      originKind: "package",
      packageName: "@acme/installed-resource-kit",
      moduleKey: "host-corpus/package-origin/app/node_modules/@acme/installed-resource-kit/src/index.ts",
      path: "host-corpus/package-origin/app/node_modules/@acme/installed-resource-kit/src/index.ts",
      start: 80,
      end: 102,
      implementationStart: 169,
      implementationEnd: 189,
      navigationRole: "public-name",
    },
    {
      identityKey: "typescript-resource:v1:kJLaQlJhqTVZD5c1jQ97qA",
      name: "linked-package-card",
      originKind: "package",
      packageName: "@acme/linked-resource-kit",
      moduleKey: ".host-packages/linked-resource-kit/src/index.ts",
      path: ".host-packages/linked-resource-kit/src/index.ts",
      start: 80,
      end: 99,
      implementationStart: 163,
      implementationEnd: 180,
      navigationRole: "public-name",
    },
    {
      identityKey: "typescript-resource:v1:DR3pJed-AmNocL1iZ8ANmU",
      name: "package-origin-app",
      originKind: "project",
      packageName: null,
      moduleKey: "host-corpus/package-origin/app/src/main.ts",
      path: "host-corpus/package-origin/app/src/main.ts",
      start: 246,
      end: 264,
      implementationStart: 450,
      implementationEnd: 466,
      navigationRole: "public-name",
    },
  ],
} as const;

const HEADER_ONLY_WITNESS_FACTS = [
  headerOnlyFact(
    "typescript-resource:v1:i7-VvGHSPotbtQ-jgX_9VC",
    "binding-behavior",
    "static-behavior-shadowed",
    1503,
    1760,
    1565,
    1583,
  ),
  headerOnlyFact(
    "typescript-resource:v1:Ec31eGjVJEy7YXP2cPhGtj",
    "custom-attribute",
    "static-attribute-shadowed",
    1280,
    1501,
    1343,
    1362,
  ),
  headerOnlyFact(
    "typescript-resource:v1:cXIDhg1414VCstqWtz5L3B",
    "custom-element",
    "decorator-shadowed",
    1086,
    1158,
    1136,
    1155,
  ),
  headerOnlyFact(
    "typescript-resource:v1:lJiv--wprPODzHgreMXFy8",
    "custom-element",
    "static-shadowed",
    844,
    1084,
    895,
    914,
  ),
  headerOnlyFact(
    "typescript-resource:v1:X3_c5PhV53YQaNT_Nl4hy1",
    "value-converter",
    "decorator-converter-shadowed",
    1762,
    1920,
    1823,
    1851,
  ),
] as const;

function headerOnlyFact(
  identityKey: string,
  kind: string,
  name: string,
  declarationStart: number,
  declarationEnd: number,
  implementationStart: number,
  implementationEnd: number,
): unknown {
  const implementation = {
    path: "host-corpus/effective-definitions/src/resources.ts",
    start: implementationStart,
    end: implementationEnd,
  };
  return {
    identityKey,
    projectKey: "host-alpha",
    kind,
    name,
    metadataState: "header-only",
    originKind: "project",
    publicName: null,
    declaration: {
      path: "host-corpus/effective-definitions/src/resources.ts",
      start: declarationStart,
      end: declarationEnd,
    },
    implementation,
    navigation: implementation,
    navigationRole: "implementation",
    navigationUnavailableReason: null,
  };
}

function metadataStateWitnessFacts(
  rows: SemanticResourceInventoryResult["rows"],
): unknown {
  const source = (value: SemanticResourceInventoryResult["rows"][number]["sources"]["declaration"]) => (
    value == null ? null : { path: value.path, start: value.start, end: value.end }
  );
  return rows
    .filter((row) => row.metadataState !== "full-definition")
    .map((row) => ({
      identityKey: row.identityKey,
      projectKey: row.projectKey,
      kind: row.resourceKind,
      name: row.name,
      metadataState: row.metadataState,
      originKind: row.origin.kind,
      publicName: source(row.sources.publicName),
      declaration: source(row.sources.declaration),
      implementation: source(row.sources.implementation),
      navigation: source(row.sources.navigation),
      navigationRole: row.sources.navigationRole,
      navigationUnavailableReason: row.sources.navigationUnavailableReason,
    }));
}

function bindableFact(identityKey: string, name: string, attribute: string): unknown {
  return { identityKey, name, attribute };
}

function localTemplateFact(
  identityKey: string,
  name: string,
  ownerIdentityKey: string,
  ownerName: string,
  path: string,
  start: number,
  end: number,
  bindables: readonly unknown[],
): unknown {
  return { identityKey, name, ownerIdentityKey, ownerName, path, start, end, bindables };
}

function definitionFact(
  identityKey: string,
  kind: string,
  name: string,
  start: number,
  end: number,
): unknown {
  return {
    identityKey,
    kind,
    name,
    path: "host-corpus/duplicates/src/resources.ts",
    start,
    end,
  };
}

function effectiveDefinitionFact(
  identityKey: string,
  kind: string,
  name: string,
  start: number,
  end: number,
): unknown {
  return {
    identityKey,
    kind,
    name,
    path: "host-corpus/effective-definitions/src/resources.ts",
    start,
    end,
  };
}

function aliasFact(
  resourceIdentityKey: string,
  resourceName: string,
  aliasName: string,
  aliasIdentityKey: string,
  start: number,
  end: number,
): unknown {
  return {
    resourceIdentityKey,
    resourceName,
    aliasName,
    aliasIdentityKey,
    path: "host-corpus/duplicates/src/resources.ts",
    start,
    end,
  };
}

function duplicateInventoryIdentityFacts(
  rows: SemanticResourceInventoryResult["rows"],
): readonly unknown[] {
  const byIdentity = new Map<string, SemanticResourceInventoryResult["rows"][number][]>();
  for (const row of rows) {
    const group = byIdentity.get(row.identityKey) ?? [];
    group.push(row);
    byIdentity.set(row.identityKey, group);
  }
  return [...byIdentity]
    .filter(([, group]) => group.length > 1)
    .map(([identityKey, group]) => ({
      identityKey,
      rows: group.map((row) => ({
        kind: row.resourceKind,
        name: row.name,
        metadataState: row.metadataState,
        moduleKey: row.origin.moduleKey,
      })),
    }));
}

function inventoryWitnessFacts(
  rows: SemanticResourceInventoryResult["rows"],
): unknown {
  const byDefinition = (
    left: SemanticResourceInventoryResult["rows"][number],
    right: SemanticResourceInventoryResult["rows"][number],
  ): number => {
    const leftSource = left.sources.publicName;
    const rightSource = right.sources.publicName;
    const leftKey = `${left.resourceKind}\0${left.name}\0${leftSource?.path ?? ""}`;
    const rightKey = `${right.resourceKind}\0${right.name}\0${rightSource?.path ?? ""}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : (leftSource?.start ?? -1) - (rightSource?.start ?? -1);
  };
  const sourceFact = (row: SemanticResourceInventoryResult["rows"][number]) => ({
    identityKey: row.identityKey,
    kind: row.resourceKind,
    name: row.name,
    path: row.sources.publicName?.path,
    start: row.sources.publicName?.start,
    end: row.sources.publicName?.end,
  });
  const localTemplates = rows
    .filter((row) => row.locality.kind === "local-template")
    .sort((left, right) => {
      const leftPath = left.sources.publicName?.path ?? "";
      const rightPath = right.sources.publicName?.path ?? "";
      return leftPath < rightPath ? -1 : leftPath > rightPath
        ? 1
        : (left.sources.publicName?.start ?? -1) - (right.sources.publicName?.start ?? -1);
    })
    .map((row) => ({
      identityKey: row.identityKey,
      name: row.name,
      ownerIdentityKey: row.locality.ownerIdentityKey,
      ownerName: row.locality.ownerName,
      path: row.sources.publicName?.path,
      start: row.sources.publicName?.start,
      end: row.sources.publicName?.end,
      bindables: row.bindables.map((bindable) => ({
        identityKey: bindable.identityKey,
        name: bindable.name,
        attribute: bindable.attribute,
      })),
    }));
  const duplicateNames = new Set(["duplicate-card", "duplicate-flag", "duplicateFormat", "duplicateTrack"]);
  const aliases = rows
    .filter((row) => row.origin.moduleKey === "host-corpus/duplicates/src/resources.ts")
    .flatMap((row) => row.aliases
      .filter((alias) => ["alias-primary", "primary-after-alias", "shared-card-alias"].includes(alias.name))
      .map((alias) => ({
        resourceIdentityKey: row.identityKey,
        resourceName: row.name,
        aliasName: alias.name,
        aliasIdentityKey: alias.identityKey,
        path: alias.source.path,
        start: alias.source.start,
        end: alias.source.end,
      })))
    .sort((left, right) => left.resourceName.localeCompare(right.resourceName));
  const pathless = rows.find((row) => row.resourceKind === "template-controller" && row.name === "repeat");
  const packageOriginNames = new Set([
    "installed-package-card",
    "linked-package-card",
    "package-origin-app",
  ]);
  return {
    pageDrain: rows
      .filter((row) => row.name === "page-drain-000" || row.name === "page-drain-500")
      .sort(byDefinition)
      .map(sourceFact),
    longSuffixDuplicates: rows
      .filter((row) => row.name === "duplicate-card"
        && row.origin.moduleKey?.startsWith("host-corpus/long-scent/") === true)
      .sort(byDefinition)
      .map(sourceFact),
    localTemplates,
    sameKindDuplicates: rows
      .filter((row) => row.origin.moduleKey === "host-corpus/duplicates/src/resources.ts" && duplicateNames.has(row.name))
      .sort(byDefinition)
      .map(sourceFact),
    aliasCollisions: aliases,
    crossKindCollisions: rows
      .filter((row) => row.origin.moduleKey === "host-corpus/effective-definitions/src/resources.ts"
        && (row.name === "shared" || row.name === "shared-control"))
      .sort(byDefinition)
      .map(sourceFact),
    pathlessFramework: pathless == null ? null : {
      identityKey: pathless.identityKey,
      kind: pathless.resourceKind,
      name: pathless.name,
      originKind: pathless.origin.kind,
      packageName: pathless.origin.packageName,
      publicName: pathless.sources.publicName,
      navigationRole: pathless.sources.navigationRole,
      navigationUnavailableReason: pathless.sources.navigationUnavailableReason,
    },
    packageOrigins: rows
      .filter((row) => packageOriginNames.has(row.name))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((row) => ({
        identityKey: row.identityKey,
        name: row.name,
        originKind: row.origin.kind,
        packageName: row.origin.packageName,
        moduleKey: row.origin.moduleKey,
        path: row.sources.publicName?.path,
        start: row.sources.publicName?.start,
        end: row.sources.publicName?.end,
        implementationStart: row.sources.implementation != null && "start" in row.sources.implementation
          ? row.sources.implementation.start
          : null,
        implementationEnd: row.sources.implementation != null && "end" in row.sources.implementation
          ? row.sources.implementation.end
          : null,
        navigationRole: row.sources.navigationRole,
      })),
  };
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(temporaryWorkspaceRoots.splice(0).map((root) =>
    fs.promises.rm(root, { force: true, recursive: true })));
});

class TestDocumentStore implements OpenTextDocumentStore {
  private readonly documents = new Map<string, TextDocument>();
  private readonly openListeners: OpenTextDocumentListener[] = [];
  private readonly changeListeners: OpenTextDocumentListener[] = [];
  private readonly closeListeners: OpenTextDocumentListener[] = [];

  add(document: TextDocument): void {
    const wasOpen = this.documents.has(document.uri);
    this.documents.set(document.uri, document);
    if (!wasOpen) {
      for (const listener of this.openListeners) listener({ document });
    }
    for (const listener of this.changeListeners) listener({ document });
  }

  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  all(): TextDocument[] {
    return [...this.documents.values()];
  }

  onDidOpen(listener: OpenTextDocumentListener): void {
    this.openListeners.push(listener);
  }

  onDidChangeContent(listener: OpenTextDocumentListener): void {
    this.changeListeners.push(listener);
  }

  onDidClose(listener: OpenTextDocumentListener): void {
    this.closeListeners.push(listener);
  }
}

describe("SemanticRuntimeLspSession", () => {
  test("projects generation and retention counters without opening semantic analysis", async () => {
    const workspaceRoot = minimalFixtureRoot();
    const session = createSession(workspaceRoot, new TestDocumentStore());

    expect(session.supportState()).toEqual({
      workspaceConfigured: true,
      workspaceGeneration: 0,
      requestEpoch: 0,
      diagnosticCacheEntries: 0,
      retiringWorkspaceCount: 0,
      retirementFailureCount: 0,
      closing: false,
      disposalStarted: false,
    });
    expect(session.detachedAnalysisCacheOverview({ cachedAppLimit: 1 })).toBeNull();

    await session.runRequest(null, (operation) => operation.workspaceSummary());
    expect(session.detachedAnalysisCacheOverview({ cachedAppLimit: 1 })).toMatchObject({
      cachedAppCount: 0,
      cachedApps: [],
    });

    const entered = deferred<void>();
    const release = deferred<void>();
    const active = session.runRequest(null, async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    expect(session.detachedAnalysisCacheOverview({ cachedAppLimit: 1 })).toBeNull();
    release.resolve();
    await active;
    expect(session.detachedAnalysisCacheOverview({ cachedAppLimit: 1 })).toMatchObject({
      cachedAppCount: 0,
    });

    session.recordSourceTextChanged([path.join(workspaceRoot, "src", "app.html")]);
    expect(session.supportState()).toMatchObject({ requestEpoch: 1, workspaceGeneration: 0 });
    const disposal = session.dispose();
    expect(session.supportState()).toMatchObject({ closing: true, disposalStarted: true });
    await disposal;
  });

  test("keeps the host-acceptance topology inert unless both exact gates are present", () => {
    const environment = {
      [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: "not-an-absolute-descriptor",
    };

    expect(loadExtensionHostTestSemanticWorkspaceDescriptor("C:\\ordinary", environment)).toBeNull();
    expect(loadExtensionHostTestSemanticWorkspaceDescriptor("C:\\ordinary", {
      ...environment,
      [EXTENSION_HOST_OBSERVATION_ENVIRONMENT]: "1",
    })).toBeNull();
    expect(loadExtensionHostTestSemanticWorkspaceDescriptor("C:\\ordinary", {
      ...environment,
      [RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT]: "1",
    })).toBeNull();
    expect(loadExtensionHostTestSemanticWorkspaceDescriptor("C:\\ordinary", {
      ...environment,
      [EXTENSION_HOST_OBSERVATION_ENVIRONMENT]: "true",
      [RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT]: "1",
    })).toBeNull();
  });

  test("loads only a bounded explicit descriptor for its exact contained workspace root", () => {
    const topology = createAcceptanceTopologyWorkspace();
    const environment = acceptanceTopologyEnvironment(topology.descriptorPath);

    expect(loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toEqual(topology.descriptor);
    expect(loadExtensionHostTestSemanticWorkspaceDescriptor(path.dirname(topology.workspaceRoot), environment))
      .toBeNull();

    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, {
      ...environment,
      [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: "relative-descriptor.json",
    })).toThrow(/descriptor path must be absolute/u);

    const directoryPath = path.join(topology.workspaceRoot, "descriptor-directory");
    fs.mkdirSync(directoryPath);
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, {
      ...environment,
      [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: directoryPath,
    })).toThrow(/must be a regular file/u);

    const oversizedPath = path.join(topology.workspaceRoot, "oversized-descriptor.json");
    fs.writeFileSync(oversizedPath, " ".repeat(MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES + 1), "utf8");
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, {
      ...environment,
      [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: oversizedPath,
    })).toThrow(/must contain 1 to/u);
  });

  test("fails closed for malformed or escaping gated topology", () => {
    const topology = createAcceptanceTopologyWorkspace();
    const environment = acceptanceTopologyEnvironment(topology.descriptorPath);
    fs.writeFileSync(topology.descriptorPath, JSON.stringify({
      ...topology.descriptor,
      unknown: true,
    }), "utf8");
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toThrow(/semantic workspace descriptor is invalid/u);

    const escapingDescriptor = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: topology.workspaceRoot,
      projects: [{
        rootDir: path.dirname(topology.workspaceRoot),
        projectKey: "escaping-project",
        sourceFiles: [],
      }],
    });
    writeAcceptanceDescriptor(topology.descriptorPath, escapingDescriptor);
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toThrow(/project 'escaping-project' root must remain inside/u);

    const outsideDescriptorRoot = fs.mkdtempSync(path.join(
      path.dirname(topology.workspaceRoot),
      ".resource-discovery-host-outside-descriptor-",
    ));
    temporaryWorkspaceRoots.push(outsideDescriptorRoot);
    const outsideDescriptorPath = path.join(outsideDescriptorRoot, "semantic-workspace.json");
    fs.writeFileSync(outsideDescriptorPath, JSON.stringify(topology.descriptor), {
      encoding: "utf8",
      flag: "wx",
    });
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, {
      ...environment,
      [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: outsideDescriptorPath,
    })).toThrow(/descriptor path must remain inside/u);
    const semanticRuntimePackageRoot = path.dirname(topology.workspaceRoot);
    const outsideProjectRoot = fs.mkdtempSync(path.join(
      semanticRuntimePackageRoot,
      ".resource-discovery-host-outside-",
    ));
    temporaryWorkspaceRoots.push(outsideProjectRoot);
    const outsideSource = path.join(outsideProjectRoot, "main.ts");
    fs.writeFileSync(outsideSource, "export const escaped = true;\n", "utf8");
    const escapedJunction = path.join(topology.workspaceRoot, "escaped-project");
    fs.symlinkSync(outsideProjectRoot, escapedJunction, "junction");
    const symlinkEscape = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: topology.workspaceRoot,
      projects: [{
        rootDir: escapedJunction,
        projectKey: "symlink-escape",
        sourceFiles: [{ path: path.join(escapedJunction, "main.ts") }],
      }],
    });
    writeAcceptanceDescriptor(topology.descriptorPath, symlinkEscape);
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toThrow(/real project 'symlink-escape' root must remain inside/u);

    fs.rmSync(escapedJunction, { force: true });
    const escapedSourceRoot = path.join(topology.overlapRoot, "escaped-source");
    fs.symlinkSync(outsideProjectRoot, escapedSourceRoot, "junction");
    const suppliedSourceEscape = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: topology.workspaceRoot,
      projects: [{
        rootDir: topology.overlapRoot,
        projectKey: "source-escape",
        sourceFiles: [{ path: path.join(escapedSourceRoot, "main.ts") }],
      }],
    });
    writeAcceptanceDescriptor(topology.descriptorPath, suppliedSourceEscape);
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toThrow(/real project 'source-escape' supplied source must remain inside/u);

    const excludedRootEscape = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: topology.workspaceRoot,
      projects: [{
        rootDir: topology.overlapRoot,
        projectKey: "exclusion-escape",
        sourceFiles: [{ path: path.join(topology.overlapRoot, "src", "main.ts") }],
        excludedSourceRoots: [escapedSourceRoot],
      }],
    });
    writeAcceptanceDescriptor(topology.descriptorPath, excludedRootEscape);
    expect(() => loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toThrow(/real project 'exclusion-escape' excluded source root must remain inside/u);

    const containedJunction = path.join(topology.workspaceRoot, "contained-project");
    fs.symlinkSync(topology.overlapRoot, containedJunction, "junction");
    const containedLink = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: topology.workspaceRoot,
      projects: [{
        rootDir: containedJunction,
        projectKey: "contained-link",
        sourceFiles: [{ path: path.join(containedJunction, "src", "main.ts") }],
      }],
    });
    writeAcceptanceDescriptor(topology.descriptorPath, containedLink);
    expect(loadExtensionHostTestSemanticWorkspaceDescriptor(topology.workspaceRoot, environment))
      .toEqual(containedLink);
  });

  test("uses a genuine explicit overlap topology without first-owner or scope selection", async () => {
    const topology = createAcceptanceTopologyWorkspace(true);
    stubAcceptanceTopologyEnvironment(topology.descriptorPath);
    const templatePath = path.join(topology.overlapRoot, "src", "shared-plugin-app.html");
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const templateDocument = TextDocument.create(templateUri, "html", 1, templateText);
    const session = createSession(topology.workspaceRoot, new TestDocumentStore());
    const querySpy = vi.spyOn(SemanticRuntime.prototype, "answerAppQuery");

    const preflight = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const inventory = await operation.resourceInventory("host-alpha", true);
      const owners = await operation.projectsOwningDocument(
        templateDocument,
        summary.value.appCandidates,
      );
      const position = positionAfter(templateText, "<template>");
      const availability = await Promise.all(owners.map(async (owner) => {
        const ambiguous = await operation.templateResourceAvailability(
          owner.projectKey,
          templateUri,
          position,
          null,
        );
        const selected = await Promise.all(ambiguous.value.candidates.map((candidate) =>
          operation.templateResourceAvailability(
            owner.projectKey,
            templateUri,
            position,
            candidate.scopeIdentityKey,
          )));
        return { owner, ambiguous, selected };
      }));
      return { summary, inventory, owners, availability };
    });

    expect(preflight.summary.value.appCandidates.map((candidate) => candidate.projectKey))
      .toEqual(["host-alpha", "host-beta", "host-guardrail", "host-open"]);
    expect(preflight.owners.map((owner) => owner.projectKey))
      .toEqual(["host-alpha", "host-beta"]);
    expect(preflight.availability.map(({ ambiguous }) => ambiguous.selection))
      .toEqual(["ambiguous", "ambiguous"]);
    expect(preflight.availability.map(({ ambiguous }) => ambiguous.value.rows))
      .toEqual([[], []]);
    expect(preflight.availability.map(({ owner, ambiguous, selected }) => ({
      projectKey: owner.projectKey,
      candidates: ambiguous.value.candidates.map((candidate) => ({
        templateIdentityKey: candidate.templateIdentityKey,
        scopeIdentityKey: candidate.scopeIdentityKey,
        definitionName: candidate.definitionName,
        compilationLane: candidate.compilationLane,
        source: {
          path: candidate.source.path,
          start: candidate.source.start,
          end: candidate.source.end,
        },
      })),
      selected: selected.map((answer) => ({
        selection: answer.selection,
        scopeIdentityKey: answer.value.selectedTemplate?.scopeIdentityKey,
        resourceIdentityKeys: answer.value.rows.map((row) => row.resource.identityKey),
        ...mappedAvailabilityNavigationFacts(answer.value.rows, topology.workspaceRoot),
      })),
    }))).toEqual(OVERLAP_PREFLIGHT_EXPECTATION);
    expect({
      result: preflight.inventory.result,
      selection: preflight.inventory.selection,
      coverage: preflight.inventory.coverage,
      completeness: preflight.inventory.value.completeness,
      rowCount: preflight.inventory.value.rows.length,
    }).toEqual({
      result: "answered",
      selection: "not-applicable",
      coverage: "open",
      completeness: {
        fullDefinitions: 601,
        headerOnly: 5,
        visibilityOnly: 0,
        localTemplates: 5,
        excludedCompilerSyntax: 60,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 2,
      },
      rowCount: 606,
    });
    const inventoryPageQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.ResourceInventory
        && query.projectKey === "host-alpha");
    expect(inventoryPageQueries).toHaveLength(2);
    expect(inventoryPageQueries.every((query) =>
      query.templateAnalysisBreadth === "resource-local"
    )).toBe(true);
    expect(inventoryPageQueries.map((query) => query.page?.size)).toEqual([500, 500]);
    expect(inventoryPageQueries[0]?.page?.cursor).toBeUndefined();
    expect(inventoryPageQueries[1]?.page?.cursor).toEqual(expect.any(String));
    expect(duplicateInventoryIdentityFacts(preflight.inventory.value.rows))
      .toEqual([]);
    expect(metadataStateWitnessFacts(preflight.inventory.value.rows))
      .toEqual(HEADER_ONLY_WITNESS_FACTS);
    expect(inventoryWitnessFacts(preflight.inventory.value.rows))
      .toEqual(COMPOSITE_INVENTORY_WITNESS_FACTS);
    await session.dispose();
  }, 120_000);

  test("keeps overlap identities stable across independently randomized workspace roots", async () => {
    const first = createOverlapStabilityTopologyWorkspace();
    const second = createOverlapStabilityTopologyWorkspace();

    const firstFacts = await captureOverlapPreflightFacts(first);
    const secondFacts = await captureOverlapPreflightFacts(second);

    expect(firstFacts).toEqual(OVERLAP_PREFLIGHT_EXPECTATION);
    expect(secondFacts).toEqual(OVERLAP_PREFLIGHT_EXPECTATION);
    const publicFacts = JSON.stringify([firstFacts, secondFacts]);
    expect(publicFacts).not.toContain(first.workspaceRoot.replace(/\\/gu, "/"));
    expect(publicFacts).not.toContain(second.workspaceRoot.replace(/\\/gu, "/"));
  }, 60_000);

  test("pins shifted and removed navigation witnesses from real semantic refreshes", async () => {
    const topology = createNavigationMutationTopologyWorkspace();
    stubAcceptanceTopologyEnvironment(topology.descriptorPath);
    const session = createSession(topology.workspaceRoot, new TestDocumentStore());
    const leftPath = path.join(
      topology.workspaceRoot,
      "host-corpus",
      "long-scent",
      "left",
      "shared",
      "duplicate-card.ts",
    );
    const rightPath = path.join(
      topology.workspaceRoot,
      "host-corpus",
      "long-scent",
      "right",
      "shared",
      "duplicate-card.ts",
    );
    const templatePath = path.join(
      topology.workspaceRoot,
      "host-corpus",
      "long-scent",
      "src",
      "main.ts",
    );
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const templateAnchor = "<duplicate-card>";
    const templateCursor = positionAfter(templateText, templateAnchor);
    const inventory = async (): Promise<SemanticResourceInventoryResult["rows"]> => (
      await session.runRequest(null, (operation) => operation.resourceInventory("host-alpha", false))
    ).value.rows;
    const availability = async (scopeIdentityKey: string | null = null) =>
      session.runRequest(null, (operation) =>
      operation.templateResourceAvailability(
        "host-alpha",
        templateUri,
        templateCursor,
        scopeIdentityKey,
      ));
    const unselectedAvailability = async () =>
      session.runRequest(null, (operation) =>
      operation.templateResourceAvailability(
        null,
        templateUri,
        templateCursor,
        null,
      ));
    const reproofFacts = (answer: Awaited<ReturnType<typeof availability>>) => ({
      result: answer.result,
      selection: answer.selection,
      coverage: answer.coverage,
      projectKey: answer.value.projectKey,
      displayText: answer.value.displayText,
      selectedTemplate: answer.value.selectedTemplate == null
        ? null
        : {
            templateIdentityKey: answer.value.selectedTemplate.templateIdentityKey,
            scopeIdentityKey: answer.value.selectedTemplate.scopeIdentityKey,
            definitionName: answer.value.selectedTemplate.definitionName,
            compilationLane: answer.value.selectedTemplate.compilationLane,
            source: answer.value.selectedTemplate.source == null
              ? null
              : {
                  path: answer.value.selectedTemplate.source.path,
                  start: answer.value.selectedTemplate.source.start,
                  end: answer.value.selectedTemplate.source.end,
                },
          },
      candidates: answer.value.candidates.map((candidate) => ({
        templateIdentityKey: candidate.templateIdentityKey,
        scopeIdentityKey: candidate.scopeIdentityKey,
        definitionName: candidate.definitionName,
        compilationLane: candidate.compilationLane,
        source: candidate.source == null
          ? null
          : {
              path: candidate.source.path,
              start: candidate.source.start,
              end: candidate.source.end,
            },
      })),
      rows: answer.value.rows.map((row) => ({
        identityKey: row.resource.identityKey,
        state: row.state,
        visibilityKind: row.visibilityKind,
      })),
      completeness: answer.value.completeness,
    });
    expect({
      size: Buffer.byteLength(templateText, "utf8"),
      sha256: createHash("sha256").update(templateText, "utf8").digest("hex"),
      anchor: templateAnchor,
      anchorOffset: templateText.indexOf(templateAnchor),
      cursor: templateCursor,
    }).toEqual({
      size: 524,
      sha256: "ac34eda309963fbb30e712231a22ca078500d23fdbdcafbc9d0a6a8cda61ebf3",
      anchor: "<duplicate-card>",
      anchorOffset: 264,
      cursor: { line: 6, character: 29 },
    });

    const initial = await inventory();
    expect(inventoryWitnessFacts(initial)).toMatchObject({
      longSuffixDuplicates: COMPOSITE_INVENTORY_WITNESS_FACTS.longSuffixDuplicates,
    });
    const initialAvailability = await availability();
    expect({
      result: initialAvailability.result,
      selection: initialAvailability.selection,
      coverage: initialAvailability.coverage,
      projectKey: initialAvailability.value.projectKey,
      selectedTemplate: initialAvailability.value.selectedTemplate == null
        ? null
        : {
            templateIdentityKey: initialAvailability.value.selectedTemplate.templateIdentityKey,
            scopeIdentityKey: initialAvailability.value.selectedTemplate.scopeIdentityKey,
            definitionName: initialAvailability.value.selectedTemplate.definitionName,
            compilationLane: initialAvailability.value.selectedTemplate.compilationLane,
            source: initialAvailability.value.selectedTemplate.source == null
              ? null
              : {
                  path: initialAvailability.value.selectedTemplate.source.path,
                  start: initialAvailability.value.selectedTemplate.source.start,
                  end: initialAvailability.value.selectedTemplate.source.end,
                },
          },
      rows: initialAvailability.value.rows.map((row) => ({
        identityKey: row.resource.identityKey,
        state: row.state,
        visibilityKind: row.visibilityKind,
      })),
    }).toEqual({
      result: "answered",
      selection: "exact",
      coverage: "complete",
      projectKey: "host-alpha",
      selectedTemplate: {
        templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
        scopeIdentityKey: "template-resource-scope:v1:jrk2dmORqV2AsPAQBBOVBN",
        definitionName: "long-suffix-app",
        compilationLane: "app-runtime",
        source: {
          path: "host-corpus/long-scent/src/main.ts",
          start: 264,
          end: 297,
        },
      },
      rows: LONG_SUFFIX_BASELINE_AVAILABILITY_ROWS,
    });
    expect(mappedAvailabilityNavigationFacts(initialAvailability.value.rows, topology.workspaceRoot))
      .toEqual(LONG_SUFFIX_AVAILABILITY_NAVIGATION_FACTS);

    const baselineDependencySource =
      "  dependencies: [LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard],";
    const rightOnlyDependencySource = "  dependencies: [RightLongSuffixDuplicateCard],";
    const rightOnlyTemplateText = templateText.replace(
      baselineDependencySource,
      rightOnlyDependencySource,
    );
    expect(rightOnlyTemplateText).not.toBe(templateText);
    expect({
      before: baselineDependencySource,
      after: rightOnlyDependencySource,
      size: Buffer.byteLength(rightOnlyTemplateText, "utf8"),
      sha256: createHash("sha256").update(rightOnlyTemplateText, "utf8").digest("hex"),
      keepsGlobalRegistration: rightOnlyTemplateText.includes(
        ".register(LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard)",
      ),
    }).toEqual({
      before: baselineDependencySource,
      after: rightOnlyDependencySource,
      size: 495,
      sha256: "9e23fd6bf8ce276391580db74f51b134ab9fc4faa9a2b6e1d7c725b0cf8f393a",
      keepsGlobalRegistration: true,
    });
    fs.writeFileSync(templatePath, rightOnlyTemplateText, "utf8");
    session.recordSourceTextChanged([templatePath]);
    const afterScopeInventory = await inventory();
    expect(afterScopeInventory.some((row) =>
      row.identityKey === "typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA"))
      .toBe(true);
    expect(afterScopeInventory.some((row) =>
      row.identityKey === "typescript-resource:v1:azpBidTgEqjH8hleJeG8v2"))
      .toBe(true);
    const afterScopeAvailability = await availability();
    expect({
      result: afterScopeAvailability.result,
      selection: afterScopeAvailability.selection,
      coverage: afterScopeAvailability.coverage,
      projectKey: afterScopeAvailability.value.projectKey,
      selectedTemplate: afterScopeAvailability.value.selectedTemplate == null
        ? null
        : {
            templateIdentityKey: afterScopeAvailability.value.selectedTemplate.templateIdentityKey,
            scopeIdentityKey: afterScopeAvailability.value.selectedTemplate.scopeIdentityKey,
            definitionName: afterScopeAvailability.value.selectedTemplate.definitionName,
            compilationLane: afterScopeAvailability.value.selectedTemplate.compilationLane,
            source: afterScopeAvailability.value.selectedTemplate.source == null
              ? null
              : {
                  path: afterScopeAvailability.value.selectedTemplate.source.path,
                  start: afterScopeAvailability.value.selectedTemplate.source.start,
                  end: afterScopeAvailability.value.selectedTemplate.source.end,
                },
          },
      rows: afterScopeAvailability.value.rows.map((row) => ({
        identityKey: row.resource.identityKey,
        state: row.state,
        visibilityKind: row.visibilityKind,
      })),
    }).toEqual({
      result: "answered",
      selection: "exact",
      coverage: "complete",
      projectKey: "host-alpha",
      selectedTemplate: {
        templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
        scopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
        definitionName: "long-suffix-app",
        compilationLane: "app-runtime",
        source: {
          path: "host-corpus/long-scent/src/main.ts",
          start: 264,
          end: 297,
        },
      },
      rows: LONG_SUFFIX_RIGHT_ONLY_AVAILABILITY_ROWS,
    });
    const retiredBaselineScopeAvailability = await availability(
      "template-resource-scope:v1:jrk2dmORqV2AsPAQBBOVBN",
    );
    expect({
      requestedScopeIdentityKey: "template-resource-scope:v1:jrk2dmORqV2AsPAQBBOVBN",
      response: reproofFacts(retiredBaselineScopeAvailability),
    }).toEqual({
      requestedScopeIdentityKey: "template-resource-scope:v1:jrk2dmORqV2AsPAQBBOVBN",
      response: {
        result: "answered",
        selection: "absent",
        coverage: "complete",
        projectKey: "host-alpha",
        displayText: "Choose a current template compiler scope before inspecting available resources.",
        selectedTemplate: null,
        candidates: [{
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        }],
        rows: [],
        completeness: {
          fullDefinitions: 30,
          headerOnly: 0,
          visibilityOnly: 0,
          localTemplates: 0,
          excludedCompilerSyntax: 19,
          unnamedDefinitions: 0,
          unresolvedModules: 0,
          openVisibility: 0,
        },
      },
    });
    const restartedAfterScopeEditAvailability = await unselectedAvailability();
    expect({
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      response: reproofFacts(restartedAfterScopeEditAvailability),
    }).toEqual({
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      response: {
        result: "answered",
        selection: "exact",
        coverage: "complete",
        projectKey: "host-alpha",
        displayText: "long-suffix-app: 28 available runtime resource(s).",
        selectedTemplate: {
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        },
        candidates: [{
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        }],
        rows: LONG_SUFFIX_RIGHT_ONLY_AVAILABILITY_ROWS,
        completeness: {
          fullDefinitions: 30,
          headerOnly: 0,
          visibilityOnly: 0,
          localTemplates: 0,
          excludedCompilerSyntax: 19,
          unnamedDefinitions: 0,
          unresolvedModules: 0,
          openVisibility: 0,
        },
      },
    });
    expect(mappedAvailabilityNavigationFacts(
      restartedAfterScopeEditAvailability.value.rows,
      topology.workspaceRoot,
    ))
      .toEqual(LONG_SUFFIX_AVAILABILITY_NAVIGATION_FACTS);

    fs.writeFileSync(leftPath, `// shifted resource\n${fs.readFileSync(leftPath, "utf8")}`, "utf8");
    session.recordSourceTextChanged([leftPath]);
    const shifted = (await inventory()).find((row) =>
      row.identityKey === "typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA");
    expect(shifted == null ? null : {
      identityKey: shifted.identityKey,
      path: shifted.sources.publicName?.path,
      start: shifted.sources.publicName?.start,
      end: shifted.sources.publicName?.end,
    }).toEqual({
      identityKey: "typescript-resource:v1:9FI9Lgdc9qpJlcrJE8OVgA",
      path: "host-corpus/long-scent/left/shared/duplicate-card.ts",
      start: 88,
      end: 102,
    });

    fs.writeFileSync(rightPath, "export class RightLongSuffixDuplicateCard {}\n", "utf8");
    session.recordSourceTextChanged([rightPath]);
    const afterRemovalInventory = await session.runRequest(null, (operation) =>
      operation.resourceInventory("host-alpha", false));
    expect({
      result: afterRemovalInventory.result,
      selection: afterRemovalInventory.selection,
      coverage: afterRemovalInventory.coverage,
      rowCount: afterRemovalInventory.value.rows.length,
      completeness: afterRemovalInventory.value.completeness,
      rightIdentityPresent: afterRemovalInventory.value.rows.some((row) =>
        row.identityKey === "typescript-resource:v1:azpBidTgEqjH8hleJeG8v2"),
    }).toEqual({
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      rowCount: 29,
      completeness: {
        fullDefinitions: 29,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 19,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
      rightIdentityPresent: false,
    });
    const retiredRightOnlyScopeAvailability = await availability(
      "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
    );
    expect({
      requestedScopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
      response: reproofFacts(retiredRightOnlyScopeAvailability),
    }).toEqual({
      requestedScopeIdentityKey: "template-resource-scope:v1:117AGAh7rKTCWxZX1Ks9NB",
      response: {
        result: "answered",
        selection: "absent",
        coverage: "complete",
        projectKey: "host-alpha",
        displayText: "Choose a current template compiler scope before inspecting available resources.",
        selectedTemplate: null,
        candidates: [{
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:b_7B4CPaLeGYVX6iYBfdsJ",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        }],
        rows: [],
        completeness: {
          fullDefinitions: 29,
          headerOnly: 0,
          visibilityOnly: 0,
          localTemplates: 0,
          excludedCompilerSyntax: 19,
          unnamedDefinitions: 0,
          unresolvedModules: 0,
          openVisibility: 0,
        },
      },
    });
    const restartedAfterRemovalAvailability = await unselectedAvailability();
    expect({
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      response: reproofFacts(restartedAfterRemovalAvailability),
    }).toEqual({
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      response: {
        result: "answered",
        selection: "exact",
        coverage: "complete",
        projectKey: "host-alpha",
        displayText: "long-suffix-app: 28 available runtime resource(s).",
        selectedTemplate: {
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:b_7B4CPaLeGYVX6iYBfdsJ",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        },
        candidates: [{
          templateIdentityKey: "template-source:v1:Tkv7BxS6oxVmzjOgIRC496",
          scopeIdentityKey: "template-resource-scope:v1:b_7B4CPaLeGYVX6iYBfdsJ",
          definitionName: "long-suffix-app",
          compilationLane: "app-runtime",
          source: {
            path: "host-corpus/long-scent/src/main.ts",
            start: 264,
            end: 297,
          },
        }],
        rows: LONG_SUFFIX_AFTER_REMOVAL_AVAILABILITY_ROWS,
        completeness: {
          fullDefinitions: 29,
          headerOnly: 0,
          visibilityOnly: 0,
          localTemplates: 0,
          excludedCompilerSyntax: 19,
          unnamedDefinitions: 0,
          unresolvedModules: 0,
          openVisibility: 0,
        },
      },
    });
    expect(mappedAvailabilityNavigationFacts(
      restartedAfterRemovalAvailability.value.rows,
      topology.workspaceRoot,
    ))
      .toEqual(LONG_SUFFIX_AVAILABILITY_NAVIGATION_FACTS);
    await session.dispose();
  }, 60_000);

  test("pins every admitted header-only metadata row and its navigation state", async () => {
    const topology = createMetadataStateTopologyWorkspace();
    stubAcceptanceTopologyEnvironment(topology.descriptorPath);
    const session = createSession(topology.workspaceRoot, new TestDocumentStore());
    const inventory = await session.runRequest(null, (operation) =>
      operation.resourceInventory("host-alpha", false));

    expect(metadataStateWitnessFacts(inventory.value.rows))
      .toEqual(HEADER_ONLY_WITNESS_FACTS);
    await session.dispose();
  }, 60_000);

  test("routes an exact framework capability explanation through the operation-owned cursor", async () => {
    const fixtureRoot = path.resolve(
      fileURLToPath(new URL("../../../semantic-runtime/fixtures/pressure/framework-capability-explanation-no-package", import.meta.url)),
    );
    const templatePath = path.join(fixtureRoot, "src", "capability-explanation-app.html");
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const template = TextDocument.create(templateUri, "html", 1, templateText);
    const position = template.positionAt(templateText.indexOf("virtual-repeat.for"));
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const answer = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const project = summary.value.appCandidates[0];
      if (project == null) throw new Error("Expected the explanation fixture to admit one app project.");
      return operation.frameworkCapabilityExplanation(
        project.projectKey,
        templateUri,
        position,
        FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
      );
    });

    expect(answer).toMatchObject({
      result: "answered",
      selection: "exact",
      value: {
        explanation: {
          subject: {
            requiredCapability: "ui-virtualization.default-resources",
            source: { path: expect.stringContaining("capability-explanation-app.html") },
          },
          conclusion: { kind: "not-admitted" },
        },
        contenders: [{ conclusionKind: "not-admitted" }],
      },
    });
    await session.dispose();
  }, 60_000);

  test("routes a cursor-only binding uncertainty explanation and returns its owning project", async () => {
    const fixtureRoot = path.resolve(
      fileURLToPath(new URL("../../../semantic-runtime/fixtures/pressure/aliased-bindable-surfaces", import.meta.url)),
    );
    const templatePath = path.join(fixtureRoot, "src", "app.html");
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const template = TextDocument.create(templateUri, "html", 1, templateText);
    const position = template.positionAt(templateText.indexOf("title.bind") + 2);
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const answer = await session.runRequest(null, (operation) =>
      operation.bindingUncertaintyExplanation(null, templateUri, position));

    expect(answer).toMatchObject({
      result: "answered",
      selection: "exact",
      value: {
        projectKey: expect.any(String),
        explanation: {
          subject: {
            projectKey: expect.any(String),
            definitionName: "app-root",
            bindingKind: "property",
            source: { path: expect.stringContaining("app.html") },
          },
        },
      },
    });
    expect(answer.value.explanation?.subject.projectKey).toBe(answer.value.projectKey);
    await session.dispose();
  }, 60_000);

  test("routes a cursor-only attribute interpretation at the authored name", async () => {
    const fixtureRoot = path.resolve(
      fileURLToPath(new URL("../../../semantic-runtime/fixtures/pressure/binding-uncertainty-explanation", import.meta.url)),
    );
    const templatePath = path.join(fixtureRoot, "src", "exact-app.html");
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const template = TextDocument.create(templateUri, "html", 1, templateText);
    const position = template.positionAt(templateText.indexOf("click.trigger") + 2);
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const answer = await session.runRequest(null, (operation) =>
      operation.attributeInterpretationExplanation(null, templateUri, position));

    expect(answer).toMatchObject({
      result: "answered",
      selection: "exact",
      value: {
        projectKey: expect.any(String),
        explanation: {
          subject: {
            projectKey: expect.any(String),
            rawName: "click.trigger",
            nameSource: { path: expect.stringContaining("exact-app.html") },
          },
          conclusion: { kind: "instruction-backed" },
        },
      },
    });
    expect(answer.value.explanation?.subject.projectKey).toBe(answer.value.projectKey);
    await session.dispose();
  }, 60_000);

  test("routes one exact resource availability subject at runtime-topology depth", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const templatePath = path.join(fixtureRoot, "src", "app.html");
    const templateText = fs.readFileSync(templatePath, "utf8");
    const templateUri = pathToFileURL(templatePath).toString();
    const template = TextDocument.create(templateUri, "html", 1, templateText);
    const position = template.positionAt(templateText.indexOf("message") + 2);
    const originalAnswerAppQuery = SemanticRuntime.prototype.answerAppQuery;
    const querySpy = vi.spyOn(SemanticRuntime.prototype, "answerAppQuery")
      .mockImplementation(function (this: SemanticRuntime, query) {
        if (query.kind !== SemanticAppQueryKind.ResourceAvailabilityExplanation) {
          return originalAnswerAppQuery.call(this, query);
        }
        return Promise.resolve({
          schemaVersion: "0.2",
          result: "answered",
          selection: "absent",
          coverage: "complete",
          summary: "The selected resource is absent.",
          value: {
            displayText: "The selected resource is absent.",
            projectKey: query.projectKey,
            explanation: null,
            contenders: [],
          },
          page: null,
        } as never);
      });
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const result = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const projectKey = summary.value.appCandidates[0]?.projectKey;
      if (projectKey == null) throw new Error("Expected one minimal-app project.");
      return {
        projectKey,
        answer: await operation.resourceAvailabilityExplanation(
          projectKey,
          templateUri,
          position,
          "resource:app-root:v1",
          "scope:app-root:v1",
        ),
      };
    });

    expect(result.answer).toMatchObject({
      result: "answered",
      selection: "absent",
      value: { projectKey: result.projectKey, explanation: null, contenders: [] },
    });
    const explanationQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.ResourceAvailabilityExplanation);
    expect(explanationQueries).toHaveLength(1);
    expect(explanationQueries[0]).toMatchObject({
      kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
      projectKey: result.projectKey,
      sourceFilePath: templatePath,
      cursor: {
        filePath: templatePath,
        line: position.line,
        character: position.character,
        offset: template.offsetAt(position),
      },
      resourceIdentityKey: "resource:app-root:v1",
      templateResourceScopeIdentityKey: "scope:app-root:v1",
      inquiryProfile: "lsp-cursor",
      analysisDepth: "runtime-topology",
      includeAuthoringTemplates: true,
      appRetention: "retain-app",
    });
    await session.dispose();
  }, 60_000);

  test("retains ordinary discovery for a gated descriptor belonging to another root", async () => {
    const topology = createAcceptanceTopologyWorkspace();
    stubAcceptanceTopologyEnvironment(topology.descriptorPath);
    const ordinaryRoot = minimalFixtureRoot();
    const session = createSession(ordinaryRoot, new TestDocumentStore());

    const summary = await session.runRequest(null, (operation) => operation.workspaceSummary());

    expect(summary.value.appCandidates.map((candidate) => candidate.projectKey))
      .toContain("aurelia-minimal-app");
    expect(summary.value.appCandidates.map((candidate) => candidate.projectKey))
      .not.toContain("host-alpha");
    await session.dispose();
  }, 60_000);

  test("keeps a native-marker zero unexposed and preserves discovery truncation", async () => {
    const topology = createStateCandidateTopologyWorkspace();
    stubAcceptanceTopologyEnvironment(topology.descriptorPath);
    const session = createSession(topology.workspaceRoot, new TestDocumentStore());
    const guardrailPath = path.join(topology.workspaceRoot, "host-corpus", "guardrail", "src", "a-main.ts");
    const guardrailText = fs.readFileSync(guardrailPath, "utf8");
    const guardrailUri = pathToFileURL(guardrailPath).toString();
    const openPath = path.join(topology.workspaceRoot, "host-corpus", "open", "src", "a-main.ts");
    const openText = fs.readFileSync(openPath, "utf8");
    const openUri = pathToFileURL(openPath).toString();

    const preflight = await session.runRequest(null, async (operation) => {
      const guardrail = await operation.resourceInventory("host-guardrail", false);
      return {
        summary: await operation.workspaceSummary(),
        empty: await operation.resourceInventory("host-empty", false),
        guardrail,
        open: await operation.resourceInventory("host-open", false),
        availability: await operation.templateResourceAvailability(
          "host-guardrail",
          guardrailUri,
          positionAfter(guardrailText, "<template>"),
          null,
        ),
        openAvailability: await operation.templateResourceAvailability(
          "host-open",
          openUri,
          positionAfter(openText, "<template>"),
          null,
        ),
      };
    });

    expect(preflight.summary.value.appCandidates.map((candidate) => candidate.projectKey))
      .toEqual(["host-guardrail", "host-open"]);
    expect({
      result: preflight.empty.result,
      coverage: preflight.empty.coverage,
      rows: preflight.empty.value.rows.length,
      completeness: preflight.empty.value.completeness,
    }).toEqual({
      result: "answered",
      coverage: "complete",
      rows: 0,
      completeness: {
        fullDefinitions: 0,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 0,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
    });
    const openApp = preflight.open.value.rows.find((row) => row.name === "open-coverage-app");
    expect({
      result: preflight.open.result,
      selection: preflight.open.selection,
      coverage: preflight.open.coverage,
      rows: preflight.open.value.rows.length,
      completeness: preflight.open.value.completeness,
      app: openApp == null ? null : {
        identityKey: openApp.identityKey,
        metadataState: openApp.metadataState,
        path: openApp.sources.publicName?.path,
        start: openApp.sources.publicName?.start,
        end: openApp.sources.publicName?.end,
      },
    }).toEqual({
      result: "answered",
      selection: "not-applicable",
      coverage: "open",
      rows: 28,
      completeness: {
        fullDefinitions: 28,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 19,
        unnamedDefinitions: 0,
        unresolvedModules: 1,
        openVisibility: 0,
      },
      app: {
        identityKey: "typescript-resource:v1:V-gCP1whFcd-3Sk_GtH8Mr",
        metadataState: "full-definition",
        path: "host-corpus/open/src/a-main.ts",
        start: 104,
        end: 121,
      },
    });
    expect({
      result: preflight.openAvailability.result,
      selection: preflight.openAvailability.selection,
      coverage: preflight.openAvailability.coverage,
      rows: preflight.openAvailability.value.rows.length,
    }).toEqual({
      result: "answered",
      selection: "exact",
      coverage: "open",
      rows: 27,
    });
    const guardrailApp = preflight.guardrail.value.rows.find((row) => row.name === "guardrail-app");
    expect(guardrailApp == null ? null : {
      identityKey: guardrailApp.identityKey,
      path: guardrailApp.sources.publicName?.path,
      start: guardrailApp.sources.publicName?.start,
      end: guardrailApp.sources.publicName?.end,
    }).toEqual({
      identityKey: "typescript-resource:v1:QR1GGbNHIgBozNkhlI0cnW",
      path: "host-corpus/guardrail/src/a-main.ts",
      start: 75,
      end: 88,
    });
    expect({
      result: preflight.availability.result,
      selection: preflight.availability.selection,
      coverage: preflight.availability.coverage,
      rows: preflight.availability.value.rows.length,
    }).toEqual({
      result: "answered",
      selection: "exact",
      coverage: "truncated",
      rows: 27,
    });
    expect({
      result: preflight.guardrail.result,
      coverage: preflight.guardrail.coverage,
      displayText: preflight.guardrail.value.displayText,
      rows: preflight.guardrail.value.rows.length,
      includesOverLimit: preflight.guardrail.value.rows.some((row) => row.name === "over-limit"),
      completeness: preflight.guardrail.value.completeness,
    }).toEqual({
      result: "answered",
      coverage: "truncated",
      displayText: expect.stringContaining("source-discovery guardrail"),
      rows: 28,
      includesOverLimit: false,
      completeness: {
        fullDefinitions: 28,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 19,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
    });
    await session.dispose();
  }, 60_000);

  test("uses an opaque session identity in transport fingerprints", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const fingerprint = (await session.runRequest(null, (operation) => operation.generation)).fingerprint;

    expect(fingerprint).toMatch(/^semantic-runtime:[^:]+:workspace-\d+:source-world-.+:request-\d+$/);
    expect(fingerprint).not.toContain(fixtureRoot);
  });

  test("answers template completions from open document source text", async () => {
    const packageRoot = path.resolve(
      fileURLToPath(new URL("../..", import.meta.url)),
    );
    const fixtureRoot = path.resolve(
      packageRoot,
      "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
    );
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${t}");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "title = 'Edited in memory'",
      );
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlDocument = TextDocument.create(htmlUri, "html", 2, htmlText);
    const tsDocument = TextDocument.create(tsUri, "typescript", 2, tsText);
    const documents = new TestDocumentStore();
    documents.add(htmlDocument);
    documents.add(tsDocument);

    const session = createSession(fixtureRoot, documents);
    const answer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlDocument.uri,
      positionAfter(htmlText, "${t"),
    ));
    const candidateNames = answer.value.candidates.map(
      (candidate) => candidate.name,
    );

    expect(answer.result).toBe("answered");
    expect(candidateNames).toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("derives cursor offsets from managed text instead of a stale external document", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const diskHtmlText = fs.readFileSync(htmlPath, "utf8");
    const managedHtmlText = diskHtmlText.replace(
      "  <h1>${message}</h1>",
      "  <h1>\n    ${t}\n  </h1>",
    );
    const managedTsText = fs.readFileSync(tsPath, "utf8").replace(
      "message = 'Hello semantic runtime'",
      "title = 'Edited in memory'",
    );
    const position = positionAfter(managedHtmlText, "${t");
    const staleExternalDocument = TextDocument.create(htmlUri, "html", 1, diskHtmlText);
    const managedDocument = TextDocument.create(htmlUri, "html", 2, managedHtmlText);
    const documents = new TestDocumentStore();
    documents.add(managedDocument);
    documents.add(TextDocument.create(tsUri, "typescript", 2, managedTsText));
    const session = createSession(fixtureRoot, documents);

    expect(staleExternalDocument.offsetAt(position)).not.toBe(managedDocument.offsetAt(position));
    const answer = await session.runRequest(null, (operation) =>
      operation.templateCompletions(htmlUri, position));

    expect(answer.value.candidates.map((candidate) => candidate.name)).toContain("title");
  });

  test("pins one managed document basis and rejects a conflicting underlying edit", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const pinnedHtmlText = fs.readFileSync(htmlPath, "utf8").replace(
      "  <h1>${message}</h1>",
      "  <h1>\n    ${t}\n  </h1>",
    );
    const replacementHtmlText = "<main>\n  <h1>Closed after pinning</h1>\n</main>\n";
    const managedTsText = fs.readFileSync(tsPath, "utf8").replace(
      "message = 'Hello semantic runtime'",
      "title = 'Edited in memory'",
    );
    const position = positionAfter(pinnedHtmlText, "${t");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 2, pinnedHtmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 2, managedTsText));
    const session = createSession(fixtureRoot, documents);

    await expect(session.runRequest(null, async (operation) => {
      const firstDocument = operation.documents.ensureProgramDocument(htmlUri);
      expect(firstDocument?.version).toBe(2);
      expect(firstDocument?.getText()).toBe(pinnedHtmlText);

      documents.add(TextDocument.create(htmlUri, "html", 3, replacementHtmlText));
      const repeatedDocument = operation.documents.ensureProgramDocument(htmlUri);
      expect(repeatedDocument?.version).toBe(2);
      expect(repeatedDocument?.getText()).toBe(pinnedHtmlText);

      return operation.templateCompletions(htmlUri, position);
    })).rejects.toMatchObject({ reason: "stale" });
  });

  test("answers from changed open document text after a source generation change", async () => {
    const packageRoot = path.resolve(
      fileURLToPath(new URL("../..", import.meta.url)),
    );
    const fixtureRoot = path.resolve(
      packageRoot,
      "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
    );
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${t}");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "title = 'Edited in memory'",
      );
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 2, htmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 2, tsText));

    const session = createSession(fixtureRoot, documents);
    const firstAnswer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlUri,
      positionAfter(htmlText, "${t"),
    ));
    expect(
      firstAnswer.value.candidates.map((candidate) => candidate.name),
    ).toContain("title");

    const nextHtmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${h}");
    const nextTsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "headline = 'Edited again'",
      );
    documents.add(TextDocument.create(htmlUri, "html", 3, nextHtmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 3, nextTsText));
    session.recordSourceTextChanged([htmlPath, tsPath]);
    const secondAnswer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlUri,
      positionAfter(nextHtmlText, "${h"),
    ));
    const candidateNames = secondAnswer.value.candidates.map(
      (candidate) => candidate.name,
    );

    expect(candidateNames).toContain("headline");
    expect(candidateNames).not.toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("projects document URIs through native authored-source ownership", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const appPath = path.join(fixtureRoot, "src/app.ts");
    const appUri = pathToFileURL(appPath).toString();
    const documents = new TestDocumentStore();
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) =>
      operation.authoredSourceOwnership(appUri));

    expect(answer.value.sourceFilePath).toBe(path.normalize(appPath));
    expect(answer.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(fixtureRoot),
        projectPath: "src/app.ts",
        role: "app-source",
      }),
    ]);
  });

  test("passes host project-root evidence through shared semantic discovery", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const hintedRoot = path.join(fixtureRoot, "src");
    const appPath = path.join(hintedRoot, "app.ts");
    const appUri = pathToFileURL(appPath).toString();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const beforeHintGeneration = await session.runRequest(null, (operation) => operation.generation);

    session.configureWorkspace([hintedRoot]);
    const hintedGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(hintedGeneration.requestEpoch).not.toBe(beforeHintGeneration.requestEpoch);
    session.configureWorkspace([path.join(hintedRoot, "."), hintedRoot]);
    const normalizedHintGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(normalizedHintGeneration).toEqual(hintedGeneration);
    const answer = await session.runRequest(null, (operation) =>
      operation.authoredSourceOwnership(appUri));

    expect(answer.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(hintedRoot),
        projectPath: "app.ts",
      }),
    ]);
  });

  test("reads open native project-configuration diagnostics by URI", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const configPath = path.join(fixtureRoot, "aurelia.project.json");
    const configUri = pathToFileURL(configPath).toString();
    const configText = '{"version":1,"unknown":true}';
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(configUri, "json", 1, configText));
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) =>
      operation.projectConfigurationDiagnostics(configUri));

    expect(answer.value.rows).toEqual([
      expect.objectContaining({
        diagnosticKind: "aurelia-project-config-unknown-property",
        source: expect.objectContaining({
          filePath: configPath.replace(/\\/g, "/"),
          start: configText.indexOf('"unknown"'),
          end: configText.indexOf('"unknown"') + '"unknown"'.length,
        }),
      }),
    ]);
  });

  test("drains completion candidates beyond the public first page", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlText = "<main>${candidate}</main>";
    const candidateProperties = Array.from(
      { length: 140 },
      (_, index) => `  candidate${String(index).padStart(3, "0")} = ${index};`,
    ).join("\n");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace("  message = 'Hello semantic runtime';", candidateProperties);
    const documents = new TestDocumentStore();
    const htmlDocument = TextDocument.create(htmlUri, "html", 2, htmlText);
    documents.add(htmlDocument);
    documents.add(TextDocument.create(tsUri, "typescript", 2, tsText));
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlDocument.uri,
      positionAfter(htmlText, "${candidate"),
    ));
    const names = answer.value.candidates.map((candidate) => candidate.name);

    expect(answer.page).toBeNull();
    expect(names).toContain("candidate000");
    expect(names).toContain("candidate139");
    expect(names.filter((name) => name.startsWith("candidate"))).toHaveLength(140);
  });

  test("aborts a cancelled request before opening the runtime", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(
      path.join(fixtureRoot, "src/app.html"),
    ).toString();
    const document = TextDocument.create(
      htmlUri,
      "html",
      1,
      "<template>${m}</template>",
    );
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = createSession(fixtureRoot, documents);
    const callback = vi.fn();

    await expect(
      session.runRequest(() => true, callback),
    ).rejects.toMatchObject({ reason: "cancelled" });
    expect(callback).not.toHaveBeenCalled();
  });

  test("checks cancellation again after shared source-world admission before opening the callback", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const callback = vi.fn();
    let cancellationPolls = 0;
    const session = createSession(
      fixtureRoot,
      new TestDocumentStore(),
      () => undefined,
      checkpointSemanticRuntimeLspOperation,
    );

    await expect(session.runRequest(
      () => ++cancellationPolls > 1,
      callback,
    )).rejects.toMatchObject({ reason: "cancelled" });

    expect(cancellationPolls).toBeGreaterThan(1);
    expect(callback).not.toHaveBeenCalled();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("keeps cold shared workspace admission independent from a cancelled leading request", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const leaderCallback = vi.fn((operation: SemanticRuntimeLspOperation) =>
      operation.workspaceSummary());
    const followerCallback = vi.fn((operation: SemanticRuntimeLspOperation) =>
      operation.workspaceSummary());
    const session = createSession(
      fixtureRoot,
      new TestDocumentStore(),
      () => undefined,
      checkpointSemanticRuntimeLspOperation,
    );
    let leaderCancelled = false;

    const leaderFailure = session.runRequest(
      () => leaderCancelled,
      leaderCallback,
    ).then(
      () => null,
      (error: unknown) => error,
    );
    const follower = session.runRequest(
      () => false,
      followerCallback,
    );
    leaderCancelled = true;

    await expect(leaderFailure).resolves.toMatchObject({ reason: "cancelled" });
    await expect(follower).resolves.toMatchObject({ result: "answered" });
    expect(leaderCallback).not.toHaveBeenCalled();
    expect(followerCallback).toHaveBeenCalledOnce();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("keeps post-edit reconciliation independent from a cancelled leading request", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    const initialText = fs.readFileSync(htmlPath, "utf8");
    documents.add(TextDocument.create(htmlUri, "html", 1, initialText));
    const session = createSession(
      fixtureRoot,
      documents,
      () => undefined,
      checkpointSemanticRuntimeLspOperation,
    );
    await session.runRequest(null, (operation) => operation.workspaceSummary());
    const changedText = `${initialText}\n<!-- reconciled edit -->\n`;
    documents.add(TextDocument.create(htmlUri, "html", 2, changedText));
    session.recordSourceTextChanged([htmlPath]);
    const leaderCallback = vi.fn((operation: SemanticRuntimeLspOperation) =>
      operation.documents.lookupDocumentSnapshot(htmlUri));
    const followerCallback = vi.fn((operation: SemanticRuntimeLspOperation) =>
      operation.documents.lookupDocumentSnapshot(htmlUri));
    let leaderCancelled = false;

    const leaderFailure = session.runRequest(
      () => leaderCancelled,
      leaderCallback,
    ).then(
      () => null,
      (error: unknown) => error,
    );
    const follower = session.runRequest(
      () => false,
      followerCallback,
    );
    leaderCancelled = true;

    await expect(leaderFailure).resolves.toMatchObject({ reason: "cancelled" });
    await expect(follower).resolves.toMatchObject({
      uri: htmlUri,
      version: 2,
      text: changedText,
    });
    expect(leaderCallback).not.toHaveBeenCalled();
    expect(followerCallback).toHaveBeenCalledOnce();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("cancels at a callback host read without publishing effects and closes its checkpoint lineage", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const documents = new TestDocumentStore();
    const publishEffect = vi.fn();
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(pathToFileURL(fixtureRoot).toString());
    const sourceTextOverlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
    const projectInputHost = new NodeSemanticRuntimeProjectInputHost(
      sourceTextOverlay,
      checkpointSemanticRuntimeLspOperation,
    );
    const session = new SemanticRuntimeLspSession({
      documentUris,
      projectInputHost,
      projectInputCurrentnessPolicy: sourceTextOverlay,
      openDocumentMetadata: () => null,
      publishEffect,
    });
    const releaseDescendant = deferred<void>();
    let descendantCheckpoint!: Promise<unknown>;
    let cancelled = false;
    let directHostReadFailure: unknown;
    let resultEscaped = false;

    expect(checkpointSemanticRuntimeLspOperation).not.toThrow();
    await expect(session.runRequest(() => cancelled, (operation) => {
      operation.deferEffect({ kind: "log", level: "info", message: "must not publish" });
      descendantCheckpoint = releaseDescendant.promise.then(() =>
        captureThrown(checkpointSemanticRuntimeLspOperation));
      cancelled = true;
      try {
        projectInputHost.readFile(path.join(fixtureRoot, "package.json"));
      } catch (error) {
        directHostReadFailure = error;
        throw error;
      }
      resultEscaped = true;
      return "must not return";
    })).rejects.toMatchObject({ reason: "cancelled" });

    expect(directHostReadFailure).toBeInstanceOf(SemanticRuntimeLspRequestAbortedError);
    expect(directHostReadFailure).toMatchObject({ reason: "cancelled" });
    expect(resultEscaped).toBe(false);
    expect(publishEffect).not.toHaveBeenCalled();
    releaseDescendant.resolve(undefined);
    await expect(descendantCheckpoint).resolves.toBeNull();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("aborts a request captured before a source generation change", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(
      path.join(fixtureRoot, "src/app.html"),
    ).toString();
    const document = TextDocument.create(
      htmlUri,
      "html",
      1,
      "<template>${m}</template>",
    );
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = createSession(fixtureRoot, documents);

    await expect(
      session.runRequest(null, (operation) => {
        session.recordSourceTextChanged([path.join(fixtureRoot, "src/app.html")]);
        return operation.templateCompletions(document.uri, { line: 0, character: 13 });
      }),
    ).rejects.toMatchObject({ reason: "stale" });
  });

  test("rejects reentrant workspace lifecycle before mutation across a macrotask", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const baselineGeneration = await session.runRequest(null, (operation) => operation.generation);

    const attempts = await session.runRequest(null, async () => {
      await yieldTurn();
      return {
        configure: captureThrown(() => session.configureWorkspace([path.join(fixtureRoot, "src")])),
        dispose: captureThrown(() => session.dispose()),
      };
    });

    expect(attempts.configure).toBeInstanceOf(SemanticRuntimeLspReentrantLifecycleError);
    expect(attempts.configure).toMatchObject({
      code: "SEMANTIC_RUNTIME_LSP_REENTRANT_LIFECYCLE",
      action: "configure-workspace",
    });
    expect(attempts.dispose).toBeInstanceOf(SemanticRuntimeLspReentrantLifecycleError);
    expect(attempts.dispose).toMatchObject({
      code: "SEMANTIC_RUNTIME_LSP_REENTRANT_LIFECYCLE",
      action: "dispose",
    });
    await expect(session.runRequest(null, (operation) => operation.generation))
      .resolves.toEqual(baselineGeneration);
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("allows an external workspace reconfiguration to stale a paused request", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const entered = deferred<SemanticRuntimeLspGeneration>();
    const release = deferred<void>();
    const paused = session.runRequest(null, async (operation) => {
      entered.resolve(operation.generation);
      await release.promise;
      return "obsolete";
    });
    const staleGeneration = await entered.promise;

    session.configureWorkspace([path.join(fixtureRoot, "src")]);
    release.resolve(undefined);

    await expect(paused).rejects.toMatchObject({ reason: "stale" });
    const currentGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(currentGeneration.requestEpoch).not.toBe(staleGeneration.requestEpoch);
    expect(currentGeneration.workspaceGeneration).not.toBe(staleGeneration.workspaceGeneration);
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("transfers a nested marker owner through one stale request and reuses the replacement incarnation", async () => {
    const { workspaceRoot, nestedRoot, nestedSourcePath, markerPath } = createNestedMarkerWorkspace();
    const nestedSourceUri = pathToFileURL(nestedSourcePath).toString();
    const publishEffect = vi.fn();
    const session = createSession(workspaceRoot, new TestDocumentStore(), publishEffect);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the spy invokes this with its captured runtime receiver.
    const rawSummary = SemanticRuntime.prototype.summary;
    const runtimeIdentities: SemanticRuntime[] = [];
    const summarySpy = vi.spyOn(SemanticRuntime.prototype, "summary")
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        runtimeIdentities.push(this);
        return rawSummary.call(this, { ...request, projectPage: { size: 20 } });
      });
    const entered = deferred<LspMarkerSnapshot>();
    const release = deferred<void>();
    const paused = session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const ownership = await operation.authoredSourceOwnership(nestedSourceUri);
      operation.deferEffect({ kind: "log", level: "info", message: "obsolete marker result" });
      entered.resolve({ generation: operation.generation, summary, ownership });
      await release.promise;
      return "obsolete";
    });
    const baseline = await entered.promise;

    fs.writeFileSync(markerPath, '{"name":"nested-feature"}\n', "utf8");
    session.recordProjectTopologyChanged([markerPath]);
    release.resolve(undefined);
    const staleError = await paused.then(
      () => null,
      (error: unknown) => error,
    );

    expect(staleError).toMatchObject({
      reason: "stale",
      cause: {
        code: "SEMANTIC_RUNTIME_OPERATION_STALE",
        currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
      },
    });
    expect(publishEffect).not.toHaveBeenCalled();
    expect(baseline.ownership.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(workspaceRoot),
        projectPath: "packages/feature/src/feature.ts",
      }),
    ]);

    const replacement = await captureMarkerSnapshot(session, nestedSourceUri);
    const reused = await captureMarkerSnapshot(session, nestedSourceUri);
    const nestedProject = replacement.summary.value.projects.find(
      (project) => path.normalize(project.rootDir) === path.normalize(nestedRoot),
    );

    expect(baseline.summary.value.projects.some(
      (project) => path.normalize(project.rootDir) === path.normalize(nestedRoot),
    )).toBe(false);
    expect(replacement.generation.requestEpoch).not.toBe(baseline.generation.requestEpoch);
    expect(replacement.generation.workspaceGeneration).not.toBe(baseline.generation.workspaceGeneration);
    expect(replacement.generation.sourceWorldRevision).not.toBe(baseline.generation.sourceWorldRevision);
    expect(nestedProject?.admissionOrigins).toEqual([{
      kind: "package-json-marker",
      sourceFilePath: path.normalize(markerPath),
      viaProjectRootHintDir: null,
    }]);
    expect(replacement.ownership.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(nestedRoot),
        projectPath: "src/feature.ts",
      }),
    ]);
    expect(reused.generation).toEqual(replacement.generation);
    expect(reused.summary.value.projects).toEqual(replacement.summary.value.projects);
    expect(runtimeIdentities).toHaveLength(3);
    expect(runtimeIdentities[1]).not.toBe(runtimeIdentities[0]);
    expect(runtimeIdentities[2]).toBe(runtimeIdentities[1]);

    summarySpy.mockRestore();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("does not return an accepted result when the final deferred effect closes the session", async () => {
    const fixtureRoot = minimalFixtureRoot();
    let session!: SemanticRuntimeLspSession;
    session = createSession(
      fixtureRoot,
      new TestDocumentStore(),
      async () => session.dispose(),
    );

    await expect(session.runRequest(null, (operation) => {
      operation.deferEffect({ kind: "log", level: "info", message: "accepted effect" });
      return "accepted result";
    })).rejects.toMatchObject({ reason: "stale" });
  });

  test("requests resource definitions without handles and keeps inventory type surfaces caller-selected", async () => {
    const querySpy = vi.spyOn(SemanticRuntime.prototype, "answerAppQuery");
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());
    const result = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const projectKey = summary.value.appCandidates[0]?.projectKey;
      if (projectKey == null) {
        throw new Error("Expected the fixture to expose one app candidate.");
      }
      const definitions = await operation.resourceDefinitions();
      const compact = await operation.resourceInventory(projectKey, false);
      const rich = await operation.resourceInventory(projectKey, true);
      return {
        definitionRows: definitions.value.rows.length,
        definitionsHaveHandles: definitions.value.rows.some((row) =>
          Object.hasOwn(row, "handles")),
        compactTypeSurfacesIncluded: compact.value.typeSurfacesIncluded,
        richTypeSurfacesIncluded: rich.value.typeSurfacesIncluded,
      };
    });
    const definitionQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.ResourceDefinitions);
    const inventoryQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.ResourceInventory);
    querySpy.mockRestore();

    expect(result.definitionRows).toBeGreaterThan(0);
    expect(result.definitionsHaveHandles).toBe(false);
    expect(result.compactTypeSurfacesIncluded).toBe(false);
    expect(result.richTypeSurfacesIncluded).toBe(true);
    expect(definitionQueries.length).toBeGreaterThan(0);
    expect(definitionQueries.every((query) => query.analysisDepth == null)).toBe(true);
    expect(inventoryQueries.length).toBeGreaterThan(0);
    expect(inventoryQueries.every((query) =>
      query.templateAnalysisBreadth === "resource-local"
    )).toBe(true);
  });

  test("opens template ownership at the complete retained editor depth", async () => {
    const querySpy = vi.spyOn(SemanticRuntime.prototype, "answerAppQuery");
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());

    await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const projectKey = summary.value.appCandidates[0]?.projectKey;
      if (projectKey == null) {
        throw new Error("Expected the fixture to expose one app candidate.");
      }
      return operation.templateDocumentOwnership(projectKey);
    });

    const ownershipQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.TemplateDocumentOwnership);
    expect(ownershipQueries).toHaveLength(1);
    expect(ownershipQueries[0]).toMatchObject({
      analysisDepth: "binding-observation",
      includeAuthoringTemplates: false,
      inquiryProfile: "lsp-cursor",
      appRetention: "retain-app",
    });
  });

  test("requests one explicit project and drains every analysis-limitation page", async () => {
    const originalAnswerAppQuery = SemanticRuntime.prototype.answerAppQuery;
    const firstRow = { findingKey: "analysis-limitation:first" } as
      SemanticAnalysisLimitationsResult["rows"][number];
    const secondRow = { findingKey: "analysis-limitation:second" } as
      SemanticAnalysisLimitationsResult["rows"][number];
    const querySpy = vi.spyOn(SemanticRuntime.prototype, "answerAppQuery")
      .mockImplementation(function (this: SemanticRuntime, query) {
        if (query.kind !== SemanticAppQueryKind.AnalysisLimitations) {
          return originalAnswerAppQuery.call(this, query);
        }
        const projectKey = query.projectKey;
        return Promise.resolve(query.page?.cursor == null
          ? analysisLimitationsPage(projectKey, [firstRow], null, "analysis-page-2", false)
          : analysisLimitationsPage(projectKey, [secondRow], "analysis-page-2", null, true));
      });
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());

    const result = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const projectKey = summary.value.appCandidates[0]?.projectKey;
      if (projectKey == null) {
        throw new Error("Expected the fixture to expose one app candidate.");
      }
      return {
        projectKey,
        answer: await operation.analysisLimitations(projectKey),
      };
    });

    expect(result.answer.value.projectKey).toBe(result.projectKey);
    expect(result.answer.value.rows.map((row) => row.findingKey)).toEqual([
      "analysis-limitation:first",
      "analysis-limitation:second",
    ]);
    expect(result.answer.page).toBeNull();
    expect(result.answer.summary).toBe("Returned 2 analysis limitation(s).");
    expect(result.answer.value.displayText).toBe("Returned 2 analysis limitation(s).");
    expect(result.answer.value.displayText).not.toContain("Terminal page text");
    const analysisQueries = querySpy.mock.calls
      .map(([query]) => query)
      .filter((query) => query.kind === SemanticAppQueryKind.AnalysisLimitations);
    expect(analysisQueries).toHaveLength(2);
    expect(analysisQueries.map((query) => ({
      projectKey: query.projectKey,
      page: query.page,
      inquiryProfile: query.inquiryProfile,
      templateAnalysisBreadth: query.templateAnalysisBreadth,
      appRetention: query.appRetention,
    }))).toEqual([
      {
        projectKey: result.projectKey,
        page: { size: 500, cursor: undefined },
        inquiryProfile: "lsp-cursor",
        templateAnalysisBreadth: "resource-local",
        appRetention: "retain-app",
      },
      {
        projectKey: result.projectKey,
        page: { size: 500, cursor: "analysis-page-2" },
        inquiryProfile: "lsp-cursor",
        templateAnalysisBreadth: "resource-local",
        appRetention: "retain-app",
      },
    ]);

    await session.dispose();
  });
});

describe("SemanticRuntimeLspSession diagnostic receipt cache", () => {
  test("does not retain a proof when the final deferred effect closes the session", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    let session!: SemanticRuntimeLspSession;
    session = createSession(fixtureRoot, documents, async () => session.dispose());

    await expect(session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        operation.deferEffect({ kind: "log", level: "info", message: "accepted diagnostic" });
        return [];
      },
    )).rejects.toMatchObject({ reason: "stale" });

    const cache = Reflect.get(session, "diagnosticCache") as Map<string, unknown>;
    expect(cache.size).toBe(0);
  });

  test("absorbs a current completed proof, skips rendering, and rotates receipt ownership", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      const document = operation.documents.ensureProgramDocument(htmlUri);
      return [{ message: document?.getText() ?? "missing" }];
    });
    const dispose = vi.spyOn(ManagedSemanticWorkspaceOperationReceipt.prototype, "dispose");

    const first = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      render,
    );
    expect(first.kind).toBe("full");
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");

    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second).toEqual({ kind: "unchanged", resultId: first.resultId });
    expect(render).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledTimes(1);
    await session.dispose();
    expect(dispose).toHaveBeenCalledTimes(2);
    dispose.mockRestore();
  });

  test("recomputes when a mapping-only dependency changes outside the diagnostic URI", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    documents.add(TextDocument.create(tsUri, "typescript", 1, "export class App { value = 1; }"));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [{ message: operation.documents.lookupText(tsUri) ?? "missing" }];
    });

    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");
    documents.add(TextDocument.create(tsUri, "typescript", 2, "export class App { value = 2; }"));
    session.recordSourceTextChanged([tsPath]);

    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second.kind).toBe("full");
    expect(second.resultId).not.toBe(first.resultId);
    expect(render).toHaveBeenCalledTimes(2);
    await session.dispose();
  });

  test("reads and pull-validates external mapping sources without granting document ownership", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const externalRoot = fs.mkdtempSync(path.join(tmpdir(), "aurelia-ls-mapping-source-"));
    temporaryWorkspaceRoots.push(externalRoot);
    const externalPath = path.join(externalRoot, "lib.external.d.ts");
    const externalText = "interface ExternalSurface { readonly value: string; }\n";
    fs.writeFileSync(externalPath, externalText, "utf8");
    const externalUri = pathToFileURL(externalPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => [{
      text: operation.documents.lookupText(externalUri),
      authoredSnapshot: operation.documents.lookupDocumentSnapshot(externalUri),
      workspaceSnapshot: operation.documents.lookupWorkspaceDocumentSnapshot(externalUri),
    }]);

    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");

    expect(first.items).toEqual([{
      text: externalText,
      authoredSnapshot: null,
      workspaceSnapshot: null,
    }]);

    const changedExternalText = externalText.replace("string", "number");
    fs.writeFileSync(externalPath, changedExternalText, "utf8");
    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second.kind).toBe("full");
    if (second.kind !== "full") throw new Error("Expected an external-source change to force a full report.");
    expect(second.items).toEqual([{
      text: changedExternalText,
      authoredSnapshot: null,
      workspaceSnapshot: null,
    }]);
    expect(render).toHaveBeenCalledTimes(2);
    await session.dispose();
  });

  test("recomputes presentation when native-suppression language ownership changes", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const text = fs.readFileSync(htmlPath, "utf8");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "aurelia-html", 1, text));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => [{
      languageId: operation.documents.ensureProgramDocument(htmlUri)?.languageId,
    }]);

    const suppressed = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (suppressed.kind !== "full") throw new Error("Expected a full diagnostic report.");
    documents.add(TextDocument.create(htmlUri, "html", 1, text));

    const native = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, suppressed.resultId),
      render,
    );

    expect(native).toMatchObject({ kind: "full", items: [{ languageId: "html" }] });
    expect(native.resultId).not.toBe(suppressed.resultId);
    expect(render).toHaveBeenCalledTimes(2);
    await session.dispose();
  });

  test("evicts the directly changed URI and disposes its retained proof", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [];
    });
    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");
    const dispose = vi.spyOn(ManagedSemanticWorkspaceOperationReceipt.prototype, "dispose");

    session.recordSourceTextChanged([htmlPath]);
    expect(dispose).toHaveBeenCalledOnce();
    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second.kind).toBe("full");
    expect(render).toHaveBeenCalledTimes(2);
    dispose.mockRestore();
    await session.dispose();
  });

  test("keeps the accepted cache entry when a replacement renderer fails", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const text = fs.readFileSync(htmlPath, "utf8");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, text));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [];
    });
    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");

    documents.add(TextDocument.create(htmlUri, "html", 2, text));
    await expect(session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      () => { throw new Error("mapping failed"); },
    )).rejects.toThrow("mapping failed");
    documents.add(TextDocument.create(htmlUri, "html", 1, text));

    const recovered = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );
    expect(recovered).toEqual({ kind: "unchanged", resultId: first.resultId });
    expect(render).toHaveBeenCalledOnce();
    await session.dispose();
  });

  test("does not let an older concurrent completion replace a newer publication", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    let releaseFirst!: () => void;
    let announceFirst!: () => void;
    const firstEntered = new Promise<void>((resolve) => { announceFirst = resolve; });
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstRequest = session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      async (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        announceFirst();
        await firstGate;
        return [{ message: "older" }];
      },
    );
    await firstEntered;
    const newer = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        return [{ message: "newer" }];
      },
    );
    if (newer.kind !== "full") throw new Error("Expected a full diagnostic report.");
    releaseFirst();
    await firstRequest;
    const renderer = vi.fn(() => [{ message: "unexpected" }]);

    const current = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, newer.resultId),
      renderer,
    );

    expect(current).toEqual({ kind: "unchanged", resultId: newer.resultId });
    expect(renderer).not.toHaveBeenCalled();
    await session.dispose();
  });

  test("preserves open-document presentation URI, language, and version on managed text", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const canonicalUri = pathToFileURL(htmlPath).toString();
    const presentationUri = canonicalUri.replace("app.html", "app%2Ehtml");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(
      presentationUri,
      "aurelia-html",
      17,
      fs.readFileSync(htmlPath, "utf8"),
    ));
    const session = createSession(fixtureRoot, documents);

    const snapshot = await session.runRequest(null, (operation) =>
      operation.documents.lookupDocumentSnapshot(canonicalUri));

    expect(snapshot).toMatchObject({
      uri: presentationUri,
      languageId: "aurelia-html",
      version: 17,
    });
    await session.dispose();
  });

  test("bounds retained diagnostic proofs and evicts the least-recently published entry", async () => {
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());
    const publish = Reflect.get(session, "publishDiagnosticCacheEntry") as (
      cacheKey: string,
      entry: {
        documentKey: string;
        presentationKey: string;
        resultId: string;
        receipt: ManagedSemanticWorkspaceOperationReceipt;
        publishOrdinal: number;
      },
    ) => boolean;
    const cache = Reflect.get(session, "diagnosticCache") as Map<string, unknown>;
    const disposals = Array.from({ length: 258 }, () => vi.fn());
    const entry = (index: number) => ({
      documentKey: `document-${index}`,
      presentationKey: `presentation-${index}`,
      resultId: `result-${index}`,
      receipt: {
        analysisBasis: { revision: `basis-${index}` },
        dispose: disposals[index],
      } as unknown as ManagedSemanticWorkspaceOperationReceipt,
      publishOrdinal: index + 1,
    });
    for (let index = 0; index < 256; index += 1) {
      publish.call(session, `cache-${index}`, entry(index));
    }
    publish.call(session, "cache-0", entry(256));
    publish.call(session, "cache-256", entry(257));

    expect(cache.size).toBe(256);
    expect(cache.has("cache-0")).toBe(true);
    expect(cache.has("cache-1")).toBe(false);
    expect(disposals[0]).toHaveBeenCalledOnce();
    expect(disposals[1]).toHaveBeenCalledOnce();
    await session.dispose();
  });
});

describe("drainSemanticRuntimePages", () => {
  test("conserves rows, open coverage, and non-page continuations until exhaustion", async () => {
    const inspectOpenSeams = continuation(
      InquiryContinuationKind.InspectOpenSeams,
      "Inspect the unresolved semantic evidence.",
    );
    const reroute = continuation(
      InquiryContinuationKind.Reroute,
      "Ask the owning semantic lane.",
    );
    const nextPage = continuation(
      InquiryContinuationKind.NextPage,
      "Continue paging.",
    );
    const answers = [
      rowPageAnswer(
        [1],
        null,
        "page-2",
        false,
        [nextPage, inspectOpenSeams],
        standardOpenAxes,
      ),
      rowPageAnswer(
        [2],
        "page-2",
        "page-3",
        false,
        [nextPage, inspectOpenSeams, reroute],
        standardOpenAxes,
      ),
      rowPageAnswer(
        [3],
        "page-3",
        null,
        true,
        [reroute],
        standardOpenAxes,
      ),
    ];
    const requestedCursors: (string | null | undefined)[] = [];
    let answerIndex = 0;
    let activeChecks = 0;

    const answer = await drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {
        activeChecks += 1;
      },
      readPage: (cursor) => {
        requestedCursors.push(cursor);
        return Promise.resolve(answers[answerIndex++]!);
      },
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({
        displayText: `${rows.length} row(s).`,
        rows,
      }),
    });

    expect(requestedCursors).toEqual([undefined, "page-2", "page-3"]);
    expect(activeChecks).toBe(6);
    expect(answer.value).toEqual({
      displayText: "3 row(s).",
      rows: [1, 2, 3],
    });
    expect(answer.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(answer.summary).toBe("Returned 3 test row(s).");
    expect(answer.page).toBeNull();
    expect(answer.continuations).toEqual([inspectOpenSeams, reroute]);
  });

  test.each([
    {
      axis: "result",
      nextAxes: {
        ...standardOpenAxes,
        result: SemanticRuntimeAnswerResult.Failed,
      },
    },
    {
      axis: "selection",
      nextAxes: {
        ...standardOpenAxes,
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
      },
    },
    {
      axis: "coverage",
      nextAxes: {
        ...standardOpenAxes,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    },
  ])("rejects $axis drift between pages", async ({ axis, nextAxes }) => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes),
      rowPageAnswer([2], "page-2", null, true, [], nextAxes),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(`changed test row ${axis} while paging`);
  });

  test("rejects a terminal page that has not reported exhaustion", async () => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(
        rowPageAnswer([1], null, null, false, [], standardOpenAxes),
      ),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("ended test row paging before reporting exhaustion");
  });

  test("preserves semantic answer context when a row query returns a non-row value", async () => {
    const malformed = {
      ...rowPageAnswer([], null, null, true, [], standardOpenAxes),
      result: SemanticRuntimeAnswerResult.Failed,
      summary: "The query supplied an unsupported sourceFile axis.",
      value: { displayText: "No row result." },
    } as unknown as SemanticRuntimeAnswer<TestRowPageValue>;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(malformed),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(
      "returned test row without a row collection (result=failed; selection=exact; coverage=open): "
      + "The query supplied an unsupported sourceFile axis.",
    );
  });

  test("rejects an exhausted page that advertises another cursor", async () => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(
        rowPageAnswer([1], null, "page-2", true, [], standardOpenAxes),
      ),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("reported an exhausted test row page with a next cursor");
  });

  test("rejects a repeated continuation cursor", async () => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes),
      rowPageAnswer([2], "page-2", "page-2", false, [], standardOpenAxes),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("repeated a test row page cursor");
  });

  test.each([
    {
      name: "cursor",
      mutate: (answer: SemanticRuntimeAnswer<TestRowPageValue>) => ({
        ...answer,
        page: { ...answer.page!, cursor: "wrong-page" },
      }),
      message: "page metadata for a different cursor",
    },
    {
      name: "returned row count",
      mutate: (answer: SemanticRuntimeAnswer<TestRowPageValue>) => ({
        ...answer,
        page: { ...answer.page!, returnedRows: 2 },
      }),
      message: "reported 2 test row row(s) but returned 1",
    },
  ])("rejects inconsistent $name metadata", async ({ mutate, message }) => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(mutate(
        rowPageAnswer([1], null, null, true, [], standardOpenAxes, 1),
      )),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(message);
  });

  test("rejects total-row drift between pages", async () => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes, 2),
      rowPageAnswer([2], "page-2", null, true, [], standardOpenAxes, 3),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("changed test row total rows while paging");
  });
});

interface TestRowPageValue {
  readonly displayText: string;
  readonly rows: readonly number[];
}

type TestAnswerAxes = Pick<
  SemanticRuntimeAnswer<TestRowPageValue>,
  "result" | "selection" | "coverage"
>;

const standardOpenAxes: TestAnswerAxes = {
  result: SemanticRuntimeAnswerResult.Answered,
  selection: SemanticRuntimeAnswerSelection.Exact,
  coverage: SemanticRuntimeAnswerCoverage.Open,
};

function rowPageAnswer(
  rows: readonly number[],
  cursor: string | null,
  nextCursor: string | null,
  exhausted: boolean,
  continuations: readonly SemanticRuntimeContinuationRow[],
  axes: TestAnswerAxes,
  totalRows = 3,
): SemanticRuntimeAnswer<TestRowPageValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    ...axes,
    summary: `${rows.length} test row(s).`,
    value: {
      displayText: `${rows.length} test row(s).`,
      rows,
    },
    page: {
      size: 1,
      cursor,
      nextCursor,
      returnedRows: rows.length,
      totalRows,
      exhausted,
    },
    continuations,
  };
}

function analysisLimitationsPage(
  projectKey: string,
  rows: SemanticAnalysisLimitationsResult["rows"],
  cursor: string | null,
  nextCursor: string | null,
  exhausted: boolean,
): SemanticRuntimeAnswer<SemanticAnalysisLimitationsResult> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    result: SemanticRuntimeAnswerResult.Answered,
    selection: SemanticRuntimeAnswerSelection.Exact,
    coverage: SemanticRuntimeAnswerCoverage.Open,
    summary: `${rows.length} analysis limitation row(s).`,
    value: {
      projectKey,
      policyFile: {
        filePath: path.join(minimalFixtureRoot(), "aurelia.project.json"),
        exists: false,
      },
      effectivePolicies: [],
      candidateCount: 2,
      suppressedCandidateCount: 0,
      displayText: exhausted
        ? "Terminal page text must not leak."
        : "First page text must not become the collection answer.",
      rows,
    },
    page: {
      size: 500,
      cursor,
      nextCursor,
      returnedRows: rows.length,
      totalRows: 2,
      exhausted,
    },
    continuations: [],
  };
}

function continuation(
  kind: InquiryContinuationKind,
  rationale: string,
): SemanticRuntimeContinuationRow {
  return {
    kind,
    rationale,
    intents: [],
    cost: null,
    evidence: null,
    blockers: [],
  };
}

interface AcceptanceTopologyWorkspace {
  readonly workspaceRoot: string;
  readonly overlapRoot: string;
  readonly descriptorPath: string;
  readonly descriptor: SemanticWorkspaceDescriptor;
}

interface StateCandidateTopologyWorkspace {
  readonly workspaceRoot: string;
  readonly descriptorPath: string;
}

function createNavigationMutationTopologyWorkspace(): AcceptanceTopologyWorkspace {
  const semanticRuntimePackageRoot = path.resolve(
    fileURLToPath(new URL("../../../semantic-runtime", import.meta.url)),
  );
  const workspaceRoot = fs.mkdtempSync(path.join(
    semanticRuntimePackageRoot,
    ".resource-discovery-host-navigation-",
  ));
  temporaryWorkspaceRoots.push(workspaceRoot);
  generateLongSuffixDuplicateInputs(workspaceRoot);
  const overlapRoot = path.join(workspaceRoot, "host-corpus", "overlap");
  fs.mkdirSync(overlapRoot, { recursive: true });
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot,
    projects: [{
      rootDir: workspaceRoot,
      projectKey: "host-alpha",
      sourceFiles: acceptanceSourceFiles(workspaceRoot),
    }],
  });
  const descriptorPath = path.join(workspaceRoot, "semantic-workspace.json");
  writeAcceptanceDescriptor(descriptorPath, descriptor);
  return { workspaceRoot, overlapRoot, descriptorPath, descriptor };
}

function createMetadataStateTopologyWorkspace(): AcceptanceTopologyWorkspace {
  const semanticRuntimePackageRoot = path.resolve(
    fileURLToPath(new URL("../../../semantic-runtime", import.meta.url)),
  );
  const workspaceRoot = fs.mkdtempSync(path.join(
    semanticRuntimePackageRoot,
    ".resource-discovery-host-metadata-",
  ));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const localRoot = path.join(workspaceRoot, "host-corpus", "effective-definitions");
  copyPressureFixtureInputs(
    path.join(
      semanticRuntimePackageRoot,
      "fixtures",
      "pressure",
      "resource-registration-effective-definitions",
    ),
    localRoot,
  );
  const overlapRoot = path.join(workspaceRoot, "host-corpus", "overlap");
  fs.mkdirSync(overlapRoot, { recursive: true });
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot,
    projects: [{
      rootDir: workspaceRoot,
      projectKey: "host-alpha",
      sourceFiles: acceptanceSourceFiles(workspaceRoot),
    }],
  });
  const descriptorPath = path.join(workspaceRoot, "semantic-workspace.json");
  writeAcceptanceDescriptor(descriptorPath, descriptor);
  return { workspaceRoot, overlapRoot, descriptorPath, descriptor };
}

async function captureOverlapPreflightFacts(
  topology: AcceptanceTopologyWorkspace,
): Promise<unknown> {
  stubAcceptanceTopologyEnvironment(topology.descriptorPath);
  const templatePath = path.join(topology.overlapRoot, "src", "shared-plugin-app.html");
  const templateText = fs.readFileSync(templatePath, "utf8");
  const templateUri = pathToFileURL(templatePath).toString();
  const templateDocument = TextDocument.create(templateUri, "html", 1, templateText);
  const session = createSession(topology.workspaceRoot, new TestDocumentStore());
  try {
    return await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const owners = await operation.projectsOwningDocument(templateDocument, summary.value.appCandidates);
      const position = positionAfter(templateText, "<template>");
      return await Promise.all(owners.map(async (owner) => {
        const ambiguous = await operation.templateResourceAvailability(
          owner.projectKey,
          templateUri,
          position,
          null,
        );
        const selected = await Promise.all(ambiguous.value.candidates.map((candidate) =>
          operation.templateResourceAvailability(
            owner.projectKey,
            templateUri,
            position,
            candidate.scopeIdentityKey,
          )));
        return {
          projectKey: owner.projectKey,
          candidates: ambiguous.value.candidates.map((candidate) => ({
            templateIdentityKey: candidate.templateIdentityKey,
            scopeIdentityKey: candidate.scopeIdentityKey,
            definitionName: candidate.definitionName,
            compilationLane: candidate.compilationLane,
            source: {
              path: candidate.source.path,
              start: candidate.source.start,
              end: candidate.source.end,
            },
          })),
          selected: selected.map((answer) => ({
            selection: answer.selection,
            scopeIdentityKey: answer.value.selectedTemplate?.scopeIdentityKey,
            resourceIdentityKeys: answer.value.rows.map((row) => row.resource.identityKey),
            ...mappedAvailabilityNavigationFacts(answer.value.rows, topology.workspaceRoot),
          })),
        };
      }));
    });
  } finally {
    await session.dispose();
  }
}

function createOverlapStabilityTopologyWorkspace(): AcceptanceTopologyWorkspace {
  const semanticRuntimePackageRoot = path.resolve(
    fileURLToPath(new URL("../../../semantic-runtime", import.meta.url)),
  );
  const workspaceRoot = fs.mkdtempSync(path.join(
    semanticRuntimePackageRoot,
    ".resource-discovery-host-overlap-stability-",
  ));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const overlapRoot = path.join(workspaceRoot, "host-corpus", "overlap");
  copyPressureFixtureInputs(
    path.join(
      semanticRuntimePackageRoot,
      "fixtures",
      "pressure",
      "plugin-capability-app-root-isolation",
    ),
    overlapRoot,
  );
  const overlapSources = acceptanceSourceFiles(overlapRoot);
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot,
    projects: [
      { rootDir: workspaceRoot, projectKey: "host-alpha", sourceFiles: overlapSources },
      { rootDir: workspaceRoot, projectKey: "host-beta", sourceFiles: overlapSources },
    ],
  });
  const descriptorPath = path.join(workspaceRoot, "semantic-workspace.json");
  writeAcceptanceDescriptor(descriptorPath, descriptor);
  return { workspaceRoot, overlapRoot, descriptorPath, descriptor };
}

function createStateCandidateTopologyWorkspace(): StateCandidateTopologyWorkspace {
  const semanticRuntimePackageRoot = path.resolve(
    fileURLToPath(new URL("../../../semantic-runtime", import.meta.url)),
  );
  const workspaceRoot = fs.mkdtempSync(path.join(
    semanticRuntimePackageRoot,
    ".resource-discovery-host-states-",
  ));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const emptyRoot = path.join(workspaceRoot, "host-corpus", "empty");
  fs.mkdirSync(emptyRoot, { recursive: true });
  writeTextFile(path.join(emptyRoot, "package.json"), "{\"name\":\"host-empty\"}\n");
  writeTextFile(path.join(emptyRoot, "aurelia.project.json"), "{\"version\":1}\n");
  const guardrailRoot = generateGuardrailInputs(workspaceRoot);
  const openRoot = generateOpenCoverageInputs(workspaceRoot);
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot,
    projects: [
      {
        rootDir: emptyRoot,
        projectKey: "host-empty",
        sourceDiscoveryOptions: {
          extensions: new Set([".ts"]),
        },
      },
      {
        rootDir: guardrailRoot,
        projectKey: "host-guardrail",
        sourceDiscoveryOptions: {
          extensions: new Set([".ts"]),
          maxFiles: 1,
        },
      },
      {
        rootDir: openRoot,
        projectKey: "host-open",
        sourceFiles: [{ path: path.join(openRoot, "src", "a-main.ts") }],
      },
    ],
  });
  const descriptorPath = path.join(workspaceRoot, "semantic-workspace.json");
  writeAcceptanceDescriptor(descriptorPath, descriptor);
  return { workspaceRoot, descriptorPath };
}

function createAcceptanceTopologyWorkspace(
  includeOverlap = false,
): AcceptanceTopologyWorkspace {
  const semanticRuntimePackageRoot = path.resolve(
    fileURLToPath(new URL("../../../semantic-runtime", import.meta.url)),
  );
  const workspaceRoot = fs.mkdtempSync(path.join(
    semanticRuntimePackageRoot,
    ".resource-discovery-host-topology-",
  ));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const overlapRoot = path.join(workspaceRoot, "host-corpus", "overlap");
  fs.mkdirSync(overlapRoot, { recursive: true });
  if (includeOverlap) {
    const pressureRoot = path.join(semanticRuntimePackageRoot, "fixtures", "pressure");
    copyPressureFixtureInputs(
      path.join(pressureRoot, "app-pattern-routed-catalog-storefront"),
      workspaceRoot,
    );
    copyPressureFixtureInputs(
      path.join(pressureRoot, "resource-registration-local-templates"),
      path.join(workspaceRoot, "host-corpus", "local-templates"),
    );
    copyPressureFixtureInputs(
      path.join(pressureRoot, "plugin-capability-app-root-isolation"),
      overlapRoot,
    );
    copyPressureFixtureInputs(
      path.join(pressureRoot, "resource-registration-duplicates"),
      path.join(workspaceRoot, "host-corpus", "duplicates"),
    );
    copyPressureFixtureInputs(
      path.join(pressureRoot, "resource-registration-effective-definitions"),
      path.join(workspaceRoot, "host-corpus", "effective-definitions"),
    );
    generateLongSuffixDuplicateInputs(workspaceRoot);
    generatePackageOriginInputs(workspaceRoot, semanticRuntimePackageRoot);
    generatePageDrainInputs(workspaceRoot);
    generateGuardrailInputs(workspaceRoot);
    generateOpenCoverageInputs(workspaceRoot);
  } else {
    fs.mkdirSync(path.join(overlapRoot, "src"), { recursive: true });
    fs.writeFileSync(path.join(overlapRoot, "src", "main.ts"), "export const admitted = true;\n", "utf8");
  }
  const guardrailRoot = path.join(workspaceRoot, "host-corpus", "guardrail");
  const openRoot = path.join(workspaceRoot, "host-corpus", "open");
  const alphaSourceFiles = acceptanceSourceFiles(workspaceRoot, [
    "host-corpus/guardrail/",
    "host-corpus/open/",
  ]);
  const betaSourceFiles = acceptanceSourceFiles(overlapRoot);
  const excludedSourceRoots = [
    path.join(workspaceRoot, ".host-packages"),
    guardrailRoot,
    openRoot,
    path.join(workspaceRoot, "host-corpus", "package-origin", "app", "node_modules"),
  ];
  const projects = [
    {
      rootDir: workspaceRoot,
      projectKey: "host-alpha",
      sourceFiles: alphaSourceFiles,
      excludedSourceRoots,
    },
    {
      rootDir: workspaceRoot,
      projectKey: "host-beta",
      sourceFiles: betaSourceFiles,
    },
    {
      rootDir: guardrailRoot,
      projectKey: "host-guardrail",
      sourceDiscoveryOptions: {
        extensions: new Set([".ts"]),
        maxFiles: 1,
      },
    },
    {
      rootDir: openRoot,
      projectKey: "host-open",
      sourceFiles: [{ path: path.join(openRoot, "src", "a-main.ts") }],
    },
  ];
  const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
    workspaceRoot,
    projects,
  });
  const descriptorPath = path.join(workspaceRoot, "semantic-workspace.json");
  writeAcceptanceDescriptor(descriptorPath, descriptor);
  return { workspaceRoot, overlapRoot, descriptorPath, descriptor };
}

function copyPressureFixtureInputs(sourceRoot: string, destinationRoot: string): void {
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const fileName of ["package.json", "tsconfig.json"]) {
    const sourcePath = path.join(sourceRoot, fileName);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, path.join(destinationRoot, fileName));
    }
  }
  fs.cpSync(path.join(sourceRoot, "src"), path.join(destinationRoot, "src"), { recursive: true });
}

function generateLongSuffixDuplicateInputs(workspaceRoot: string): void {
  const longScentRoot = path.join(workspaceRoot, "host-corpus", "long-scent");
  const duplicateSource = (className: string, marker: string): string => [
    "import { customElement } from 'aurelia';",
    "",
    "@customElement({",
    "  name: 'duplicate-card',",
    `  template: '<template>${marker}</template>',`,
    "})",
    `export class ${className} {}`,
    "",
  ].join("\n");
  writeTextFile(
    path.join(longScentRoot, "left", "shared", "duplicate-card.ts"),
    duplicateSource("LeftLongSuffixDuplicateCard", "left-long-suffix"),
  );
  writeTextFile(
    path.join(longScentRoot, "right", "shared", "duplicate-card.ts"),
    duplicateSource("RightLongSuffixDuplicateCard", "right-long-suffix"),
  );
  writeTextFile(path.join(longScentRoot, "src", "main.ts"), [
    "import Aurelia, { customElement } from 'aurelia';",
    "import { LeftLongSuffixDuplicateCard } from '../left/shared/duplicate-card';",
    "import { RightLongSuffixDuplicateCard } from '../right/shared/duplicate-card';",
    "",
    "@customElement({",
    "  name: 'long-suffix-app',",
    "  template: '<duplicate-card></duplicate-card>',",
    "  dependencies: [LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard],",
    "})",
    "export class LongSuffixApp {}",
    "",
    "Aurelia",
    "  .register(LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard)",
    "  .app(LongSuffixApp)",
    "  .start();",
    "",
  ].join("\n"));
}

function generatePackageOriginInputs(
  workspaceRoot: string,
  semanticRuntimePackageRoot: string,
): void {
  const appRoot = path.join(workspaceRoot, "host-corpus", "package-origin", "app");
  const installedRoot = path.join(
    appRoot,
    "node_modules",
    "@acme",
    "installed-resource-kit",
  );
  const linkedPhysicalRoot = path.join(workspaceRoot, ".host-packages", "linked-resource-kit");
  const linkedLogicalRoot = path.join(
    appRoot,
    "node_modules",
    "@acme",
    "linked-resource-kit",
  );
  writeTextFile(path.join(appRoot, "package.json"), `${JSON.stringify({
    name: "host-package-origin-app",
    private: true,
    dependencies: {
      "@acme/installed-resource-kit": "0.0.0",
      "@acme/linked-resource-kit": "0.0.0",
      "@aurelia/runtime-html": "2.0.0",
    },
  }, null, 2)}\n`);
  writeTextFile(path.join(appRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    files: ["src/main.ts"],
  }, null, 2)}\n`);
  writeTextFile(path.join(appRoot, "src", "main.ts"), [
    "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
    "import { InstalledPackageCard } from '@acme/installed-resource-kit';",
    "import { LinkedPackageCard } from '@acme/linked-resource-kit';",
    "",
    "@customElement({",
    "  name: 'package-origin-app',",
    "  template: '<installed-package-card></installed-package-card><linked-package-card></linked-package-card>',",
    "  dependencies: [InstalledPackageCard, LinkedPackageCard],",
    "})",
    "export class PackageOriginApp {}",
    "",
    "new Aurelia()",
    "  .register(StandardConfiguration)",
    "  .app({ host: document.body, component: PackageOriginApp })",
    "  .start();",
    "",
  ].join("\n"));
  generateResourcePackage(
    installedRoot,
    "@acme/installed-resource-kit",
    "installed-package-card",
    "InstalledPackageCard",
  );
  generateResourcePackage(
    linkedPhysicalRoot,
    "@acme/linked-resource-kit",
    "linked-package-card",
    "LinkedPackageCard",
  );
  fs.mkdirSync(path.dirname(linkedLogicalRoot), { recursive: true });
  fs.symlinkSync(
    linkedPhysicalRoot,
    linkedLogicalRoot,
    process.platform === "win32" ? "junction" : "dir",
  );
  const aureliaNamespaceRoot = path.join(appRoot, "node_modules", "@aurelia");
  fs.mkdirSync(aureliaNamespaceRoot, { recursive: true });
  fs.symlinkSync(
    path.join(semanticRuntimePackageRoot, "node_modules", "@aurelia", "runtime-html"),
    path.join(aureliaNamespaceRoot, "runtime-html"),
    process.platform === "win32" ? "junction" : "dir",
  );
}

function generatePageDrainInputs(workspaceRoot: string): void {
  const resources = Array.from({ length: 501 }, (_, index) => {
    const suffix = index.toString().padStart(3, "0");
    return {
      className: `PageDrainResource${suffix}`,
      resourceName: `page-drain-${suffix}`,
    };
  });
  writeTextFile(path.join(workspaceRoot, "host-corpus", "page-drain", "src", "main.ts"), [
    "import Aurelia, { customElement } from 'aurelia';",
    "",
    ...resources.flatMap(({ className, resourceName }) => [
      `@customElement({ name: '${resourceName}', template: '<template>${resourceName}</template>' })`,
      `export class ${className} {}`,
      "",
    ]),
    "@customElement({ name: 'page-drain-app', template: '<template>page drain</template>' })",
    "export class PageDrainApp {}",
    "",
    "Aurelia",
    "  .register(",
    ...resources.map(({ className }) => `    ${className},`),
    "  )",
    "  .app(PageDrainApp)",
    "  .start();",
    "",
  ].join("\n"));
}

function generateGuardrailInputs(workspaceRoot: string): string {
  const guardrailRoot = path.join(workspaceRoot, "host-corpus", "guardrail");
  writeTextFile(path.join(guardrailRoot, "package.json"), "{\"name\":\"host-guardrail\"}\n");
  writeTextFile(path.join(guardrailRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    include: ["src/**/*.ts"],
  }, null, 2)}\n`);
  writeTextFile(path.join(guardrailRoot, "src", "a-main.ts"), [
    "import Aurelia, { customElement } from 'aurelia';",
    "",
    "@customElement({ name: 'guardrail-app', template: '<template>guardrail</template>' })",
    "export class GuardrailApp {}",
    "",
    "Aurelia.app(GuardrailApp).start();",
    "",
  ].join("\n"));
  writeTextFile(
    path.join(guardrailRoot, "src", "z-over-limit.ts"),
    [
      "import { customElement } from 'aurelia';",
      "",
      "@customElement({ name: 'over-limit', template: '<template>over limit</template>' })",
      "export class OverLimit {}",
      "",
    ].join("\n"),
  );
  return guardrailRoot;
}

function generateOpenCoverageInputs(workspaceRoot: string): string {
  const openRoot = path.join(workspaceRoot, "host-corpus", "open");
  writeTextFile(path.join(openRoot, "package.json"), "{\"name\":\"host-open\"}\n");
  writeTextFile(path.join(openRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    files: ["src/a-main.ts"],
  }, null, 2)}\n`);
  writeTextFile(path.join(openRoot, "src", "a-main.ts"), [
    "import Aurelia, { customElement } from 'aurelia';",
    "import './missing-resource';",
    "",
    "@customElement({ name: 'open-coverage-app', template: '<template>open</template>' })",
    "export class OpenCoverageApp {}",
    "",
    "Aurelia.app(OpenCoverageApp).start();",
    "",
  ].join("\n"));
  return openRoot;
}

function generateResourcePackage(
  packageRoot: string,
  packageName: string,
  resourceName: string,
  className: string,
): void {
  writeTextFile(path.join(packageRoot, "package.json"), `${JSON.stringify({
    name: packageName,
    version: "0.0.0",
    type: "module",
    exports: {
      ".": {
        types: "./src/index.ts",
        import: "./src/index.ts",
      },
    },
  }, null, 2)}\n`);
  writeTextFile(path.join(packageRoot, "src", "index.ts"), [
    "import { customElement } from '@aurelia/runtime-html';",
    "",
    `@customElement({ name: '${resourceName}', template: '<span>${resourceName}</span>' })`,
    `export class ${className} {}`,
    "",
  ].join("\n"));
}

function writeTextFile(filePath: string, text: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function acceptanceSourceFiles(
  root: string,
  excludedRelativePrefixes: readonly string[] = [],
): readonly { readonly path: string }[] {
  return fs.readdirSync(root, { recursive: true })
    .map((entry) => path.join(root, entry.toString()))
    .filter((entry) => {
      const relative = path.relative(root, entry).replace(/\\/g, "/");
      return !relative.startsWith(".host-packages/")
        && !relative.includes("/node_modules/")
        && !excludedRelativePrefixes.some((prefix) => relative.startsWith(prefix))
        && fs.statSync(entry).isFile()
        && /\.(?:html|ts)$/u.test(entry);
    })
    .sort((left, right) => left.localeCompare(right))
    .map((sourcePath) => ({ path: sourcePath }));
}

function writeAcceptanceDescriptor(
  descriptorPath: string,
  descriptor: SemanticWorkspaceDescriptor,
): void {
  fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
}

function acceptanceTopologyEnvironment(
  descriptorPath: string,
): Readonly<Record<string, string>> {
  return {
    [EXTENSION_HOST_OBSERVATION_ENVIRONMENT]: "1",
    [RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT]: "1",
    [RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT]: descriptorPath,
  };
}

function stubAcceptanceTopologyEnvironment(descriptorPath: string): void {
  for (const [name, value] of Object.entries(acceptanceTopologyEnvironment(descriptorPath))) {
    vi.stubEnv(name, value);
  }
}

function minimalFixtureRoot(): string {
  const packageRoot = path.resolve(
    fileURLToPath(new URL("../..", import.meta.url)),
  );
  return path.resolve(
    packageRoot,
    "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
  );
}

function createSession(
  workspaceRoot: string,
  documents: OpenTextDocumentStore,
  publishEffect: (effect: unknown) => void | PromiseLike<void> = () => undefined,
  beforeHostOperation: (() => void) | null = null,
): SemanticRuntimeLspSession {
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(workspaceRoot).toString());
  const sourceTextOverlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
  return new SemanticRuntimeLspSession({
    documentUris,
    projectInputHost: new NodeSemanticRuntimeProjectInputHost(
      sourceTextOverlay,
      beforeHostOperation,
    ),
    projectInputCurrentnessPolicy: sourceTextOverlay,
    openDocumentMetadata: (uri) => {
      const document = sourceTextOverlay.openDocument(uri);
      return document == null
        ? null
        : {
            uri: document.uri,
            languageId: document.languageId,
            version: document.version,
          };
    },
    publishEffect,
  });
}

interface LspMarkerSnapshot {
  readonly generation: SemanticRuntimeLspGeneration;
  readonly summary: SemanticRuntimeAnswer<SemanticRuntimeSummary>;
  readonly ownership: SemanticRuntimeAnswer<SemanticAuthoredSourceOwnershipResult>;
}

async function captureMarkerSnapshot(
  session: SemanticRuntimeLspSession,
  sourceUri: string,
): Promise<LspMarkerSnapshot> {
  return session.runRequest(null, async (operation) => ({
    generation: operation.generation,
    summary: await operation.workspaceSummary(),
    ownership: await operation.authoredSourceOwnership(sourceUri),
  }));
}

function createNestedMarkerWorkspace(): {
  readonly workspaceRoot: string;
  readonly nestedRoot: string;
  readonly nestedSourcePath: string;
  readonly markerPath: string;
} {
  const workspaceRoot = fs.mkdtempSync(path.join(tmpdir(), "aurelia-lsp-marker-"));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const nestedRoot = path.join(workspaceRoot, "packages", "feature");
  const nestedSourcePath = path.join(nestedRoot, "src", "feature.ts");
  const markerPath = path.join(nestedRoot, "package.json");
  fs.mkdirSync(path.dirname(nestedSourcePath), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, "package.json"), '{"name":"marker-workspace"}\n', "utf8");
  fs.writeFileSync(path.join(workspaceRoot, "src", "main.ts"), "export const main = true;\n", "utf8");
  fs.writeFileSync(nestedSourcePath, "export const feature = true;\n", "utf8");
  return { workspaceRoot, nestedRoot, nestedSourcePath, markerPath };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function yieldTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function captureThrown(callback: () => unknown): unknown {
  try {
    callback();
    return null;
  } catch (error) {
    return error;
  }
}

function diagnosticRequest(
  uri: string,
  previousResultId: string | null = null,
) {
  return {
    uri,
    identifier: "aurelia",
    previousResultId,
    projectionKey: "test-diagnostic-projection/v1",
  };
}

function positionAfter(
  text: string,
  marker: string,
): { line: number; character: number } {
  const offset = text.indexOf(marker) + marker.length;
  expect(offset).toBeGreaterThanOrEqual(marker.length);
  return TextDocument.create("memory://position", "html", 0, text).positionAt(
    offset,
  );
}
