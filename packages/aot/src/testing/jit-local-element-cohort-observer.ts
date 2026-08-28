import { createHash } from "node:crypto";

import { CustomElement, type CustomElementDefinition } from "@aurelia/runtime-html";

import type { CompilerCase } from "./compiler-case.js";
import { assertCompilerCaseData, canonicalCompilerJson } from "./compiler-canonical-data.js";
import {
  normalizeJitCompiledDefinitionFamily,
  type JitCompilerBlueprintDefinition,
} from "./jit-compiler-blueprint-observer.js";
import type { JitCompilerCaseExecutor } from "./jit-compiler-case-executor.js";
import type { JitCompiledDefinition, JitCompilerOracle } from "./jit-compiler-oracle.js";

export const JIT_LOCAL_ELEMENT_COHORT_OBSERVER_VERSION =
  "aurelia-ls/aot-jit-local-element-cohort/v1" as const;

export type JitLocalElementDependencyReference =
  | { readonly kind: "source-dependency"; readonly sourceIndex: number }
  | { readonly kind: "entry-owner-type" }
  | { readonly kind: "local-type"; readonly localIndex: number };

export interface JitLocalElementRawBindable {
  readonly property: string;
  readonly name: string;
  readonly attribute: string | null;
  readonly mode: string | number;
}

export interface JitLocalElementNormalizedBindable {
  readonly property: string;
  readonly name: string;
  readonly attribute: string;
  readonly callback: string;
  readonly mode: number;
}

export interface JitLocalElementDefinitionObservation {
  readonly localIndex: number;
  readonly parentLocalIndex: number | null;
  readonly declarationOrdinal: number;
  readonly name: string;
  readonly generatedTypeName: string;
  readonly rawTemplate: string;
  readonly rawBindables: readonly JitLocalElementRawBindable[];
  readonly normalizedBindables: readonly JitLocalElementNormalizedBindable[];
  readonly initialNeedsCompile: boolean;
  readonly initialDependencies: readonly JitLocalElementDependencyReference[];
  readonly compiledDefinitions: readonly JitCompilerBlueprintDefinition[];
}

export interface JitLocalElementCohortObservationData {
  readonly schemaVersion: typeof JIT_LOCAL_ELEMENT_COHORT_OBSERVER_VERSION;
  readonly caseId: string;
  readonly sourceDependencyCount: number;
  readonly rootDependencies: readonly JitLocalElementDependencyReference[];
  readonly localDefinitions: readonly JitLocalElementDefinitionObservation[];
}

export class JitLocalElementCohortObservation {
  readonly canonicalData: string;
  readonly digest: string;

  constructor(readonly data: JitLocalElementCohortObservationData) {
    assertCompilerCaseData(data, `${data.caseId}/jit-local-element-cohort`);
    this.canonicalData = canonicalCompilerJson(data);
    this.digest = `sha256:${createHash("sha256").update(this.canonicalData).digest("hex")}`;
  }
}

/** Recursively compiles the generated local-Type forest retained behind one real root JIT invocation. */
export class JitLocalElementCohortObserver {
  constructor(readonly executor: JitCompilerCaseExecutor) {}

  async observeCase(candidate: CompilerCase, oracle: JitCompilerOracle): Promise<JitLocalElementCohortObservation> {
    if (
      candidate.world.entry.kind !== "compile"
      || candidate.world.entry.entryType?.kind !== "entry-custom-element-type"
      || candidate.world.registrations.some((registration) => registration.site !== "definition-dependency")
    ) {
      throw new Error(
        `Local-element cohort case '${candidate.id}' requires one oracle-owned entry Type and dependency-only world inputs.`,
      );
    }
    return this.executor.inspectOutcome(candidate, oracle, (outcome, request) => {
      if (outcome.kind !== "compiled-definition" || outcome.value.Type == null) {
        throw new Error(`Local-element cohort case '${candidate.id}' did not produce one typed compiled definition.`);
      }
      const sourceDependencyCount = sourceDependencyCountFor(candidate);
      const sourceDependencies = request.definition.dependencies ?? [];
      const rootDependencies = outcome.value.dependencies ?? [];
      if (
        sourceDependencies.length !== sourceDependencyCount
        || request.definition.Type !== outcome.value.Type
        || sourceDependencies.some((dependency, index) => rootDependencies[index] !== dependency)
      ) {
        throw new Error(`Local-element cohort case '${candidate.id}' lost its materialized source dependency prefix.`);
      }
      const collector = new LocalElementCohortCollector(
        oracle,
        outcome.value.Type,
        sourceDependencies,
        candidate.world.compiler.resolveResources,
        candidate.world.compiler.debug,
      );
      collector.discover(outcome.value, null, sourceDependencyCount);
      return new JitLocalElementCohortObservation({
        schemaVersion: JIT_LOCAL_ELEMENT_COHORT_OBSERVER_VERSION,
        caseId: candidate.id,
        sourceDependencyCount,
        rootDependencies: collector.dependencyReferences(rootDependencies),
        localDefinitions: collector.observations(),
      });
    });
  }
}

interface LocalElementNode {
  readonly localIndex: number;
  readonly parentLocalIndex: number | null;
  readonly declarationOrdinal: number;
  readonly Type: object;
  readonly initialDefinition: CustomElementDefinition;
  readonly raw: GeneratedLocalElementMetadata;
  compiled: JitCompiledDefinition | null;
}

interface GeneratedLocalElementMetadata {
  readonly name: string;
  readonly template: globalThis.HTMLTemplateElement;
  readonly bindables?: Readonly<Record<string, {
    readonly name: string;
    readonly attribute?: string;
    readonly mode: string | number;
  }>>;
}

class LocalElementCohortCollector {
  private readonly localIndexByType = new Map<object, number>();
  private readonly sourceIndexByValue = new Map<unknown, number>();
  private readonly nodes: LocalElementNode[] = [];

  constructor(
    private readonly oracle: JitCompilerOracle,
    private readonly entryOwnerType: object,
    sourceDependencies: readonly unknown[],
    private readonly resolveResources: boolean,
    private readonly debug: boolean,
  ) {
    sourceDependencies.forEach((dependency, sourceIndex) => {
      if (this.sourceIndexByValue.has(dependency)) {
        throw new Error("Local-element cohort observer requires unique source dependency values.");
      }
      this.sourceIndexByValue.set(dependency, sourceIndex);
    });
  }

  discover(owner: JitCompiledDefinition, parentLocalIndex: number | null, inheritedDependencyCount: number): void {
    const ownerDependencies = owner.dependencies ?? [];
    if (ownerDependencies.length < inheritedDependencyCount) {
      throw new Error(`Local-element owner '${owner.name}' lost its inherited dependency prefix.`);
    }
    const localTypes = ownerDependencies.slice(inheritedDependencyCount);
    const cohortNodes = localTypes.map((Type, declarationOrdinal): LocalElementNode => {
      if (typeof Type !== "function" || !CustomElement.isType(Type) || this.localIndexByType.has(Type)) {
        throw new Error(`Local-element owner '${owner.name}' has a non-fresh generated dependency tail.`);
      }
      const initialDefinition = CustomElement.getDefinition(Type);
      const raw = generatedLocalMetadata(Type);
      const node: LocalElementNode = {
        localIndex: this.nodes.length,
        parentLocalIndex,
        declarationOrdinal,
        Type,
        initialDefinition,
        raw,
        compiled: null,
      };
      this.localIndexByType.set(Type, node.localIndex);
      this.nodes.push(node);
      return node;
    });
    for (const node of cohortNodes) {
      const compiled = this.oracle.compile({
        definition: node.initialDefinition,
        resolveResources: this.resolveResources,
        debug: this.debug,
      }).compiled;
      node.compiled = compiled;
      this.discover(compiled, node.localIndex, node.initialDefinition.dependencies.length);
    }
  }

  dependencyReferences(values: readonly unknown[]): readonly JitLocalElementDependencyReference[] {
    return values.map((value): JitLocalElementDependencyReference => {
      const sourceIndex = this.sourceIndexByValue.get(value);
      if (sourceIndex != null) return { kind: "source-dependency", sourceIndex };
      if (value === this.entryOwnerType) return { kind: "entry-owner-type" };
      const localIndex = typeof value === "object" || typeof value === "function"
        ? this.localIndexByType.get(value as object)
        : undefined;
      if (localIndex != null) return { kind: "local-type", localIndex };
      throw new Error("Local-element dependency graph contains an unclassified runtime value.");
    });
  }

  observations(): readonly JitLocalElementDefinitionObservation[] {
    return this.nodes.map((node) => {
      const compiled = node.compiled;
      if (compiled == null) throw new Error(`Local element '${node.initialDefinition.name}' was not compiled.`);
      return {
        localIndex: node.localIndex,
        parentLocalIndex: node.parentLocalIndex,
        declarationOrdinal: node.declarationOrdinal,
        name: node.initialDefinition.name,
        generatedTypeName: (node.Type as { readonly name?: string }).name ?? "",
        rawTemplate: node.raw.template.outerHTML,
        rawBindables: rawBindables(node.raw),
        normalizedBindables: normalizedBindables(node.initialDefinition),
        initialNeedsCompile: node.initialDefinition.needsCompile,
        initialDependencies: this.dependencyReferences(node.initialDefinition.dependencies),
        compiledDefinitions: normalizeJitCompiledDefinitionFamily(compiled, node.initialDefinition.name),
      };
    });
  }
}

function sourceDependencyCountFor(candidate: CompilerCase): number {
  const registrations = candidate.world.registrations.filter((registration) =>
    registration.site === "definition-dependency"
  );
  if (registrations.some((registration) => registration.cardinality !== "single")) {
    throw new Error(`Local-element cohort case '${candidate.id}' requires singular source dependencies.`);
  }
  return registrations.length;
}

function generatedLocalMetadata(Type: object): GeneratedLocalElementMetadata {
  const raw = (Type as { readonly $au?: unknown }).$au;
  if (raw == null || typeof raw !== "object") {
    throw new Error("Generated local-element Type has no raw static $au metadata.");
  }
  const metadata = raw as Partial<GeneratedLocalElementMetadata>;
  if (
    typeof metadata.name !== "string"
    || metadata.template == null
    || typeof metadata.template !== "object"
    || metadata.template.nodeName !== "TEMPLATE"
    || typeof metadata.template.outerHTML !== "string"
  ) {
    throw new Error("Generated local-element Type has no exact name or detached template metadata.");
  }
  return metadata as GeneratedLocalElementMetadata;
}

function rawBindables(metadata: GeneratedLocalElementMetadata): readonly JitLocalElementRawBindable[] {
  return Object.entries(metadata.bindables ?? {}).map(([property, bindable]) => ({
    property,
    name: bindable.name,
    attribute: bindable.attribute ?? null,
    mode: bindable.mode,
  }));
}

function normalizedBindables(definition: CustomElementDefinition): readonly JitLocalElementNormalizedBindable[] {
  return Object.entries(definition.bindables).map(([property, bindable]) => ({
    property,
    name: bindable.name,
    attribute: bindable.attribute,
    callback: bindable.callback,
    mode: bindable.mode,
  }));
}
