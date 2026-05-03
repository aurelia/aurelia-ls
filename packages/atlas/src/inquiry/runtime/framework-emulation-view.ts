import { readFrameworkStandardConfigurationDiWorld } from "../../framework/di-world.js";
import type { FrameworkResourceDefinitionKind } from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { BasisKind } from "../basis.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkCompilerFilters } from "./framework-compiler-model.js";
import {
  readFrameworkAttributeClassificationRows,
  readFrameworkCompileFlowRows,
} from "./framework-compiler-flow.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkResourceConvergenceRows } from "./framework-resource-lenses.js";
import {
  readFrameworkHydrationFlowRows,
  type FrameworkHydrationFlowFilters,
} from "./framework-rendering-hydration-flow.js";
import {
  readFrameworkRenderConsequenceRows,
  type FrameworkRenderConsequenceFilters,
} from "./framework-rendering-consequences.js";
import { countBy } from "./framework-support.js";

/** How semantic-runtime should approach one framework obligation. */
export type FrameworkEmulationMode =
  | "ecmascript-evaluation"
  | "semantic-runtime-emulator"
  | "virtualized-runtime"
  | "typescript-handoff"
  | "open-boundary";

/** Coarse semantic-runtime subsystem that owns an emulation obligation. */
export type FrameworkEmulationLayer =
  | "application-world"
  | "di-world"
  | "resource-catalog"
  | "jit-compilation"
  | "resolved-hydration"
  | "template-controller-virtualization"
  | "typechecker-reactivity";

/** Worklist kind for one framework behavior semantic-runtime needs to emulate or model. */
export type FrameworkEmulationObligationKind =
  | "evaluate-registration"
  | "materialize-di-key"
  | "resolve-dependency"
  | "admit-built-in-resource"
  | "compile-template"
  | "classify-template-attribute"
  | "hydrate-runtime"
  | "virtualize-template-controller"
  | "model-binding"
  | "model-observation";

export interface FrameworkEmulationFilters extends FrameworkDiscoveryFilters {
  readonly emulationLayer?: string;
  readonly emulationMode?: string;
  readonly obligationKind?: string;
  readonly targetName?: string;
}

/** One derived framework obligation for semantic-runtime emulation planning. */
export interface FrameworkEmulationObligationRow {
  readonly id: string;
  readonly layer: FrameworkEmulationLayer;
  readonly mode: FrameworkEmulationMode;
  readonly obligationKind: FrameworkEmulationObligationKind;
  readonly ownerName: string;
  readonly targetName: string;
  readonly targetKind: string;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly closure: "exact" | "modeled" | "partial" | "handoff" | "open";
  readonly sourceLens: LensId;
  readonly sourceProjection: string;
  readonly detailFilters: Readonly<Record<string, string>>;
  readonly basis: readonly BasisKind[];
  readonly source?: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

/** Compact value returned by framework.composition:emulation. */
export interface FrameworkEmulationViewValue {
  readonly schemaVersion: "atlas-framework-emulation-v0";
  readonly obligationCount: number;
  readonly layers: Readonly<Record<string, number>>;
  readonly modes: Readonly<Record<string, number>>;
  readonly obligationKinds: Readonly<Record<string, number>>;
  readonly closures: Readonly<Record<string, number>>;
  readonly handoffCount: number;
  readonly obligations?: readonly FrameworkEmulationObligationRow[];
}

/** Build a derived semantic-runtime emulation worklist from exact framework substrates. */
export function readFrameworkEmulationObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  const rows = [
    ...diWorldObligations(sourceProject),
    ...resourceObligations(sourceProject, filters),
    ...compilerObligations(sourceProject, filters),
    ...hydrationObligations(sourceProject, filters),
    ...renderConsequenceObligations(sourceProject, filters),
  ];
  return rows.filter((row) => emulationRowMatches(row, filters)).sort(compareRows);
}

/** Summarize emulation obligations without embedding row detail. */
export function frameworkEmulationValue(
  rows: readonly FrameworkEmulationObligationRow[],
): FrameworkEmulationViewValue {
  return {
    schemaVersion: "atlas-framework-emulation-v0",
    obligationCount: rows.length,
    layers: countBy(rows, (row) => row.layer),
    modes: countBy(rows, (row) => row.mode),
    obligationKinds: countBy(rows, (row) => row.obligationKind),
    closures: countBy(rows, (row) => row.closure),
    handoffCount: rows.filter(
      (row) =>
        row.mode === "typescript-handoff" ||
        row.mode === "virtualized-runtime" ||
        row.closure === "handoff",
    ).length,
  };
}

function diWorldObligations(
  sourceProject: SourceProject,
): readonly FrameworkEmulationObligationRow[] {
  const world = readFrameworkStandardConfigurationDiWorld(sourceProject);
  return [
    ...world.admissions.map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:di-admission:${row.id}`,
      layer: "application-world",
      mode: "ecmascript-evaluation",
      obligationKind: "evaluate-registration",
      ownerName: row.owner,
      targetName: row.value.name,
      targetKind: row.kind,
      closure: "exact",
      sourceLens: LensId.FrameworkDi,
      sourceProjection: "world",
      detailFilters: { query: row.value.name },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Evaluate ${row.owner} registration admission for ${row.value.name}.`,
    })),
    ...world.resolverSlots.map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:di-slot:${row.id}`,
      layer: "di-world",
      mode: "ecmascript-evaluation",
      obligationKind: "materialize-di-key",
      ownerName: row.key.name,
      targetName: row.provider.name,
      targetKind: row.strategy,
      closure: row.closure,
      sourceLens: LensId.FrameworkDi,
      sourceProjection: "world",
      detailFilters: { key: row.key.name },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source ?? row.provider.source ?? row.key.source,
      sourceRowId: row.id,
      summary: `Materialize DI key ${row.key.name} through ${row.strategy} provider ${row.provider.name}.`,
    })),
    ...world.resourceSlots.map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:di-resource:${row.id}`,
      layer: layerForResourceKey(row.key.name),
      mode: modeForResourceKey(row.key.name),
      obligationKind: obligationForResourceKey(row.key.name),
      ownerName: row.key.name,
      targetName: row.resource.name,
      targetKind: targetKindForResourceKey(row.key.name) ?? row.key.kind,
      closure: "exact",
      sourceLens: LensId.FrameworkDi,
      sourceProjection: "slots",
      detailFilters: { key: row.key.name },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source ?? row.resource.source ?? row.key.source,
      sourceRowId: row.id,
      summary: `Admit built-in resource ${row.resource.name} as ${row.key.name}.`,
    })),
    ...world.dependencies.map((row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:di-dependency:${row.id}`,
      layer: row.access === "find" ? "resource-catalog" : "di-world",
      mode: "ecmascript-evaluation",
      obligationKind: "resolve-dependency",
      ownerName: row.ownerProvider.name,
      targetName: row.dependencyKey.name,
      targetKind: row.access,
      closure: "exact",
      sourceLens: LensId.FrameworkDi,
      sourceProjection: "dependencies",
      detailFilters: {
        key: row.ownerKey.name,
        dependencyKey: row.dependencyKey.name,
      },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source ?? row.argumentSource,
      sourceRowId: row.id,
      summary: `${row.ownerProvider.name} ${row.access} resolves ${row.dependencyKey.name}.`,
    })),
  ];
}

function resourceObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkResourceConvergenceRows(sourceProject, filters).map(
    (row): FrameworkEmulationObligationRow => ({
      id: `framework-emulation:resource:${row.id}`,
      layer: layerForResource(row.resourceKind),
      mode: modeForResourceKind(row.resourceKind),
      obligationKind: obligationForResourceKind(row.resourceKind),
      ownerName: row.sourceExportName,
      targetName: row.targetName ?? row.resourceName ?? row.sourceExportName,
      targetKind: row.resourceKind,
      packageId: row.packageId,
      packageName: row.packageName,
      closure: row.openReasons.length === 0 ? "exact" : "partial",
      sourceLens: LensId.FrameworkResources,
      sourceProjection: "convergence",
      detailFilters: {
        packageId: row.packageId,
        resourceKind: row.resourceKind,
        targetName: row.targetName ?? row.sourceExportName,
      },
      basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      source: row.source,
      sourceRowId: row.id,
      summary: `Semantic-runtime needs a ${modeForResourceKind(row.resourceKind)} row for ${row.resourceKind} ${row.targetName ?? row.sourceExportName}.`,
    }),
  );
}

function compilerObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  const compilerFilters: FrameworkCompilerFilters = filters;
  return [
    ...readFrameworkCompileFlowRows(sourceProject, compilerFilters).map(
      (row): FrameworkEmulationObligationRow => ({
        id: `framework-emulation:compile-flow:${row.id}`,
        layer: "jit-compilation",
        mode: "semantic-runtime-emulator",
        obligationKind: "compile-template",
        ownerName: row.ownerName,
        targetName: row.targetName ?? row.stage,
        targetKind: row.stage,
        packageId: "template-compiler",
        packageName: "@aurelia/template-compiler",
        closure: "exact",
        sourceLens: LensId.FrameworkCompiler,
        sourceProjection: "compile-flow",
        detailFilters: { compileStage: row.stage },
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        source: row.source,
        sourceRowId: row.id,
        summary: `Emulate TemplateCompiler ${row.stage}: ${row.summary}`,
      }),
    ),
    ...readFrameworkAttributeClassificationRows(sourceProject, compilerFilters).map(
      (row): FrameworkEmulationObligationRow => ({
        id: `framework-emulation:attribute-classification:${row.id}`,
        layer:
          row.targetKind === "template-controller"
            ? "template-controller-virtualization"
            : "jit-compilation",
        mode:
          row.targetKind === "template-controller"
            ? "virtualized-runtime"
            : "semantic-runtime-emulator",
        obligationKind:
          row.targetKind === "template-controller"
            ? "virtualize-template-controller"
            : "classify-template-attribute",
        ownerName: row.ownerName,
        targetName: row.targetKind ?? row.branchKind,
        targetKind: row.branchKind,
        packageId: "template-compiler",
        packageName: "@aurelia/template-compiler",
        closure: "exact",
        sourceLens: LensId.FrameworkCompiler,
        sourceProjection: "attribute-classification",
        detailFilters: { branchKind: row.branchKind },
        basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        source: row.source,
        sourceRowId: row.id,
        summary: `Classify template attribute branch ${row.branchKind}: ${row.summary}`,
      }),
    ),
  ];
}

function hydrationObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkHydrationFlowRows(
    sourceProject,
    filters as FrameworkHydrationFlowFilters,
  ).map((row): FrameworkEmulationObligationRow => ({
    id: `framework-emulation:hydration:${row.id}`,
    layer: layerForHydrationTarget(row.targetKind),
    mode: modeForHydrationTarget(row.targetKind),
    obligationKind: obligationForHydrationTarget(row.targetKind),
    ownerName: row.ownerName,
    targetName: row.targetName ?? row.targetKind,
    targetKind: row.targetKind,
    packageId: row.packageId,
    packageName: row.packageName,
    closure: row.targetKind === "template-controller" ? "handoff" : "exact",
    sourceLens: LensId.FrameworkRendering,
    sourceProjection: "hydration-flow",
    detailFilters: {
      operation: row.operation,
      targetKind: row.targetKind,
      ownerName: row.ownerName,
    },
    basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
    source: row.source,
    sourceRowId: row.id,
    summary: `Hydration/runtime must ${row.operation} ${row.targetName ?? row.targetKind}: ${row.summary}`,
  }));
}

function renderConsequenceObligations(
  sourceProject: SourceProject,
  filters: FrameworkEmulationFilters,
): readonly FrameworkEmulationObligationRow[] {
  return readFrameworkRenderConsequenceRows(
    sourceProject,
    filters as FrameworkRenderConsequenceFilters,
  ).map((row): FrameworkEmulationObligationRow => ({
    id: `framework-emulation:render-consequence:${row.id}`,
    layer: layerForConsequence(row.consequenceKind),
    mode: modeForConsequence(row.consequenceKind),
    obligationKind: obligationForConsequence(row.consequenceKind),
    ownerName: row.actorName,
    targetName: row.targetName,
    targetKind: row.targetKind,
    packageId: row.packageId,
    packageName: row.packageName,
    closure:
      modeForConsequence(row.consequenceKind) === "typescript-handoff"
        ? "handoff"
        : "exact",
    sourceLens: LensId.FrameworkRendering,
    sourceProjection: "render-consequences",
    detailFilters: {
      consequenceKind: row.consequenceKind,
      ...row.detailFilters,
    },
    basis: [BasisKind.SourceText, BasisKind.TypeScriptChecker],
    source: row.source,
    sourceRowId: row.id,
    summary: `Rendering consequence ${row.consequenceKind}: ${row.summary}`,
  }));
}

function layerForResource(
  kind: FrameworkResourceDefinitionKind,
): FrameworkEmulationLayer {
  if (kind === "template-controller") {
    return "template-controller-virtualization";
  }
  if (kind === "binding-behavior" || kind === "value-converter") {
    return "typechecker-reactivity";
  }
  return "resource-catalog";
}

function modeForResourceKind(
  kind: FrameworkResourceDefinitionKind,
): FrameworkEmulationMode {
  if (kind === "template-controller") {
    return "virtualized-runtime";
  }
  if (kind === "binding-behavior" || kind === "value-converter") {
    return "typescript-handoff";
  }
  return "semantic-runtime-emulator";
}

function modeForResourceKey(key: string): FrameworkEmulationMode {
  if (key.startsWith("template-controller:")) {
    return "virtualized-runtime";
  }
  if (
    key.startsWith("binding-behavior:") ||
    key.startsWith("value-converter:")
  ) {
    return "typescript-handoff";
  }
  return "semantic-runtime-emulator";
}

function layerForResourceKey(key: string): FrameworkEmulationLayer {
  if (key.startsWith("template-controller:")) {
    return "template-controller-virtualization";
  }
  if (
    key.startsWith("binding-behavior:") ||
    key.startsWith("value-converter:")
  ) {
    return "typechecker-reactivity";
  }
  return "resource-catalog";
}

function obligationForResourceKey(
  key: string,
): FrameworkEmulationObligationKind {
  if (key.startsWith("template-controller:")) {
    return "virtualize-template-controller";
  }
  if (
    key.startsWith("binding-behavior:") ||
    key.startsWith("value-converter:")
  ) {
    return "model-binding";
  }
  return "admit-built-in-resource";
}

function targetKindForResourceKey(key: string): string | null {
  const separator = key.indexOf(":");
  return separator === -1 ? null : key.slice(0, separator);
}

function obligationForResourceKind(
  kind: FrameworkResourceDefinitionKind,
): FrameworkEmulationObligationKind {
  if (kind === "template-controller") {
    return "virtualize-template-controller";
  }
  if (kind === "binding-behavior" || kind === "value-converter") {
    return "model-binding";
  }
  return "admit-built-in-resource";
}

function modeForHydrationTarget(targetKind: string): FrameworkEmulationMode {
  if (targetKind === "template-controller") {
    return "virtualized-runtime";
  }
  if (targetKind === "observer" || targetKind === "binding") {
    return "typescript-handoff";
  }
  return "semantic-runtime-emulator";
}

function layerForHydrationTarget(targetKind: string): FrameworkEmulationLayer {
  if (targetKind === "template-controller") {
    return "template-controller-virtualization";
  }
  if (targetKind === "observer" || targetKind === "binding") {
    return "typechecker-reactivity";
  }
  return "resolved-hydration";
}

function obligationForHydrationTarget(
  targetKind: string,
): FrameworkEmulationObligationKind {
  if (targetKind === "template-controller") {
    return "virtualize-template-controller";
  }
  if (targetKind === "observer") {
    return "model-observation";
  }
  if (targetKind === "binding") {
    return "model-binding";
  }
  return "hydrate-runtime";
}

function layerForConsequence(kind: string): FrameworkEmulationLayer {
  switch (kind) {
    case "template-controller-link":
      return "template-controller-virtualization";
    case "binding-effect":
    case "observer-lookup":
    case "observation-setup":
      return "typechecker-reactivity";
    default:
      return "resolved-hydration";
  }
}

function modeForConsequence(kind: string): FrameworkEmulationMode {
  switch (kind) {
    case "template-controller-link":
      return "virtualized-runtime";
    case "binding-effect":
    case "observer-lookup":
    case "observation-setup":
      return "typescript-handoff";
    default:
      return "semantic-runtime-emulator";
  }
}

function obligationForConsequence(
  kind: string,
): FrameworkEmulationObligationKind {
  switch (kind) {
    case "binding-admission":
    case "binding-effect":
    case "binding-production":
      return "model-binding";
    case "observer-lookup":
    case "observation-setup":
      return "model-observation";
    case "template-controller-link":
      return "virtualize-template-controller";
    default:
      return "hydrate-runtime";
  }
}

function emulationRowMatches(
  row: FrameworkEmulationObligationRow,
  filters: FrameworkEmulationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.resourceKind === undefined ||
      row.targetKind === filters.resourceKind) &&
    (filters.emulationLayer === undefined ||
      row.layer === filters.emulationLayer) &&
    (filters.emulationMode === undefined ||
      row.mode === filters.emulationMode) &&
    (filters.obligationKind === undefined ||
      row.obligationKind === filters.obligationKind) &&
    (filters.targetName === undefined ||
      row.targetName === filters.targetName ||
      row.ownerName === filters.targetName) &&
    (filters.query === undefined ||
      row.ownerName.includes(filters.query) ||
      row.targetName.includes(filters.query) ||
      row.targetKind.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function compareRows(
  left: FrameworkEmulationObligationRow,
  right: FrameworkEmulationObligationRow,
): number {
  return (
    layerPriority(left.layer) - layerPriority(right.layer) ||
    modePriority(left.mode) - modePriority(right.mode) ||
    left.obligationKind.localeCompare(right.obligationKind) ||
    left.ownerName.localeCompare(right.ownerName) ||
    left.targetName.localeCompare(right.targetName)
  );
}

function layerPriority(layer: FrameworkEmulationLayer): number {
  switch (layer) {
    case "application-world":
      return 0;
    case "di-world":
      return 1;
    case "resource-catalog":
      return 2;
    case "jit-compilation":
      return 3;
    case "resolved-hydration":
      return 4;
    case "template-controller-virtualization":
      return 5;
    case "typechecker-reactivity":
      return 6;
  }
}

function modePriority(mode: FrameworkEmulationMode): number {
  switch (mode) {
    case "ecmascript-evaluation":
      return 0;
    case "semantic-runtime-emulator":
      return 1;
    case "virtualized-runtime":
      return 2;
    case "typescript-handoff":
      return 3;
    case "open-boundary":
      return 4;
  }
}
