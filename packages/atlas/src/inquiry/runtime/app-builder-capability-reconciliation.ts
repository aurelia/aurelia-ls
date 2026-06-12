import { uniqueSortedStrings } from "../../collections.js";
import type { SourceProject } from "../../source/index.js";
import ts from "typescript";
import {
  FRAMEWORK_CAPABILITY_ROWS,
  FrameworkCapabilityLocality,
  type FrameworkCapabilityRequirementRef,
  type FrameworkCapabilityRow,
} from "./framework-capability-lenses.js";

/**
 * Dev-time reconciliation between the semantic-runtime app-builder Aurelia lowering
 * axes and the Atlas framework capability terrain.
 *
 * This is the "policyful bridge" conformance instrument: app-builder authors the
 * lowering axes (judgement about which framework-valid realizations a generated app
 * should expose), and this module checks that authored bridge against the neutral
 * framework terrain. It is intentionally Atlas-only and source-of-truth-free: the
 * capability terrain stays the framework authority, the app-builder axes stay the
 * product authority, and nothing here is imported by semantic-runtime at runtime.
 *
 * The axis/value spine below is hand-mirrored from
 * `packages/semantic-runtime/src/app-builder/aurelia-lowering-option.ts`. Locality,
 * exclusivity, and prerequisites are NOT mirrored; they are joined live from the
 * capability rows so terrain drift (a cited capability id disappearing) surfaces
 * immediately. Mechanized drift detection against the live semantic-runtime enum
 * members is a deliberate follow-on; today the spine is reviewed by hand.
 */

/** Whether an app-builder lowering axis is a single exclusive choice or a stackable set. */
export const enum AppBuilderAxisCardinality {
  /** One mutually-exclusive value per subject (a scalar selection field). */
  Scalar = "scalar",
  /** A stackable set of independently selectable values (an array selection field). */
  Stackable = "stackable",
}

/** How a lowering-axis value relates to the framework terrain (Codex's three source roles). */
export const enum AppBuilderAxisSourceRole {
  /** The framework forces this; the terrain's locality/exclusivity/requires govern it. */
  FrameworkConstraint = "framework-constraint",
  /** A choice among framework-valid realizations; app-builder owns the policy. */
  AppBuilderPolicy = "app-builder-policy",
  /** Reduces generated file/boilerplate cost while staying idiomatic. */
  SourceEconomy = "source-economy",
}

/** How strongly an app-builder/capability reconciliation finding should steer follow-up work. */
export const enum AppBuilderReconciliationFindingSeverity {
  /** A missing or contradictory fact that likely needs source correction. */
  Risk = "risk",
  /** A modeling choice that is legal but should remain visible to reviewers. */
  Review = "review",
  /** A named, expected distinction that should not drive cleanup by itself. */
  Information = "information",
}

/** Kind of reconciliation finding raised while joining app-builder axes to framework terrain. */
export const enum AppBuilderReconciliationFindingKind {
  /** The axis bundles values of more than one source role (a potential conflation canary). */
  MixedSourceRole = "mixed-source-role",
  /** The axis's grounded capabilities span more than one framework locality. */
  ScopeSpread = "scope-spread",
  /** At least one value grounds in no capability because it names app-builder policy/taste. */
  TasteOnlyValuesPresent = "taste-only-values-present",
  /** At least one value cites a capability id that no longer exists in the terrain. */
  CitesMissingCapability = "cites-missing-capability",
}

/** Authored mapping of one lowering-axis value to the framework capabilities it realizes. */
export interface AppBuilderLoweringValueMap {
  /** Enum string value from the semantic-runtime lowering axis. */
  readonly valueId: string;
  /** Human-readable value label. */
  readonly title: string;
  /** Cited capability terrain ids this value realizes; empty means pure policy/taste. */
  readonly capabilityIds: readonly string[];
  /** Whether this value is framework-forced, app-builder policy, or source economy. */
  readonly sourceRole: AppBuilderAxisSourceRole;
  /** Reviewer rationale for the mapping or a known nuance. */
  readonly note?: string;
}

/** Authored mapping of one lowering axis to its values. */
export interface AppBuilderLoweringAxisMap {
  /** Enum string id of the semantic-runtime lowering axis. */
  readonly axisId: string;
  /** Human-readable axis label. */
  readonly title: string;
  /** Scalar (exclusive) vs stackable (set) selection shape, from the selection type. */
  readonly cardinality: AppBuilderAxisCardinality;
  /** The scope app-builder intends for the axis, for contrast against terrain locality. */
  readonly declaredScope: FrameworkCapabilityLocality;
  /** The axis's values. */
  readonly values: readonly AppBuilderLoweringValueMap[];
}

/**
 * Authored axis/value spine. Mirrored from aurelia-lowering-option.ts as of 2026-05-30.
 * Capability ids are cited, not duplicated: structure is joined from the live terrain.
 */
export const APP_BUILDER_LOWERING_AXIS_MAPS: readonly AppBuilderLoweringAxisMap[] = [
  {
    axisId: "app-convention-policy",
    title: "App Convention Policy",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "conventions-enabled",
        title: "Conventions Enabled",
        capabilityIds: ["resource-source:convention"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "App-global posture that admits the convention source form; the terrain models convention as a resource-local source form, so app-builder elevates it to a generated-code policy.",
      },
      {
        valueId: "explicit-resource-declarations",
        title: "Explicit Resource Declarations",
        capabilityIds: ["resource-source:decorator", "resource-source:static-au", "resource-source:define-call"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Prefer non-convention source forms app-wide; the specific carrier is the separate resource-carrier axis.",
      },
    ],
  },
  {
    axisId: "resource-kind",
    title: "Resource Kind",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "custom-element",
        title: "Custom Element",
        capabilityIds: ["resource:custom-element"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Mirrors resources/ResourceDefinitionKind.CustomElement; the only kind current generated app source targets.",
      },
      {
        valueId: "custom-attribute",
        title: "Custom Attribute",
        capabilityIds: ["resource:custom-attribute"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "template-controller",
        title: "Template Controller",
        capabilityIds: ["resource:template-controller"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "value-converter",
        title: "Value Converter",
        capabilityIds: ["resource:value-converter"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "binding-behavior",
        title: "Binding Behavior",
        capabilityIds: ["resource:binding-behavior"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "binding-command",
        title: "Binding Command",
        capabilityIds: ["resource:binding-command"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "attribute-pattern",
        title: "Attribute Pattern",
        capabilityIds: ["resource:attribute-pattern"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
    ],
  },
  {
    axisId: "resource-carrier",
    title: "Resource Carrier",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "convention",
        title: "Convention",
        capabilityIds: ["resource-source:convention"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Establishment by naming/file convention; gated app-wide by app-convention-policy but composes per-resource with explicit carriers.",
      },
      {
        valueId: "decorator",
        title: "Decorator",
        capabilityIds: ["resource-source:decorator"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "static-$au",
        title: "Static $au",
        capabilityIds: ["resource-source:static-au"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Absorbs the former static-resource-configuration surface: static establishment is a carrier, not a separate configuration axis.",
      },
      {
        valueId: "define-call",
        title: "Define Call",
        capabilityIds: ["resource-source:define-call"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "attribute-pattern-create",
        title: "Attribute Pattern Create",
        capabilityIds: ["resource-source:attribute-pattern-create"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Syntax-resource factory carrier; applies to the attribute-pattern kind.",
      },
    ],
  },
  {
    axisId: "custom-element-view-form",
    title: "Custom Element View Form",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "companion-file",
        title: "Companion File",
        capabilityIds: [],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Baseline write-model layout: template in a separate companion .html; compiles to the read-model CustomElementTemplateKind.Markup, so it has no distinct capability row. Custom-element-only.",
      },
      {
        valueId: "inline-markup",
        title: "Inline Markup",
        capabilityIds: ["resource:inline-custom-element"],
        sourceRole: AppBuilderAxisSourceRole.SourceEconomy,
        note: "Relocated former inline-custom-element value: a file/economy layout choice on its own axis instead of conflated with the carrier (the resolved resource-declaration canary). A template-less custom element is this value with empty/null markup.",
      },
    ],
  },
  {
    axisId: "app-state-ownership",
    title: "App State Ownership",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "di-state-class",
        title: "DI State Class",
        capabilityIds: ["di:resolve", "di:registration"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Default app architecture choice; DI is always available, so this is policy rather than admission.",
      },
      {
        valueId: "state-plugin-store",
        title: "State Plugin Store",
        capabilityIds: ["state:state-plugin-store"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Alternative architecture requiring @aurelia/state admission.",
      },
    ],
  },
  {
    axisId: "local-state-policy",
    title: "Local State Policy",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "view-model-local-state",
        title: "View-Model Local State",
        capabilityIds: ["observation:proxy-object", "observation:getter"],
        sourceRole: AppBuilderAxisSourceRole.SourceEconomy,
        note: "Compact local state observed on a view-model.",
      },
      {
        valueId: "view-model-local-collection",
        title: "View-Model Local Collection",
        capabilityIds: ["observation:collection", "template-controller:repeat"],
        sourceRole: AppBuilderAxisSourceRole.SourceEconomy,
        note: "Compact caller-supplied collection state observed on a view-model; separate from scalar field state so collection UIs do not grow unused local fields.",
      },
      {
        valueId: "bindable-pass-through",
        title: "Bindable Pass-Through",
        capabilityIds: ["resource:bindable"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
      },
    ],
  },
  {
    axisId: "domain-modeling",
    title: "Domain Modeling",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "plain-domain-composition",
        title: "Plain Domain Composition",
        capabilityIds: ["observation:proxy-object", "observation:getter"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Ordinary classes participate in observation; this is a modeling posture, not a framework constraint.",
      },
    ],
  },
  {
    axisId: "router-admission",
    title: "Router Admission",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "no-router",
        title: "No Router",
        capabilityIds: [],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "The absence of router:admission; a deliberate policy choice with no capability of its own.",
      },
      {
        valueId: "router-configuration",
        title: "Router Configuration",
        capabilityIds: ["router:admission"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Admits router:admission, the prerequisite for all other router:* capabilities.",
      },
    ],
  },
  {
    axisId: "area-navigation-policy",
    title: "Area Navigation Policy",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.AreaLocal,
    values: [
      {
        valueId: "binding-driven-view-selection",
        title: "Binding-Driven View Selection",
        capabilityIds: ["template-controller:if-else", "template-controller:switch"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Swap local views with control-flow controllers and state instead of routing.",
      },
      {
        valueId: "router-driven-view-selection",
        title: "Router-Driven View Selection",
        capabilityIds: ["router:au-viewport", "router:navigation-instructions", "router:routeable-component"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Once chosen, forces viewport/routeable semantics and requires router:admission; app-builder hand-codes that cascade in the selection.",
      },
    ],
  },
  {
    axisId: "binding-policy",
    title: "Binding Policy",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.BindingSite,
    values: [
      {
        valueId: "direct-state-template-binding",
        title: "Direct State Template Binding",
        capabilityIds: ["observation:proxy-object", "binding:writeback-direction"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Taste-shaped: reads observed state directly. Does not reference the value-channel building blocks (native-value/checked/select/class-style), which stay unmapped.",
      },
      {
        valueId: "store-scoped-state-binding",
        title: "Store-Scoped State Binding",
        capabilityIds: [
          "state:state-plugin-store",
          "state:binding-behavior",
          "state:binding-command",
          "state:dispatch-binding-command",
        ],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Plugin-backed state binding policy; the source-level parts remain `.state`, `.dispatch`, and `& state` rather than generic callback conventions.",
      },
      {
        valueId: "route-id-selection",
        title: "Route ID Selection",
        capabilityIds: ["router:load-parameters", "router:route-context-parameters"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Requires router admission.",
      },
      {
        valueId: "component-object-handoff",
        title: "Component Object Handoff",
        capabilityIds: ["resource:bindable"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
      },
    ],
  },
  {
    axisId: "package-capability",
    title: "Package Capability",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "validation-html",
        title: "Validation HTML",
        capabilityIds: ["validation-html:admission"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Admits validation-html configuration and resources; individual validate/display parts still cite binding/resource capability rows.",
      },
      {
        valueId: "i18n",
        title: "I18n",
        capabilityIds: ["i18n:admission"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
        note: "Admits i18n configuration and resources; individual translation parts still cite converter/behavior capability rows.",
      },
    ],
  },
  {
    axisId: "custom-element-dom-encapsulation",
    title: "Custom Element DOM Encapsulation",
    cardinality: AppBuilderAxisCardinality.Scalar,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "light-dom",
        title: "Light DOM",
        capabilityIds: ["style:light-dom"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "open-shadow-dom",
        title: "Open Shadow DOM",
        capabilityIds: ["style:use-shadow-dom"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "closed-shadow-dom",
        title: "Closed Shadow DOM",
        capabilityIds: ["style:use-shadow-dom"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Terrain models one use-shadow-dom row; open vs closed is a shadowOptions sub-mode the terrain does not yet distinguish.",
      },
    ],
  },
  {
    axisId: "app-style-policy",
    title: "App Style Policy",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.AppGlobal,
    values: [
      {
        valueId: "global-stylesheet",
        title: "Global Stylesheet",
        capabilityIds: ["style:global-stylesheet"],
        sourceRole: AppBuilderAxisSourceRole.AppBuilderPolicy,
      },
    ],
  },
  {
    axisId: "custom-element-style-policy",
    title: "Custom Element Style Policy",
    cardinality: AppBuilderAxisCardinality.Stackable,
    declaredScope: FrameworkCapabilityLocality.ResourceLocal,
    values: [
      {
        valueId: "component-stylesheet",
        title: "Component Stylesheet",
        capabilityIds: ["style:component-stylesheet"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
      },
      {
        valueId: "css-modules",
        title: "CSS Modules",
        capabilityIds: ["style:css-modules", "style:stylesheet-tooling"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Depends on build-tool stylesheet transform (style:stylesheet-tooling).",
      },
      {
        valueId: "shadow-css-registry",
        title: "Shadow CSS Registry",
        capabilityIds: ["style:shadow-css-registry"],
        sourceRole: AppBuilderAxisSourceRole.FrameworkConstraint,
        note: "Requires open Shadow DOM; app-builder hand-codes that cascade in the selection.",
      },
    ],
  },
];

/** One reconciled lowering value joined to the live capability terrain. */
export interface ReconciledLoweringValue {
  readonly axisId: string;
  readonly valueId: string;
  readonly title: string;
  readonly sourceRole: AppBuilderAxisSourceRole;
  readonly capabilityIds: readonly string[];
  /** Cited capability ids that were not found in the live terrain. */
  readonly missingCapabilityIds: readonly string[];
  /** Localities unioned from the resolved capability rows. */
  readonly localities: readonly FrameworkCapabilityLocality[];
  /** Exclusivity ids unioned from the resolved capability rows. */
  readonly mutuallyExclusiveWith: readonly string[];
  /** Prerequisites unioned from the resolved capability rows. */
  readonly requires: readonly FrameworkCapabilityRequirementRef[];
  /** Whether the value has a public descriptor in the app-builder lowering descriptor inventory. */
  readonly describedChoice: boolean;
  readonly note?: string;
}

/** One reconciled lowering-axis finding with severity separated from the raw fact. */
export interface ReconciledLoweringAxisFinding {
  /** The raw condition discovered during reconciliation. */
  readonly kind: AppBuilderReconciliationFindingKind;
  /** Whether the condition is a risk, review point, or expected information. */
  readonly severity: AppBuilderReconciliationFindingSeverity;
  /** Short reason for the severity so the report is not treated as a lint list. */
  readonly summary: string;
}

/** One reconciled lowering axis with cross-value rollups and review findings. */
export interface ReconciledLoweringAxis {
  readonly axisId: string;
  readonly title: string;
  readonly cardinality: AppBuilderAxisCardinality;
  readonly declaredScope: FrameworkCapabilityLocality;
  readonly values: readonly ReconciledLoweringValue[];
  /** Distinct source roles present across the axis's values. */
  readonly sourceRoles: readonly AppBuilderAxisSourceRole[];
  /** Distinct terrain localities the axis's capabilities occupy. */
  readonly localities: readonly FrameworkCapabilityLocality[];
  readonly findings: readonly ReconciledLoweringAxisFinding[];
}

/** Terrain capabilities not cited by any lowering value, grouped by domain for human triage. */
export interface UnmappedCapabilityGroup {
  readonly domain: string;
  readonly capabilityIds: readonly string[];
}

/** Source-derived app-builder part row joined to the capabilities it directly exposes. */
export interface ReconciledAppBuilderPartCapability {
  readonly partKind: string;
  readonly partId: string;
  readonly capabilityIds: readonly string[];
  readonly missingCapabilityIds: readonly string[];
  readonly sourceSignals: readonly string[];
  readonly sourceFilePath: string;
  readonly valueChannelResolutionName: string | null;
}

/** Source-derived app-builder source-plan row joined to capabilities emitted by generated entrypoints/tooling. */
export interface ReconciledAppBuilderSourcePlanCapability {
  readonly sourcePlanId: string;
  readonly capabilityIds: readonly string[];
  readonly missingCapabilityIds: readonly string[];
  readonly sourceSignals: readonly string[];
  readonly sourceFilePath: string;
}

/** Source-derived substrate row for capabilities app-builder relies on while lowering/validating source. */
export interface ReconciledAppBuilderSubstrateCapability {
  readonly substrateId: string;
  readonly capabilityIds: readonly string[];
  readonly missingCapabilityIds: readonly string[];
  readonly sourceSignals: readonly string[];
  readonly sourceFilePaths: readonly string[];
}

/** Source-derived app-builder domain field value-kind row across menus, validation, lowering, and verification. */
export interface ReconciledAppBuilderDomainFieldValueKind {
  readonly valueKind: string;
  readonly enumMemberName: string;
  readonly sourceSignals: readonly string[];
  readonly sourceFilePaths: readonly string[];
}

/** Full app-builder ↔ capability-terrain reconciliation. */
export interface AppBuilderCapabilityReconciliation {
  readonly axes: readonly ReconciledLoweringAxis[];
  /** Source-derived part rows such as controls, template controllers, and framework components. */
  readonly partCapabilities: readonly ReconciledAppBuilderPartCapability[];
  /** Source-derived source-plan rows for generated entrypoint/tooling capabilities. */
  readonly sourcePlanCapabilities: readonly ReconciledAppBuilderSourcePlanCapability[];
  /** Source-derived substrate rows for capabilities that app-builder spends through lowerers/validators, not as user knobs. */
  readonly substrateCapabilities: readonly ReconciledAppBuilderSubstrateCapability[];
  /** Source-derived app-builder domain field value-kind coverage rows. */
  readonly domainFieldValueKinds: readonly ReconciledAppBuilderDomainFieldValueKind[];
  /**
   * Terrain rows no lowering value, source-derived part/composition/source-plan, or substrate cites, grouped by domain. NOT auto-classified as gaps:
   * each is either a deliberate non-knob, a pattern-layer concern, or a real axis gap, and
   * that in/out call is left to the human, not decided by Atlas.
   */
  readonly unmappedCapabilities: readonly UnmappedCapabilityGroup[];
  /** Capability ids cited by some value but absent from the live terrain. */
  readonly missingCapabilityIds: readonly string[];
  /** Values that ground in no capability (pure policy/taste, surfaced explicitly). */
  readonly tasteOnlyValues: readonly { readonly axisId: string; readonly valueId: string }[];
  /** Lowering choice ids described by the authored reconciliation axis map. */
  readonly describedLoweringChoiceIds: readonly string[];
  readonly totals: {
    readonly axisCount: number;
    readonly valueCount: number;
    readonly describedLoweringChoiceCount: number;
    readonly partCapabilityRowCount: number;
    readonly sourcePlanCapabilityRowCount: number;
    readonly domainFieldValueKindCount: number;
    readonly capabilityRowCount: number;
    readonly axisMappedCapabilityCount: number;
    readonly partMappedCapabilityCount: number;
    readonly sourcePlanMappedCapabilityCount: number;
    readonly substrateMappedCapabilityCount: number;
    readonly mappedCapabilityCount: number;
    readonly unmappedCapabilityCount: number;
    readonly findingAxisCount: number;
    readonly riskAxisCount: number;
    readonly reviewAxisCount: number;
    readonly informationAxisCount: number;
  };
}

/** Compute the reconciliation by joining the authored axis spine to the live capability terrain. */
export function computeAppBuilderCapabilityReconciliation(
  sourceProject?: SourceProject,
): AppBuilderCapabilityReconciliation {
  const rowsById = new Map<string, FrameworkCapabilityRow>();
  for (const row of FRAMEWORK_CAPABILITY_ROWS) {
    rowsById.set(row.id, row);
  }
  const describedLoweringChoiceIds = new Set(APP_BUILDER_LOWERING_AXIS_MAPS
    .flatMap((axis) => axis.values.map((value) => value.valueId)));

  const citedCapabilityIds = new Set<string>();
  const missingCapabilityIds = new Set<string>();
  const tasteOnlyValues: { readonly axisId: string; readonly valueId: string }[] = [];

  const axes = APP_BUILDER_LOWERING_AXIS_MAPS.map((axis): ReconciledLoweringAxis => {
    const values = axis.values.map((value): ReconciledLoweringValue => {
      const resolved: FrameworkCapabilityRow[] = [];
      const missing: string[] = [];
      for (const capabilityId of value.capabilityIds) {
        const row = rowsById.get(capabilityId);
        if (row === undefined) {
          missing.push(capabilityId);
          missingCapabilityIds.add(capabilityId);
        } else {
          resolved.push(row);
          citedCapabilityIds.add(capabilityId);
        }
      }
      if (value.capabilityIds.length === 0) {
        tasteOnlyValues.push({ axisId: axis.axisId, valueId: value.valueId });
      }
      return {
        axisId: axis.axisId,
        valueId: value.valueId,
        title: value.title,
        sourceRole: value.sourceRole,
        capabilityIds: value.capabilityIds,
        missingCapabilityIds: missing,
        localities: uniqueLocalities(resolved.flatMap((row) => row.localities)),
        mutuallyExclusiveWith: uniqueSortedStrings(resolved.flatMap((row) => row.mutuallyExclusiveWith)),
        requires: dedupeRequirements(resolved.flatMap((row) => row.requires)),
        describedChoice: describedLoweringChoiceIds.has(value.valueId),
        note: value.note,
      };
    });

    const sourceRoles = uniqueSourceRoles(values.map((value) => value.sourceRole));
    const localities = uniqueLocalities(values.flatMap((value) => value.localities));
    const findings = reconciliationFindingsForAxis(values, sourceRoles, localities);

    return {
      axisId: axis.axisId,
      title: axis.title,
      cardinality: axis.cardinality,
      declaredScope: axis.declaredScope,
      values,
      sourceRoles,
      localities,
      findings,
    };
  });

  const partCapabilities = sourceProject === undefined
    ? []
    : sourceDerivedPartCapabilities(sourceProject, rowsById, missingCapabilityIds);
  const partCitedCapabilityIds = new Set<string>();
  for (const row of partCapabilities) {
    for (const capabilityId of row.capabilityIds) {
      if (rowsById.has(capabilityId)) {
        partCitedCapabilityIds.add(capabilityId);
      }
    }
  }

  const sourcePlanCapabilities = sourceProject === undefined
    ? []
    : sourceDerivedSourcePlanCapabilities(sourceProject, rowsById, missingCapabilityIds);
  const sourcePlanCitedCapabilityIds = new Set<string>();
  for (const row of sourcePlanCapabilities) {
    for (const capabilityId of row.capabilityIds) {
      if (rowsById.has(capabilityId)) {
        sourcePlanCitedCapabilityIds.add(capabilityId);
      }
    }
  }

  const substrateCapabilities = sourceProject === undefined
    ? []
    : sourceDerivedSubstrateCapabilities(sourceProject, rowsById, missingCapabilityIds);
  const substrateCitedCapabilityIds = new Set<string>();
  for (const row of substrateCapabilities) {
    for (const capabilityId of row.capabilityIds) {
      if (rowsById.has(capabilityId)) {
        substrateCitedCapabilityIds.add(capabilityId);
      }
    }
  }

  const domainFieldValueKinds = sourceProject === undefined
    ? []
    : sourceDerivedDomainFieldValueKinds(sourceProject);

  const allCitedCapabilityIds = new Set([
    ...citedCapabilityIds,
    ...partCitedCapabilityIds,
    ...sourcePlanCitedCapabilityIds,
    ...substrateCitedCapabilityIds,
  ]);
  const unmappedRows = FRAMEWORK_CAPABILITY_ROWS.filter((row) => !allCitedCapabilityIds.has(row.id));
  const unmappedByDomain = new Map<string, string[]>();
  for (const row of unmappedRows) {
    const group = unmappedByDomain.get(row.domain);
    if (group === undefined) {
      unmappedByDomain.set(row.domain, [row.id]);
    } else {
      group.push(row.id);
    }
  }
  const unmappedCapabilities = [...unmappedByDomain.entries()]
    .map(([domain, capabilityIds]): UnmappedCapabilityGroup => ({ domain, capabilityIds: capabilityIds.sort() }))
    .sort((left, right) => left.domain.localeCompare(right.domain));

  return {
    axes,
    partCapabilities,
    sourcePlanCapabilities,
    substrateCapabilities,
    domainFieldValueKinds,
    unmappedCapabilities,
    missingCapabilityIds: [...missingCapabilityIds].sort(),
    tasteOnlyValues,
    describedLoweringChoiceIds: [...describedLoweringChoiceIds].sort(),
    totals: {
      axisCount: axes.length,
      valueCount: axes.reduce((sum, axis) => sum + axis.values.length, 0),
      describedLoweringChoiceCount: describedLoweringChoiceIds.size,
      partCapabilityRowCount: partCapabilities.length,
      sourcePlanCapabilityRowCount: sourcePlanCapabilities.length,
      domainFieldValueKindCount: domainFieldValueKinds.length,
      capabilityRowCount: FRAMEWORK_CAPABILITY_ROWS.length,
      axisMappedCapabilityCount: citedCapabilityIds.size,
      partMappedCapabilityCount: partCitedCapabilityIds.size,
      sourcePlanMappedCapabilityCount: sourcePlanCitedCapabilityIds.size,
      substrateMappedCapabilityCount: substrateCitedCapabilityIds.size,
      mappedCapabilityCount: allCitedCapabilityIds.size,
      unmappedCapabilityCount: unmappedRows.length,
      findingAxisCount: axes.filter((axis) => axis.findings.length > 0).length,
      riskAxisCount: axes.filter((axis) => axis.findings.some((finding) => finding.severity === AppBuilderReconciliationFindingSeverity.Risk)).length,
      reviewAxisCount: axes.filter((axis) => axis.findings.some((finding) => finding.severity === AppBuilderReconciliationFindingSeverity.Review)).length,
      informationAxisCount: axes.filter((axis) => axis.findings.some((finding) => finding.severity === AppBuilderReconciliationFindingSeverity.Information)).length,
    },
  };
}

function reconciliationFindingsForAxis(
  values: readonly ReconciledLoweringValue[],
  sourceRoles: readonly AppBuilderAxisSourceRole[],
  localities: readonly FrameworkCapabilityLocality[],
): readonly ReconciledLoweringAxisFinding[] {
  const findings: ReconciledLoweringAxisFinding[] = [];
  if (values.some((value) => value.missingCapabilityIds.length > 0)) {
    findings.push({
      kind: AppBuilderReconciliationFindingKind.CitesMissingCapability,
      severity: AppBuilderReconciliationFindingSeverity.Risk,
      summary: "At least one value cites a framework capability id that is absent from the current terrain.",
    });
  }
  if (sourceRoles.length > 1) {
    findings.push({
      kind: AppBuilderReconciliationFindingKind.MixedSourceRole,
      severity: AppBuilderReconciliationFindingSeverity.Review,
      summary: "The axis combines framework constraints, app-builder policy, or source-economy values; keep the modeling choice intentional.",
    });
  }
  if (localities.length > 1) {
    findings.push({
      kind: AppBuilderReconciliationFindingKind.ScopeSpread,
      severity: AppBuilderReconciliationFindingSeverity.Review,
      summary: "The axis joins capabilities with different framework localities; app-builder may be lifting local forms into a broader policy.",
    });
  }
  const tasteOnlyValues = values.filter((value) => value.capabilityIds.length === 0);
  if (tasteOnlyValues.length > 0) {
    const valuesWithoutRationale = tasteOnlyValues.filter((value) => value.note === undefined);
    findings.push({
      kind: AppBuilderReconciliationFindingKind.TasteOnlyValuesPresent,
      severity: valuesWithoutRationale.length === 0
        ? AppBuilderReconciliationFindingSeverity.Information
        : AppBuilderReconciliationFindingSeverity.Review,
      summary: valuesWithoutRationale.length === 0
        ? "The axis has named app-builder-only policy values with explicit rationale."
        : "The axis has app-builder-only policy values without explicit rationale.",
    });
  }
  return findings;
}

interface SourceDerivedPartCatalogSpec {
  readonly filePath: string;
  readonly variableName: string;
  readonly partKind: string;
}

interface SourceDerivedPartCatalogRow {
  readonly partKind: string;
  readonly partId: string;
  readonly sourceFilePath: string;
  readonly valueChannelNames: readonly string[];
  readonly valueChannelResolutionName: string | null;
  readonly resourceRef: SourceDerivedResourceRef | null;
  readonly syntaxPackageName: string | null;
  readonly syntaxCommandName: string | null;
  readonly frameworkSyntaxName: string | null;
  readonly frameworkApiModuleSpecifier: string | null;
  readonly frameworkApiName: string | null;
  readonly resourceMetadataName: string | null;
  readonly componentLifecycleHookName: string | null;
}

interface SourceDerivedResourceRef {
  readonly packageName: string | null;
  readonly resourceKind: string | null;
  readonly resourceName: string | null;
}

interface SourceDerivedSourcePlanRow {
  readonly sourcePlanId: string;
  readonly sourceFilePath: string;
  readonly helperName: string;
  readonly admissionHelperNames: readonly string[];
  readonly importModuleSpecifiers: readonly string[];
  readonly importNames: readonly string[];
  readonly registrationExpressionTexts: readonly string[];
  readonly routerFeatureSignals: readonly string[];
}

interface SourceDerivedSubstrateRow {
  readonly substrateId: string;
  readonly capabilityIds: readonly string[];
  readonly sourceSignals: readonly string[];
  readonly sourceFilePaths: readonly string[];
}

interface SourceDerivedSlotDescriptorRow {
  readonly slotKind: string;
  readonly valueLanguage: string;
}

const PART_CATALOG_SPECS: readonly SourceDerivedPartCatalogSpec[] = [
  {
    filePath: "packages/semantic-runtime/src/app-builder/control-catalog.ts",
    variableName: "APP_BUILDER_CONTROLS",
    partKind: "control",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/binding-part-catalog.ts",
    variableName: "APP_BUILDER_BINDING_PARTS",
    partKind: "binding-part",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/structural-part-catalog.ts",
    variableName: "APP_BUILDER_STRUCTURAL_PARTS",
    partKind: "structural-part",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/binding-behavior-catalog.ts",
    variableName: "APP_BUILDER_BINDING_BEHAVIORS",
    partKind: "binding-behavior",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/value-converter-catalog.ts",
    variableName: "APP_BUILDER_VALUE_CONVERTERS",
    partKind: "value-converter",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/framework-component-catalog.ts",
    variableName: "APP_BUILDER_FRAMEWORK_COMPONENTS",
    partKind: "framework-component",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/framework-syntax-catalog.ts",
    variableName: "APP_BUILDER_FRAMEWORK_SYNTAX",
    partKind: "framework-syntax",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/framework-api-catalog.ts",
    variableName: "APP_BUILDER_FRAMEWORK_APIS",
    partKind: "framework-api",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/resource-metadata-catalog.ts",
    variableName: "APP_BUILDER_RESOURCE_METADATA",
    partKind: "resource-metadata",
  },
  {
    filePath: "packages/semantic-runtime/src/app-builder/component-lifecycle-catalog.ts",
    variableName: "APP_BUILDER_COMPONENT_LIFECYCLES",
    partKind: "component-lifecycle",
  },
];

const APP_BUILDER_SOURCE_PLAN_SOURCE_FILES: readonly string[] = [
  "packages/semantic-runtime/src/app-builder/minimal-app-source.ts",
  "packages/semantic-runtime/src/app-builder/custom-element-pair-source-plan.ts",
  "packages/semantic-runtime/src/app-builder/di-state-class-source.ts",
  "packages/semantic-runtime/src/app-builder/local-view-model-state-source.ts",
  "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts",
  "packages/semantic-runtime/src/app-builder/part-source-gallery.ts",
];

const APP_BUILDER_PART_APPLICATION_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/part-application.ts";
const APP_BUILDER_PART_SLOT_EXPECTATION_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/part-slot-expectation.ts";
const APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/part-source-lowering.ts";
const APP_BUILDER_PART_SOURCE_INVOCATION_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/part-source-invocation.ts";
const APP_BUILDER_SOURCE_LOWERING_HELPERS_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/source-lowering-helpers.ts";
const APP_BUILDER_DOMAIN_MODEL_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/domain-model.ts";
const APP_BUILDER_DOMAIN_MATERIALIZATION_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/domain-materialization.ts";
const APP_BUILDER_DOMAIN_FIELD_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/domain-field-source.ts";
const APP_BUILDER_DI_STATE_CLASS_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/di-state-class-source.ts";
const APP_BUILDER_LOCAL_VIEW_MODEL_STATE_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/local-view-model-state-source.ts";
const APP_BUILDER_ROUTED_COLLECTION_DETAIL_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/routed-collection-detail-source.ts";
const APP_BUILDER_SOURCE_LOWERING_GALLERY_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/source-lowering-gallery.ts";
const APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/ontology/source-lowering-composition.ts";
const APP_BUILDER_SOURCE_LOWERING_SOURCE_PLAN_SOURCE_FILE = "packages/semantic-runtime/src/app-builder/ontology/source-lowering-source-plan.ts";
const APP_BUILDER_FIXTURE_MATERIALIZER_SOURCE_FILE = "packages/semantic-runtime/scripts/materialize-app-builder-fixtures.mjs";
const AUTHORED_TEMPLATE_SOURCE_FILE = "packages/semantic-runtime/src/template/authored-template-source.ts";

function sourceDerivedPartCapabilities(
  sourceProject: SourceProject,
  rowsById: ReadonlyMap<string, FrameworkCapabilityRow>,
  missingCapabilityIds: Set<string>,
): readonly ReconciledAppBuilderPartCapability[] {
  const staticStringValues = readSemanticRuntimeStaticStringValues(sourceProject);
  const staticStringArrayValues = readSemanticRuntimeStaticStringArrayValues(sourceProject, staticStringValues);
  const partRows = PART_CATALOG_SPECS.flatMap((spec) =>
    sourceDerivedPartRows(sourceProject, spec, staticStringValues, staticStringArrayValues),
  );

  return partRows
    .map((row): ReconciledAppBuilderPartCapability => {
      const capabilityIds = uniqueSortedStrings(capabilityIdsForPart(row));
      const missing = capabilityIds.filter((capabilityId) => !rowsById.has(capabilityId));
      for (const capabilityId of missing) {
        missingCapabilityIds.add(capabilityId);
      }
      return {
        partKind: row.partKind,
        partId: row.partId,
        capabilityIds,
        missingCapabilityIds: missing,
        sourceSignals: sourceSignalsForPart(row),
        sourceFilePath: row.sourceFilePath,
        valueChannelResolutionName: row.valueChannelResolutionName,
      };
    })
    .filter((row) => row.capabilityIds.length > 0)
    .sort((left, right) =>
      `${left.partKind}:${left.partId}`.localeCompare(`${right.partKind}:${right.partId}`),
    );
}

function sourceDerivedSourcePlanCapabilities(
  sourceProject: SourceProject,
  rowsById: ReadonlyMap<string, FrameworkCapabilityRow>,
  missingCapabilityIds: Set<string>,
): readonly ReconciledAppBuilderSourcePlanCapability[] {
  const sourcePlanRows = sourceDerivedSourcePlanRows(sourceProject);

  return sourcePlanRows
    .map((row): ReconciledAppBuilderSourcePlanCapability => {
      const capabilityIds = uniqueSortedStrings(capabilityIdsForSourcePlan(row));
      const missing = capabilityIds.filter((capabilityId) => !rowsById.has(capabilityId));
      for (const capabilityId of missing) {
        missingCapabilityIds.add(capabilityId);
      }
      return {
        sourcePlanId: row.sourcePlanId,
        capabilityIds,
        missingCapabilityIds: missing,
        sourceSignals: sourceSignalsForSourcePlan(row),
        sourceFilePath: row.sourceFilePath,
      };
    })
    .filter((row) => row.capabilityIds.length > 0)
    .sort((left, right) => left.sourcePlanId.localeCompare(right.sourcePlanId));
}

function sourceDerivedSubstrateCapabilities(
  sourceProject: SourceProject,
  rowsById: ReadonlyMap<string, FrameworkCapabilityRow>,
  missingCapabilityIds: Set<string>,
): readonly ReconciledAppBuilderSubstrateCapability[] {
  return sourceDerivedSubstrateRows(sourceProject)
    .map((row): ReconciledAppBuilderSubstrateCapability => {
      const capabilityIds = uniqueSortedStrings(row.capabilityIds);
      const missing = capabilityIds.filter((capabilityId) => !rowsById.has(capabilityId));
      for (const capabilityId of missing) {
        missingCapabilityIds.add(capabilityId);
      }
      return {
        substrateId: row.substrateId,
        capabilityIds,
        missingCapabilityIds: missing,
        sourceSignals: uniqueSortedStrings(row.sourceSignals),
        sourceFilePaths: uniqueSortedStrings(row.sourceFilePaths),
      };
    })
    .filter((row) => row.capabilityIds.length > 0)
    .sort((left, right) => left.substrateId.localeCompare(right.substrateId));
}

function sourceDerivedDomainFieldValueKinds(
  sourceProject: SourceProject,
): readonly ReconciledAppBuilderDomainFieldValueKind[] {
  const sourceFile = sourceProject.readSourceFile(APP_BUILDER_DOMAIN_MODEL_SOURCE_FILE);
  if (sourceFile === null) {
    return [];
  }
  return enumStringMembers(sourceFile, "AppBuilderDomainFieldValueKind")
    .map((member): ReconciledAppBuilderDomainFieldValueKind => {
      const sourceSignals = domainFieldValueKindSignals(sourceProject, member.name, member.value);
      return {
        valueKind: member.value,
        enumMemberName: member.name,
        sourceSignals,
        sourceFilePaths: sourceFilesForDomainFieldValueKind(sourceProject, member.name, member.value),
      };
    })
    .sort((left, right) => left.valueKind.localeCompare(right.valueKind));
}

function domainFieldValueKindSignals(
  sourceProject: SourceProject,
  memberName: string,
  valueKind: string,
): readonly string[] {
  const signals: string[] = [];
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_DOMAIN_MODEL_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("field-kind-descriptor");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_DOMAIN_MATERIALIZATION_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("domain-slot-validation");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_DOMAIN_FIELD_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("domain-field-source-lowering");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_SOURCE_LOWERING_SOURCE_PLAN_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("source-plan-lowering");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_DI_STATE_CLASS_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("di-state-class-source-lowering");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_LOCAL_VIEW_MODEL_STATE_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("local-view-model-state-source-lowering");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_ROUTED_COLLECTION_DETAIL_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("routed-collection-detail-source-lowering");
  }
  if (sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_SOURCE_LOWERING_GALLERY_SOURCE_FILE, "AppBuilderDomainFieldValueKind", memberName)) {
    signals.push("source-lowering-pressure-fixture");
  }
  if (sourceFileTextIncludes(sourceProject, APP_BUILDER_FIXTURE_MATERIALIZER_SOURCE_FILE, `valueKind: '${valueKind}'`)) {
    signals.push("app-builder-fixture-seed");
  }
  return signals;
}

function sourceFilesForDomainFieldValueKind(
  sourceProject: SourceProject,
  memberName: string,
  valueKind: string,
): readonly string[] {
  const sourceFiles = [
    APP_BUILDER_DOMAIN_MODEL_SOURCE_FILE,
    APP_BUILDER_DOMAIN_MATERIALIZATION_SOURCE_FILE,
    APP_BUILDER_DOMAIN_FIELD_SOURCE_FILE,
    APP_BUILDER_SOURCE_LOWERING_SOURCE_PLAN_SOURCE_FILE,
    APP_BUILDER_DI_STATE_CLASS_SOURCE_FILE,
    APP_BUILDER_LOCAL_VIEW_MODEL_STATE_SOURCE_FILE,
    APP_BUILDER_ROUTED_COLLECTION_DETAIL_SOURCE_FILE,
    APP_BUILDER_SOURCE_LOWERING_GALLERY_SOURCE_FILE,
    APP_BUILDER_FIXTURE_MATERIALIZER_SOURCE_FILE,
  ];
  return sourceFiles.filter((sourceFilePath) => (
    sourceFileHasEnumMemberUse(sourceProject, sourceFilePath, "AppBuilderDomainFieldValueKind", memberName)
    || sourceFileTextIncludes(sourceProject, sourceFilePath, `valueKind: '${valueKind}'`)
  ));
}

function sourceDerivedSourcePlanRows(
  sourceProject: SourceProject,
): readonly SourceDerivedSourcePlanRow[] {
  const rows: SourceDerivedSourcePlanRow[] = [];
  for (const sourceFilePath of APP_BUILDER_SOURCE_PLAN_SOURCE_FILES) {
    const sourceFile = sourceProject.readSourceFile(sourceFilePath);
    if (sourceFile === null) {
      continue;
    }
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const helperName = sourcePlanHelperName(node);
        if (helperName !== null) {
          rows.push(sourcePlanRowFromCall(sourceFilePath, sourceFile, node, helperName));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return rows;
}

function sourceDerivedSubstrateRows(
  sourceProject: SourceProject,
): readonly SourceDerivedSubstrateRow[] {
  const expressionSignals = [
    ...sourceDerivedExpressionSlotSignals(sourceProject),
    ...sourceDerivedPartSlotExpectationSignals(sourceProject),
    ...sourceDerivedExpressionParserSignals(sourceProject),
  ];
  const templateSourceSignals = sourceDerivedAuthoredTemplateSourceSignals(sourceProject);
  const rows: SourceDerivedSubstrateRow[] = [];
  if (expressionSignals.length > 0) {
    rows.push({
      substrateId: "app-builder-expression-source-lowering",
      capabilityIds: ["expression:parser-evaluator"],
      sourceSignals: expressionSignals,
      sourceFilePaths: [
        APP_BUILDER_PART_APPLICATION_SOURCE_FILE,
        APP_BUILDER_PART_SLOT_EXPECTATION_SOURCE_FILE,
        APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE,
      ],
    });
  }

  const actionlessFormSubmitSignals = sourceDerivedActionlessFormSubmitSignals(sourceProject);
  if (actionlessFormSubmitSignals.length > 0) {
    rows.push({
      substrateId: "app-builder-native-submit-form-source-lowering",
      capabilityIds: ["configuration:actionless-form-submit"],
      sourceSignals: actionlessFormSubmitSignals,
      sourceFilePaths: [
        APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE,
        APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE,
      ],
    });
  }

  if (templateSourceSignals.length > 0) {
    rows.push({
      substrateId: "app-builder-authored-template-source-lowering",
      capabilityIds: [
        "resource:custom-element",
        "resource:custom-attribute",
        "resource:template-controller",
        "binding:native-value-channel",
        "router:navigation-instructions",
        "router:au-viewport",
        "validation-html:admission",
      ],
      sourceSignals: templateSourceSignals,
      sourceFilePaths: [
        AUTHORED_TEMPLATE_SOURCE_FILE,
        APP_BUILDER_PART_SOURCE_INVOCATION_SOURCE_FILE,
        APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE,
        APP_BUILDER_SOURCE_LOWERING_HELPERS_SOURCE_FILE,
      ],
    });
  }

  return rows;
}

function sourceDerivedActionlessFormSubmitSignals(
  sourceProject: SourceProject,
): readonly string[] {
  const signals: string[] = [];
  const compositionIdentifiers = identifierNamesInSourceFile(sourceProject, APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE);
  const partLoweringIdentifiers = identifierNamesInSourceFile(sourceProject, APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE);
  if (
    compositionIdentifiers.has("lowerSubmitEventAttribute")
    && sourceFileTextIncludes(sourceProject, APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE, "lowerEventAttribute('submit'")
  ) {
    signals.push("native-submit-form:submit-event-attribute");
  }
  if (sourceFileTextIncludes(sourceProject, APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE, "submitEvent.attributeFragment.templateAttribute")) {
    signals.push("native-submit-form:form-owns-submit-listener");
  }
  if (sourceFileTextIncludes(sourceProject, APP_BUILDER_SOURCE_LOWERING_COMPOSITION_SOURCE_FILE, "rawValue: 'submit'")) {
    signals.push("native-submit-form:native-submit-button");
  }
  if (
    partLoweringIdentifiers.has("lowerEventListenerBindingPart")
    && sourceFileHasEnumMemberUse(sourceProject, APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE, "BuiltInBindingCommandName", "Trigger")
  ) {
    signals.push("part-source:event-listener-trigger-command");
  }
  return signals;
}

function sourceDerivedAuthoredTemplateSourceSignals(
  sourceProject: SourceProject,
): readonly string[] {
  const authoredTemplateIdentifiers = identifierNamesInSourceFile(sourceProject, AUTHORED_TEMPLATE_SOURCE_FILE);
  const invocationIdentifiers = identifierNamesInSourceFile(sourceProject, APP_BUILDER_PART_SOURCE_INVOCATION_SOURCE_FILE);
  const loweringIdentifiers = identifierNamesInSourceFile(sourceProject, APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE);
  const helperIdentifiers = identifierNamesInSourceFile(sourceProject, APP_BUILDER_SOURCE_LOWERING_HELPERS_SOURCE_FILE);

  return [
    ...(authoredTemplateIdentifiers.has("AuthoredTemplateAttributeSource")
      ? ["authored-template-substrate:AuthoredTemplateAttributeSource"]
      : []),
    ...(authoredTemplateIdentifiers.has("AuthoredTemplateElementSource")
      ? ["authored-template-substrate:AuthoredTemplateElementSource"]
      : []),
    ...(authoredTemplateIdentifiers.has("appendAuthoredTemplateElementAttributes")
      ? ["authored-template-substrate:append-element-attributes"]
      : []),
    ...(invocationIdentifiers.has("AppBuilderTemplateAttributeSource")
      ? ["source-fragment:structured-template-attribute"]
      : []),
    ...(invocationIdentifiers.has("AppBuilderTemplateElementSource")
      ? ["source-fragment:structured-template-element"]
      : []),
    ...(loweringIdentifiers.has("templateAttribute")
      ? ["source-lowering-fragment:template-attribute-source"]
      : []),
    ...(loweringIdentifiers.has("appBuilderTemplateElementFromParts")
      ? ["source-lowering-fragment:template-element-source"]
      : []),
    ...(loweringIdentifiers.has("AppBuilderPartSlotReader")
      ? ["source-lowering-substrate:AppBuilderPartSlotReader"]
      : []),
    ...(loweringIdentifiers.has("scanGeneratedTemplateElementAttributes")
      ? ["source-lowering-integrity:structured-element-attribute-scan"]
      : []),
    ...(helperIdentifiers.has("lowerAppBuilderPartTemplateAttributeSource")
      ? ["source-helper:part-template-attribute-source"]
      : []),
    ...(helperIdentifiers.has("appBuilderTemplateElementSource")
      ? ["source-helper:template-element-source"]
      : []),
  ];
}

function identifierNamesInSourceFile(
  sourceProject: SourceProject,
  sourceFilePath: string,
): ReadonlySet<string> {
  const sourceFile = sourceProject.readSourceFile(sourceFilePath);
  if (sourceFile === null) {
    return new Set<string>();
  }
  return identifierNamesInParsedSourceFile(sourceFile);
}

function identifierNamesInParsedSourceFile(
  sourceFile: ts.SourceFile,
): ReadonlySet<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      names.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

function sourceDerivedExpressionSlotSignals(
  sourceProject: SourceProject,
): readonly string[] {
  const aureliaExpressionSlotKinds = new Set([
    "aurelia-binding-expression",
    "aurelia-function-expression",
    "aurelia-iterable-value-expression",
    "aurelia-expression-argument-list",
  ]);
  return sourceDerivedSlotDescriptorRows(sourceProject)
    .filter((row) => aureliaExpressionSlotKinds.has(row.valueLanguage))
    .map((row) => `source-slot:${row.slotKind}`);
}

function sourceDerivedPartSlotExpectationSignals(
  sourceProject: SourceProject,
): readonly string[] {
  const sourceFile = sourceProject.readSourceFile(APP_BUILDER_PART_SLOT_EXPECTATION_SOURCE_FILE);
  if (sourceFile === null) {
    return [];
  }
  let usesBuiltInCommandExpressionType = false;
  let usesBuiltInCommandLookup = false;
  let resolvesPartSlotExpectation = false;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      if (node.text === "builtInBindingCommandExpressionType") {
        usesBuiltInCommandExpressionType = true;
      } else if (node.text === "findUniqueBuiltInBindingCommandByName") {
        usesBuiltInCommandLookup = true;
      } else if (node.text === "appBuilderPartSlotExpectation") {
        resolvesPartSlotExpectation = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const signals: string[] = [];
  if (resolvesPartSlotExpectation) {
    signals.push("slot-expectation:part-aware");
  }
  if (usesBuiltInCommandLookup) {
    signals.push("slot-expectation:built-in-command-lookup");
  }
  if (usesBuiltInCommandExpressionType) {
    signals.push("slot-expectation:built-in-command-entry-family");
  }
  return signals;
}

function sourceDerivedSlotDescriptorRows(
  sourceProject: SourceProject,
): readonly SourceDerivedSlotDescriptorRow[] {
  const sourceFile = sourceProject.readSourceFile(APP_BUILDER_PART_APPLICATION_SOURCE_FILE);
  if (sourceFile === null) {
    return [];
  }
  const array = catalogArrayInitializer(sourceFile, "APP_BUILDER_PART_SLOT_DESCRIPTORS");
  if (array === null) {
    return [];
  }
  const staticStringValues = readSemanticRuntimeStaticStringValues(sourceProject);
  const rows: SourceDerivedSlotDescriptorRow[] = [];
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      continue;
    }
    const slotKindExpression = propertyInitializer(element, "slotKind");
    const valueLanguageExpression = propertyInitializer(element, "valueLanguage");
    const slotKind = slotKindExpression === null ? null : staticStringValue(slotKindExpression, staticStringValues);
    const valueLanguage = valueLanguageExpression === null ? null : staticStringValue(valueLanguageExpression, staticStringValues);
    if (slotKind === null || valueLanguage === null) {
      continue;
    }
    rows.push({ slotKind, valueLanguage });
  }
  return rows;
}

function sourceDerivedExpressionParserSignals(
  sourceProject: SourceProject,
): readonly string[] {
  const sourceFile = sourceProject.readSourceFile(APP_BUILDER_PART_SOURCE_LOWERING_SOURCE_FILE);
  if (sourceFile === null) {
    return [];
  }
  let instantiatesExpressionParser = false;
  let parseCallCount = 0;
  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "ExpressionParser"
    ) {
      instantiatesExpressionParser = true;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "parse"
    ) {
      parseCallCount += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return [
    ...(instantiatesExpressionParser ? ["source-lowering-substrate:ExpressionParser"] : []),
    ...(parseCallCount === 0 ? [] : [`source-lowering-parse-calls:${parseCallCount}`]),
  ];
}

function sourceDerivedPartRows(
  sourceProject: SourceProject,
  spec: SourceDerivedPartCatalogSpec,
  staticStringValues: ReadonlyMap<string, string>,
  staticStringArrayValues: ReadonlyMap<string, readonly string[]>,
): readonly SourceDerivedPartCatalogRow[] {
  const sourceFile = sourceProject.readSourceFile(spec.filePath);
  if (sourceFile === null) {
    return [];
  }
  const array = catalogArrayInitializer(sourceFile, spec.variableName);
  if (array === null) {
    return [];
  }

  const rows: SourceDerivedPartCatalogRow[] = [];
  for (const element of array.elements) {
    if (ts.isSpreadElement(element)) {
      rows.push(...sourceDerivedPartRowsFromSpreadElement(
        spec,
        element,
        staticStringValues,
      ));
      continue;
    }
    if (!ts.isObjectLiteralExpression(element)) {
      continue;
    }
    const row = sourceDerivedPartRowFromObjectLiteral(spec, element, staticStringValues, staticStringArrayValues);
    if (row !== null) {
      rows.push(row);
    }
  }
  return rows;
}

function sourceDerivedPartRowFromObjectLiteral(
  spec: SourceDerivedPartCatalogSpec,
  element: ts.ObjectLiteralExpression,
  staticStringValues: ReadonlyMap<string, string>,
  staticStringArrayValues: ReadonlyMap<string, readonly string[]>,
): SourceDerivedPartCatalogRow | null {
  const idExpression = propertyInitializer(element, "id");
  const partId = idExpression === null ? null : staticStringValue(idExpression, staticStringValues);
  if (partId === null) {
    return null;
  }

  return {
    partKind: spec.partKind,
    partId,
    sourceFilePath: spec.filePath,
    valueChannelNames: valueChannelNames(element, staticStringArrayValues),
    valueChannelResolutionName: enumMemberPropertyName(element, "valueChannelResolution"),
    resourceRef: resourceRef(element, staticStringValues),
    syntaxPackageName: syntaxPackageName(element),
    syntaxCommandName: syntaxCommandName(element),
    frameworkSyntaxName: staticStringPropertyValue(element, "specialAttributeName", staticStringValues),
    frameworkApiModuleSpecifier: stringLiteralPropertyText(element, "moduleSpecifier"),
    frameworkApiName: stringLiteralPropertyText(element, "exportName"),
    resourceMetadataName: staticStringPropertyValue(element, "metadataPropertyName", staticStringValues),
    componentLifecycleHookName: staticStringPropertyValue(element, "hookName", staticStringValues),
  };
}

function sourceDerivedPartRowsFromSpreadElement(
  spec: SourceDerivedPartCatalogSpec,
  element: ts.SpreadElement,
  staticStringValues: ReadonlyMap<string, string>,
): readonly SourceDerivedPartCatalogRow[] {
  if (spec.variableName !== "APP_BUILDER_FRAMEWORK_APIS") {
    return [];
  }
  const expression = element.expression;
  if (
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== "namedResourceFrameworkApiDescriptors"
  ) {
    return [];
  }
  const request = expression.arguments[0];
  if (request === undefined || !ts.isObjectLiteralExpression(request)) {
    return [];
  }
  return sourceDerivedNamedResourceFrameworkApiRows(spec, request, staticStringValues);
}

function sourceDerivedNamedResourceFrameworkApiRows(
  spec: SourceDerivedPartCatalogSpec,
  request: ts.ObjectLiteralExpression,
  staticStringValues: ReadonlyMap<string, string>,
): readonly SourceDerivedPartCatalogRow[] {
  const decoratorId = staticStringPropertyValue(request, "decoratorId", staticStringValues);
  const staticAuId = staticStringPropertyValue(request, "staticAuId", staticStringValues);
  const defineCallId = staticStringPropertyValue(request, "defineCallId", staticStringValues);
  const decoratorExportName = stringLiteralPropertyText(request, "decoratorExportName");
  const staticAuExportName = stringLiteralPropertyText(request, "staticAuExportName");
  const staticAuModuleSpecifier = stringLiteralPropertyText(request, "staticAuModuleSpecifier");
  const defineApiExportName = stringLiteralPropertyText(request, "defineApiExportName");
  return [
    frameworkApiSourceDerivedPartRow(spec, decoratorId, "aurelia", decoratorExportName),
    frameworkApiSourceDerivedPartRow(spec, staticAuId, staticAuModuleSpecifier, staticAuExportName),
    frameworkApiSourceDerivedPartRow(spec, defineCallId, "aurelia", defineApiExportName),
  ].filter((row): row is SourceDerivedPartCatalogRow => row !== null);
}

function frameworkApiSourceDerivedPartRow(
  spec: SourceDerivedPartCatalogSpec,
  partId: string | null,
  moduleSpecifier: string | null,
  apiName: string | null,
): SourceDerivedPartCatalogRow | null {
  if (partId === null) {
    return null;
  }
  return {
    partKind: spec.partKind,
    partId,
    sourceFilePath: spec.filePath,
    valueChannelNames: [],
    valueChannelResolutionName: null,
    resourceRef: null,
    syntaxPackageName: null,
    syntaxCommandName: null,
    frameworkSyntaxName: null,
    frameworkApiModuleSpecifier: moduleSpecifier,
    frameworkApiName: apiName,
    resourceMetadataName: null,
    componentLifecycleHookName: null,
  };
}

function sourcePlanRowFromCall(
  sourceFilePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  helperName: string,
): SourceDerivedSourcePlanRow {
  const model = call.arguments[0];
  const modelObject = model !== undefined && ts.isObjectLiteralExpression(model)
    ? model
    : null;
  const configurationImportRows = modelObject === null
    ? []
    : sourcePlanConfigurationImportRows(modelObject);
  const registrationExpressionTexts = modelObject === null
    ? []
    : sourcePlanRegistrationExpressionTexts(modelObject, sourceFile);

  return {
    sourcePlanId: `${sourceFilePath}#${containingFunctionName(call) ?? helperName}`,
    sourceFilePath,
    helperName,
    admissionHelperNames: sourcePlanAdmissionHelperNames(containingFunctionNode(call) ?? sourceFile),
    importModuleSpecifiers: uniqueSortedStrings(configurationImportRows.map((row) => row.moduleSpecifier)),
    importNames: uniqueSortedStrings(configurationImportRows.flatMap((row) => row.namedImports)),
    registrationExpressionTexts,
    routerFeatureSignals: sourcePlanRouterFeatureSignals(sourceFilePath, sourceFile),
  };
}

function sourcePlanHelperName(call: ts.CallExpression): string | null {
  if (ts.isIdentifier(call.expression)) {
    switch (call.expression.text) {
      case "configuredAureliaEntrypointFile":
      case "standardAureliaEntrypointFile":
        return call.expression.text;
      default:
        return null;
    }
  }
  if (ts.isPropertyAccessExpression(call.expression)) {
    switch (call.expression.name.text) {
      case "addConfiguredEntrypoint":
        return call.expression.name.text;
      default:
        return null;
    }
  }
  return null;
}

function sourcePlanRouterFeatureSignals(
  sourceFilePath: string,
  sourceFile: ts.SourceFile,
): readonly string[] {
  if (sourceFilePath !== APP_BUILDER_ROUTED_COLLECTION_DETAIL_SOURCE_FILE) {
    return [];
  }
  const sourceText = sourceFile.getFullText();
  const identifiers = identifierNamesInParsedSourceFile(sourceFile);
  const signals: string[] = [];
  if (
    identifiers.has("appBuilderRouteDecoratorFragment")
    && identifiers.has("appBuilderViewportElementFragment")
    && identifiers.has("nestedViewportName")
  ) {
    signals.push("router:nested-viewport-source");
  }
  if (
    identifiers.has("appBuilderRouteDecoratorFragment")
    && (
      identifiers.has("detailRouteChildSegment")
      || sourceText.includes("`:${detailRouteParameterName}`")
    )
  ) {
    signals.push("router:parameterized-route-pattern");
  }
  return signals;
}

function sourcePlanAdmissionHelperNames(
  owner: ts.Node,
): readonly string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && sourcePlanAdmissionHelperName(node.expression.text) !== null) {
      names.push(node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(owner);
  return uniqueSortedStrings(names);
}

function sourcePlanAdmissionHelperName(
  helperName: string,
): string | null {
  switch (helperName) {
    case "aureliaRouterConfigurationAdmissionSource":
    case "aureliaStateDefaultConfigurationAdmissionSource":
    case "aureliaI18nConfigurationAdmissionSource":
    case "aureliaValidationHtmlConfigurationAdmissionSource":
    case "aureliaUiVirtualizationConfigurationAdmissionSource":
      return helperName;
    default:
      return null;
  }
}

interface SourcePlanConfigurationImportRow {
  readonly moduleSpecifier: string;
  readonly namedImports: readonly string[];
}

function sourcePlanConfigurationImportRows(
  objectLiteral: ts.ObjectLiteralExpression,
): readonly SourcePlanConfigurationImportRow[] {
  const imports = propertyInitializer(objectLiteral, "configurationImports");
  if (imports === null || !ts.isArrayLiteralExpression(imports)) {
    return [];
  }
  const rows: SourcePlanConfigurationImportRow[] = [];
  for (const element of imports.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      continue;
    }
    const moduleSpecifier = propertyInitializer(element, "moduleSpecifier");
    if (moduleSpecifier === null || !ts.isStringLiteralLike(moduleSpecifier)) {
      continue;
    }
    rows.push({
      moduleSpecifier: moduleSpecifier.text,
      namedImports: sourcePlanStringArrayProperty(element, "namedImports"),
    });
  }
  return rows;
}

function sourcePlanRegistrationExpressionTexts(
  objectLiteral: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const registrations = propertyInitializer(objectLiteral, "registrationExpressions");
  if (registrations === null || !ts.isArrayLiteralExpression(registrations)) {
    return [];
  }
  return registrations.elements.map((element) => sourcePlanExpressionText(element, sourceFile));
}

function sourcePlanStringArrayProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): readonly string[] {
  const property = propertyInitializer(objectLiteral, propertyName);
  if (property === null || !ts.isArrayLiteralExpression(property)) {
    return [];
  }
  return property.elements.flatMap((element) =>
    ts.isStringLiteralLike(element) ? [element.text] : []
  );
}

function sourcePlanExpressionText(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): string {
  return ts.isStringLiteralLike(expression)
    ? expression.text
    : expression.getText(sourceFile);
}

function containingFunctionName(
  node: ts.Node,
): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if ((ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) && current.name !== undefined) {
      return current.name.text;
    }
    if (
      ts.isVariableDeclaration(current) &&
      ts.isIdentifier(current.name) &&
      current.initializer !== undefined &&
      (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))
    ) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

function containingFunctionNode(
  node: ts.Node,
): ts.Node | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function catalogArrayInitializer(sourceFile: ts.SourceFile, variableName: string): ts.ArrayLiteralExpression | null {
  let found: ts.ArrayLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      found === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer !== undefined
    ) {
      found = unwrapArrayLiteral(node.initializer);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function unwrapArrayLiteral(expression: ts.Expression): ts.ArrayLiteralExpression | null {
  if (ts.isArrayLiteralExpression(expression)) {
    return expression;
  }
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapArrayLiteral(expression.expression);
  }
  return null;
}

function readSemanticRuntimeStaticStringValues(sourceProject: SourceProject): ReadonlyMap<string, string> {
  const valueByExpression = new Map<string, string>();
  const constInitializers: { readonly name: string; readonly initializer: ts.Expression }[] = [];
  for (const sourceFile of sourceProject.ownedImplementationSourceFilesForPackage("semantic-runtime")) {
    const visit = (node: ts.Node): void => {
      if (ts.isEnumDeclaration(node)) {
        for (const member of node.members) {
          const memberName = propertyNameText(member.name);
          if (memberName === null) {
            continue;
          }
          const key = `${node.name.text}.${memberName}`;
          const value = member.initializer !== undefined && ts.isStringLiteralLike(member.initializer)
            ? member.initializer.text
            : memberName;
          valueByExpression.set(key, value);
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        (ts.getCombinedNodeFlags(node) & ts.NodeFlags.Const) !== 0
      ) {
        constInitializers.push({ name: node.name.text, initializer: node.initializer });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of constInitializers) {
      if (valueByExpression.has(candidate.name)) {
        continue;
      }
      const value = staticStringValue(candidate.initializer, valueByExpression);
      if (value === null) {
        continue;
      }
      valueByExpression.set(candidate.name, value);
      changed = true;
    }
  }

  return valueByExpression;
}

function readSemanticRuntimeStaticStringArrayValues(
  sourceProject: SourceProject,
  staticStringValues: ReadonlyMap<string, string>,
): ReadonlyMap<string, readonly string[]> {
  const valueByExpression = new Map<string, readonly string[]>();
  const constInitializers: { readonly name: string; readonly initializer: ts.Expression }[] = [];
  for (const sourceFile of sourceProject.ownedImplementationSourceFilesForPackage("semantic-runtime")) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        (ts.getCombinedNodeFlags(node) & ts.NodeFlags.Const) !== 0
      ) {
        constInitializers.push({ name: node.name.text, initializer: node.initializer });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of constInitializers) {
      if (valueByExpression.has(candidate.name)) {
        continue;
      }
      const value = staticStringArrayValue(candidate.initializer, staticStringValues, valueByExpression);
      if (value === null) {
        continue;
      }
      valueByExpression.set(candidate.name, value);
      changed = true;
    }
  }

  return valueByExpression;
}

function propertyInitializer(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (propertyNameText(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function staticStringValue(
  expression: ts.Expression,
  staticStringValues: ReadonlyMap<string, string>,
): string | null {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    return staticStringValues.get(expression.text) ?? null;
  }
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return staticStringValue(expression.expression, staticStringValues);
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    return staticStringValues.get(`${expression.expression.text}.${expression.name.text}`) ?? expression.name.text;
  }
  return null;
}

function staticStringArrayValue(
  expression: ts.Expression,
  staticStringValues: ReadonlyMap<string, string>,
  staticStringArrayValues: ReadonlyMap<string, readonly string[]>,
): readonly string[] | null {
  if (ts.isArrayLiteralExpression(expression)) {
    const values = expression.elements.flatMap((element) => {
      const propertyMembers = propertyAccessMemberName(element);
      return propertyMembers.length > 0
        ? propertyMembers
        : staticStringValue(element, staticStringValues) == null
          ? []
          : [staticStringValue(element, staticStringValues)!];
    });
    return values.length === expression.elements.length ? values : null;
  }
  if (ts.isIdentifier(expression)) {
    return staticStringArrayValues.get(expression.text) ?? null;
  }
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return staticStringArrayValue(expression.expression, staticStringValues, staticStringArrayValues);
  }
  return null;
}

function valueChannelNames(
  objectLiteral: ts.ObjectLiteralExpression,
  staticStringArrayValues: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const valueChannels = propertyInitializer(objectLiteral, "valueChannels");
  if (valueChannels !== null) {
    if (ts.isArrayLiteralExpression(valueChannels)) {
      return valueChannels.elements.flatMap((element) => propertyAccessMemberName(element));
    }
    if (ts.isIdentifier(valueChannels)) {
      return staticStringArrayValues.get(valueChannels.text) ?? [];
    }
  }
  const valueChannel = propertyInitializer(objectLiteral, "valueChannel");
  return valueChannel === null ? [] : propertyAccessMemberName(valueChannel);
}

function propertyAccessArrayMemberNames(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): readonly string[] {
  const array = propertyInitializer(objectLiteral, propertyName);
  return array !== null && ts.isArrayLiteralExpression(array)
    ? array.elements.flatMap((element) => propertyAccessMemberName(element))
    : [];
}

function propertyAccessMemberName(expression: ts.Expression): readonly string[] {
  return ts.isPropertyAccessExpression(expression) ? [expression.name.text] : [];
}

function resourceRef(
  objectLiteral: ts.ObjectLiteralExpression,
  staticStringValues: ReadonlyMap<string, string>,
): SourceDerivedResourceRef | null {
  const resource = propertyInitializer(objectLiteral, "resource");
  if (resource === null || !ts.isCallExpression(resource)) {
    return null;
  }
  if (!ts.isIdentifier(resource.expression) || resource.expression.text !== "appBuilderBuiltInResourceRef") {
    return null;
  }
  const [packageExpression, kindExpression, nameExpression] = resource.arguments;
  return {
    packageName: packageExpression === undefined ? null : enumMemberName(packageExpression),
    resourceKind: kindExpression === undefined ? null : enumMemberName(kindExpression),
    resourceName: nameExpression === undefined ? null : staticStringValue(nameExpression, staticStringValues),
  };
}

function syntaxCommandName(objectLiteral: ts.ObjectLiteralExpression): string | null {
  const syntax = propertyInitializer(objectLiteral, "syntax");
  if (syntax === null || !ts.isCallExpression(syntax)) {
    return null;
  }
  if (!ts.isIdentifier(syntax.expression) || syntax.expression.text !== "appBuilderBuiltInBindingCommandRef") {
    return null;
  }
  const commandExpression = syntax.arguments[1];
  return commandExpression === undefined ? null : enumMemberName(commandExpression);
}

function syntaxPackageName(objectLiteral: ts.ObjectLiteralExpression): string | null {
  const syntax = propertyInitializer(objectLiteral, "syntax");
  if (syntax === null || !ts.isCallExpression(syntax)) {
    return null;
  }
  if (!ts.isIdentifier(syntax.expression) || syntax.expression.text !== "appBuilderBuiltInBindingCommandRef") {
    return null;
  }
  const packageExpression = syntax.arguments[0];
  return packageExpression === undefined ? null : enumMemberName(packageExpression);
}

function enumMemberName(expression: ts.Expression): string | null {
  return ts.isPropertyAccessExpression(expression) ? expression.name.text : null;
}

function enumMemberPropertyName(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  const expression = propertyInitializer(objectLiteral, propertyName);
  return expression === null ? null : enumMemberName(expression);
}

function staticStringPropertyValue(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
  staticStringValues: ReadonlyMap<string, string>,
): string | null {
  const expression = propertyInitializer(objectLiteral, propertyName);
  return expression === null ? null : staticStringValue(expression, staticStringValues);
}

function stringLiteralPropertyText(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  const expression = propertyInitializer(objectLiteral, propertyName);
  return expression !== null && ts.isStringLiteralLike(expression) ? expression.text : null;
}

function capabilityIdsForPart(row: SourceDerivedPartCatalogRow): readonly string[] {
  return [
    ...capabilityIdsForValueChannels(row),
    ...capabilityIdsForResource(row.resourceRef),
    ...capabilityIdsForSyntaxCommand(row.syntaxPackageName, row.syntaxCommandName),
    ...capabilityIdsForFrameworkSyntax(row.frameworkSyntaxName),
    ...capabilityIdsForFrameworkApi(row.partId, row.frameworkApiModuleSpecifier, row.frameworkApiName),
    ...capabilityIdsForResourceMetadata(row.resourceMetadataName),
    ...capabilityIdsForComponentLifecycle(row.componentLifecycleHookName),
  ];
}

function capabilityIdsForValueChannels(row: SourceDerivedPartCatalogRow): readonly string[] {
  const capabilityIds: string[] = [];
  const hasCheckedChannel = row.valueChannelNames.some((valueChannelName) => valueChannelName.startsWith("Checked"));
  const hasSelectChannel = row.valueChannelNames.some((valueChannelName) => valueChannelName.startsWith("Select"));
  for (const valueChannelName of row.valueChannelNames) {
    switch (valueChannelName) {
      case "RawProperty":
        if (row.partKind === "control" || row.valueChannelResolutionName === "TargetObserverResolved") {
          capabilityIds.push("binding:native-value-channel");
        }
        break;
      case "CheckedBoolean":
      case "CheckedRadioValue":
      case "CheckedCollectionMembership":
      case "CheckedMapKeyedBoolean":
      case "CheckedDynamicModelValue":
      case "CheckedModel":
        capabilityIds.push("binding:checked-channel");
        break;
      case "SelectSingleOptionValue":
      case "SelectMultipleOptionValues":
      case "SelectDynamicOptionValue":
        capabilityIds.push("binding:select-channel");
        break;
      case "ElementModelValue":
      case "CustomMatcherFunction":
        if (row.partKind === "binding-part") {
          capabilityIds.push("binding:checked-channel", "binding:select-channel");
        } else if (hasSelectChannel) {
          capabilityIds.push("binding:select-channel");
        } else if (hasCheckedChannel) {
          capabilityIds.push("binding:checked-channel");
        }
        break;
      case "ClassAttributeTokens":
      case "ClassToggle":
      case "StyleAttributeRules":
      case "StylePropertyValue":
        capabilityIds.push("binding:class-style");
        break;
      case "StateDispatchAction":
        capabilityIds.push("state:dispatch-binding-command");
        break;
    }
  }
  return capabilityIds;
}

function capabilityIdsForResource(resource: SourceDerivedResourceRef | null): readonly string[] {
  if (resource === null || resource.resourceKind === null || resource.resourceName === null) {
    return [];
  }
  if (resource.resourceKind === "TemplateController") {
    switch (resource.resourceName) {
      case "if":
      case "else":
        return ["template-controller:if-else"];
      case "repeat":
        return ["template-controller:repeat"];
      case "virtual-repeat":
        return ["template-controller:repeat", "ui-virtualization:admission"];
      case "with":
        return ["template-controller:with"];
      case "promise":
      case "pending":
      case "then":
      case "catch":
        return ["template-controller:promise"];
      case "switch":
      case "case":
      case "default-case":
        return ["template-controller:switch"];
      case "portal":
        return ["template-controller:portal"];
    }
  }
  if (resource.resourceKind === "CustomElement") {
    switch (resource.resourceName) {
      case "au-compose":
        return ["composition:au-compose"];
      case "au-viewport":
        return ["router:au-viewport"];
    }
  }
  if (resource.resourceKind === "CustomAttribute") {
    switch (resource.resourceName) {
      case "load":
      case "href":
        return ["router:navigation-instructions"];
    }
  }
  if (resource.resourceKind === "ValueConverter") {
    return packageCapabilityIdsForResource(resource, ["expression:value-converter-call"]);
  }
  if (resource.resourceKind === "BindingBehavior") {
    return packageCapabilityIdsForResource(resource, resource.packageName === "State" && resource.resourceName === "state"
      ? ["expression:binding-behavior-application", "state:binding-behavior"]
      : ["expression:binding-behavior-application"]);
  }
  return packageCapabilityIdsForResource(resource, []);
}

function packageCapabilityIdsForResource(
  resource: SourceDerivedResourceRef,
  capabilityIds: readonly string[],
): readonly string[] {
  switch (resource.packageName) {
    case "I18n":
      return ["i18n:admission", ...capabilityIds];
    case "ValidationHtml":
      return ["validation-html:admission", ...capabilityIds];
    default:
      return capabilityIds;
  }
}

function capabilityIdsForSyntaxCommand(
  packageName: string | null,
  commandName: string | null,
): readonly string[] {
  if (packageName === "I18n") {
    return ["i18n:admission"];
  }
  switch (commandName) {
    case "State":
      return ["state:binding-command"];
    case "Dispatch":
      return ["state:dispatch-binding-command"];
    case "Class":
    case "Style":
      return ["binding:class-style"];
    default:
      return [];
  }
}

function capabilityIdsForFrameworkApi(
  partId: string,
  moduleSpecifier: string | null,
  apiName: string | null,
): readonly string[] {
  const resourceSourceCapabilities = capabilityIdsForFrameworkResourceApiPart(partId);
  if (resourceSourceCapabilities.length > 0) {
    return resourceSourceCapabilities;
  }
  if ((moduleSpecifier === "aurelia" || moduleSpecifier === "@aurelia/runtime-html") && apiName === "customElement") {
    return ["resource-source:decorator", "resource:custom-element"];
  }
  if (moduleSpecifier === "@aurelia/runtime-html" && apiName === "CustomElementStaticAuDefinition") {
    return ["resource-source:static-au", "resource:custom-element"];
  }
  if ((moduleSpecifier === "aurelia" || moduleSpecifier === "@aurelia/runtime-html") && apiName === "CustomElement") {
    return ["resource-source:define-call", "resource:custom-element"];
  }
  if (moduleSpecifier === "@aurelia/router" && apiName === "route") {
    return ["router:top-level-routes"];
  }
  if (moduleSpecifier === "@aurelia/router" && apiName === "IRouteContext") {
    return ["router:route-context-parameters"];
  }
  if (moduleSpecifier === "@aurelia/state" && apiName === "fromState") {
    return ["state:from-state-decorator"];
  }
  if ((moduleSpecifier === "aurelia" || moduleSpecifier === "@aurelia/runtime") && apiName === "computed") {
    return ["observation:computed-decorator"];
  }
  if ((moduleSpecifier === "aurelia" || moduleSpecifier === "@aurelia/runtime-html") && apiName === "AppTask") {
    return ["configuration:app-task"];
  }
  return [];
}

function capabilityIdsForFrameworkResourceApiPart(
  partId: string,
): readonly string[] {
  switch (partId) {
    case "custom-element-decorator":
      return ["resource-source:decorator", "resource:custom-element"];
    case "custom-element-static-au-definition":
      return ["resource-source:static-au", "resource:custom-element"];
    case "custom-element-define-call":
      return ["resource-source:define-call", "resource:custom-element"];
    case "custom-attribute-decorator":
      return ["resource-source:decorator", "resource:custom-attribute"];
    case "custom-attribute-static-au-definition":
      return ["resource-source:static-au", "resource:custom-attribute"];
    case "custom-attribute-define-call":
      return ["resource-source:define-call", "resource:custom-attribute"];
    case "template-controller-decorator":
      return ["resource-source:decorator", "resource:template-controller"];
    case "template-controller-static-au-definition":
      return ["resource-source:static-au", "resource:template-controller"];
    case "template-controller-define-call":
      return ["resource-source:define-call", "resource:template-controller"];
    case "value-converter-decorator":
      return ["resource-source:decorator", "resource:value-converter"];
    case "value-converter-static-au-definition":
      return ["resource-source:static-au", "resource:value-converter"];
    case "value-converter-define-call":
      return ["resource-source:define-call", "resource:value-converter"];
    case "binding-behavior-decorator":
      return ["resource-source:decorator", "resource:binding-behavior"];
    case "binding-behavior-static-au-definition":
      return ["resource-source:static-au", "resource:binding-behavior"];
    case "binding-behavior-define-call":
      return ["resource-source:define-call", "resource:binding-behavior"];
    case "binding-command-decorator":
      return ["resource-source:decorator", "resource:binding-command"];
    case "binding-command-static-au-definition":
      return ["resource-source:static-au", "resource:binding-command"];
    case "binding-command-define-call":
      return ["resource-source:define-call", "resource:binding-command"];
    case "attribute-pattern-create":
      return ["resource-source:attribute-pattern-create", "resource:attribute-pattern"];
    default:
      return [];
  }
}

function capabilityIdsForFrameworkSyntax(
  frameworkSyntaxName: string | null,
): readonly string[] {
  switch (frameworkSyntaxName) {
    case "as-element":
      return ["resource:as-element"];
    case "containerless":
      return ["resource:containerless"];
    default:
      return [];
  }
}

function capabilityIdsForResourceMetadata(
  resourceMetadataName: string | null,
): readonly string[] {
  switch (resourceMetadataName) {
    case "dependencies":
      return ["resource:template-local-dependency"];
    default:
      return [];
  }
}

function capabilityIdsForComponentLifecycle(
  hookName: string | null,
): readonly string[] {
  return hookName === null ? [] : ["lifecycle:component-hooks"];
}

function capabilityIdsForSourcePlan(row: SourceDerivedSourcePlanRow): readonly string[] {
  const capabilityIds: string[] = ["configuration:standard-bundle"];
  if (row.registrationExpressionTexts.length > 0 || row.admissionHelperNames.length > 0) {
    capabilityIds.push("configuration:bundle-composition");
  }
  if (
    row.importModuleSpecifiers.includes("@aurelia/router") ||
    row.importNames.includes("RouterConfiguration") ||
    row.admissionHelperNames.includes("aureliaRouterConfigurationAdmissionSource") ||
    row.registrationExpressionTexts.some((text) => text.includes("RouterConfiguration"))
  ) {
    capabilityIds.push("router:admission", "plugin:feature-admission");
  }
  if (row.routerFeatureSignals.includes("router:nested-viewport-source")) {
    capabilityIds.push("router:nested-viewports");
  }
  if (row.routerFeatureSignals.includes("router:parameterized-route-pattern")) {
    capabilityIds.push("router:route-recognizer");
  }
  if (
    row.importModuleSpecifiers.includes("@aurelia/state") ||
    row.importNames.includes("StateDefaultConfiguration") ||
    row.admissionHelperNames.includes("aureliaStateDefaultConfigurationAdmissionSource") ||
    row.registrationExpressionTexts.some((text) => text.includes("StateDefaultConfiguration"))
  ) {
    capabilityIds.push("state:state-plugin-store", "plugin:feature-admission");
  }
  if (
    row.importModuleSpecifiers.includes("@aurelia/i18n") ||
    row.importNames.includes("I18nConfiguration") ||
    row.admissionHelperNames.includes("aureliaI18nConfigurationAdmissionSource") ||
    row.registrationExpressionTexts.some((text) => text.includes("I18nConfiguration"))
  ) {
    capabilityIds.push("i18n:admission", "plugin:feature-admission");
  }
  if (
    row.importModuleSpecifiers.includes("@aurelia/validation-html") ||
    row.importNames.includes("ValidationHtmlConfiguration") ||
    row.admissionHelperNames.includes("aureliaValidationHtmlConfigurationAdmissionSource") ||
    row.registrationExpressionTexts.some((text) => text.includes("ValidationHtmlConfiguration"))
  ) {
    capabilityIds.push("validation-html:admission", "plugin:feature-admission");
  }
  if (
    row.importModuleSpecifiers.includes("@aurelia/ui-virtualization") ||
    row.importNames.includes("DefaultVirtualizationConfiguration") ||
    row.admissionHelperNames.includes("aureliaUiVirtualizationConfigurationAdmissionSource") ||
    row.registrationExpressionTexts.some((text) => text.includes("DefaultVirtualizationConfiguration"))
  ) {
    capabilityIds.push("ui-virtualization:admission", "plugin:feature-admission");
  }
  return capabilityIds;
}

function sourceSignalsForPart(row: SourceDerivedPartCatalogRow): readonly string[] {
  return uniqueSortedStrings([
    ...row.valueChannelNames.map((valueChannel) => `value-channel:${valueChannel}`),
    ...(row.valueChannelResolutionName === null ? [] : [`value-channel-resolution:${row.valueChannelResolutionName}`]),
    ...(row.resourceRef === null ? [] : [
      `resource:${row.resourceRef.packageName ?? "unknown"}:${row.resourceRef.resourceKind ?? "unknown"}:${row.resourceRef.resourceName ?? "unknown"}`,
    ]),
    ...(row.syntaxPackageName === null ? [] : [`syntax-package:${row.syntaxPackageName}`]),
    ...(row.syntaxCommandName === null ? [] : [`syntax-command:${row.syntaxCommandName}`]),
    ...(row.frameworkSyntaxName === null ? [] : [`framework-syntax:${row.frameworkSyntaxName}`]),
    ...(row.frameworkApiModuleSpecifier === null ? [] : [`framework-api-module:${row.frameworkApiModuleSpecifier}`]),
    ...(row.frameworkApiName === null ? [] : [`framework-api:${row.frameworkApiName}`]),
    ...(row.resourceMetadataName === null ? [] : [`resource-metadata:${row.resourceMetadataName}`]),
    ...(row.componentLifecycleHookName === null ? [] : [`component-lifecycle-hook:${row.componentLifecycleHookName}`]),
  ]);
}

function sourceSignalsForSourcePlan(row: SourceDerivedSourcePlanRow): readonly string[] {
  return uniqueSortedStrings([
    `entrypoint-helper:${row.helperName}`,
    ...row.admissionHelperNames.map((helperName) => `configuration-admission-helper:${helperName}`),
    ...row.importModuleSpecifiers.map((specifier) => `configuration-import:${specifier}`),
    ...row.importNames.map((importName) => `configuration-import-name:${importName}`),
    ...row.registrationExpressionTexts.map((text) => `registration-expression:${text}`),
    ...row.routerFeatureSignals,
  ]);
}

function enumStringMembers(
  sourceFile: ts.SourceFile,
  enumName: string,
): readonly { readonly name: string; readonly value: string }[] {
  const members: { readonly name: string; readonly value: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isEnumDeclaration(node) && node.name.text === enumName) {
      for (const member of node.members) {
        const name = ts.isIdentifier(member.name) ? member.name.text : member.name.getText(sourceFile);
        const initializer = member.initializer;
        if (initializer !== undefined && ts.isStringLiteralLike(initializer)) {
          members.push({ name, value: initializer.text });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return members;
}

function sourceFileHasIdentifier(
  sourceProject: SourceProject,
  sourceFilePath: string,
  identifierName: string,
): boolean {
  return identifierNamesInSourceFile(sourceProject, sourceFilePath).has(identifierName);
}

function sourceFileHasEnumMemberUse(
  sourceProject: SourceProject,
  sourceFilePath: string,
  enumName: string,
  memberName: string,
): boolean {
  const sourceFile = sourceProject.readSourceFile(sourceFilePath);
  if (sourceFile === null) {
    return false;
  }
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === enumName
      && node.name.text === memberName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function sourceFileTextIncludes(
  sourceProject: SourceProject,
  sourceFilePath: string,
  needle: string,
): boolean {
  const sourceFile = sourceProject.readSourceFile(sourceFilePath);
  return sourceFile !== null && sourceFile.getFullText().includes(needle);
}

function uniqueLocalities(
  localities: readonly FrameworkCapabilityLocality[],
): readonly FrameworkCapabilityLocality[] {
  return [...new Set(localities)].sort() as FrameworkCapabilityLocality[];
}

function uniqueSourceRoles(
  roles: readonly AppBuilderAxisSourceRole[],
): readonly AppBuilderAxisSourceRole[] {
  return [...new Set(roles)].sort() as AppBuilderAxisSourceRole[];
}

function dedupeRequirements(
  requirements: readonly FrameworkCapabilityRequirementRef[],
): readonly FrameworkCapabilityRequirementRef[] {
  const seen = new Set<string>();
  const deduped: FrameworkCapabilityRequirementRef[] = [];
  for (const requirement of requirements) {
    const key = `${requirement.kind}:${requirement.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(requirement);
    }
  }
  return deduped;
}
