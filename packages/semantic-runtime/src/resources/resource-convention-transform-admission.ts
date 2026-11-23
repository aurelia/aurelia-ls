import path from 'node:path';
import { isViteConfigPath, isWebpackConfigPath } from '../kernel/source-classification.js';
import { aureliaWebpackLoader, readWebpackConventionRules } from './webpack-convention-rules.js';

import { createFilter } from '@rollup/pluginutils';
import ts from 'typescript';

import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import {
  StaticEvaluator,
  StaticEvaluationRuntimeValueResult,
  type StaticEvaluationRuntimeHost,
  type StaticEvaluationValueMetadataTransfer,
} from '../evaluation/evaluator.js';
import { readStaticCommonJsExportValue } from '../evaluation/commonjs.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics/contracts.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationDispatch,
  type StaticInvocationFrame,
} from '../evaluation/invocation.js';
import type { StaticModuleExternalValueResolver } from '../evaluation/module-evaluator.js';
import {
  EvaluationImportKind,
  type EvaluationImportEntry,
} from '../evaluation/module-graph.js';
import { DefaultEvaluationModuleResolutionPolicy } from '../evaluation/module-host.js';
import { DefaultStaticEvaluationPolicy } from '../evaluation/policy.js';
import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import { openSeamReasonKindsForEvaluationValue } from '../evaluation/boundary-open-reason.js';
import {
  closedStaticValueMemberValue,
  readStaticValueProperty,
  StaticValueMemberReadKind,
} from '../evaluation/property-access.js';
import { EvaluationValueEvidence } from '../evaluation/value-pressure.js';
import {
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
  type StaticProjectEvaluationAccess,
  StaticProjectEvaluationComputationPreparation,
  StaticProjectEvaluationComputationProfile,
  StaticProjectEvaluationOptions,
} from '../evaluation/project-evaluation.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  closedEvaluationPromiseFulfillment,
  readEvaluationCallability,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  SourceFileRole,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  EvidenceHandle,
} from '../kernel/handles.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { recordsForSourceOpenMaterialization } from '../kernel/source-open-seam.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';

const enum ConventionPluginOptionsCarrier {
  Direct = 'direct',
  ConventionsProperty = 'conventions-property',
}

interface ConventionPluginFactoryDescriptor {
  readonly moduleSpecifier: string;
  readonly exportNames: readonly string[];
  readonly optionsCarrier: ConventionPluginOptionsCarrier;
}

const AURELIA_VITE_PLUGIN_FACTORIES = new Map<string, ConventionPluginFactoryDescriptor>([
  ['@aurelia/vite-plugin', {
    moduleSpecifier: '@aurelia/vite-plugin',
    exportNames: ['default'],
    optionsCarrier: ConventionPluginOptionsCarrier.Direct,
  }],
  ['@aurelia-ls/aot-vite', {
    moduleSpecifier: '@aurelia-ls/aot-vite',
    exportNames: ['aureliaAot'],
    optionsCarrier: ConventionPluginOptionsCarrier.ConventionsProperty,
  }],
]);
const VITE_MODULES = new Set(['vite']);
const DEFAULT_VITE_INCLUDE = 'src/**/*.{ts,js,html}';

export type ConventionTransformSourcePattern = string | RegExp;

/** Exact convention-transform reach declared by an active build provider for one app-analysis invocation. */
export interface ResourceConventionTransformAdmissionInput {
  readonly providerModuleSpecifier: string;
  /** Absolute or relative base used by the provider when resolving string filter patterns. */
  readonly patternResolutionBase: string;
  readonly include: readonly ConventionTransformSourcePattern[];
  readonly exclude: readonly ConventionTransformSourcePattern[];
}

/** Captured provider declaration whose identity participates in app-analysis reuse. */
export class NormalizedResourceConventionTransformAdmission {
  readonly identityKey: string;

  constructor(
    readonly providerModuleSpecifier: string,
    readonly patternResolutionBase: string,
    readonly include: readonly ConventionTransformSourcePattern[],
    readonly exclude: readonly ConventionTransformSourcePattern[],
  ) {
    this.identityKey = JSON.stringify([
      providerModuleSpecifier,
      patternResolutionBase,
      include.map(conventionTransformSourcePatternIdentity),
      exclude.map(conventionTransformSourcePatternIdentity),
    ]);
  }
}

export function normalizeResourceConventionTransformAdmissions(
  inputs: readonly ResourceConventionTransformAdmissionInput[] | null | undefined,
): readonly NormalizedResourceConventionTransformAdmission[] {
  const normalized = (inputs ?? []).map((input, index) => {
    const providerModuleSpecifier = input.providerModuleSpecifier.trim();
    if (providerModuleSpecifier.length === 0) {
      throw new Error(`Convention-transform admission ${index} has a blank provider module specifier.`);
    }
    const patternResolutionBase = input.patternResolutionBase.trim();
    if (patternResolutionBase.length === 0) {
      throw new Error(`Convention-transform admission ${index} has a blank pattern resolution base.`);
    }
    return new NormalizedResourceConventionTransformAdmission(
      providerModuleSpecifier,
      path.normalize(path.resolve(patternResolutionBase)),
      normalizeConventionTransformSourcePatterns(input.include, index, 'include'),
      normalizeConventionTransformSourcePatterns(input.exclude, index, 'exclude'),
    );
  });
  return [...new Map(normalized.map((admission) => [admission.identityKey, admission])).values()];
}

export function resourceConventionTransformAdmissionsIdentityKey(
  admissions: readonly NormalizedResourceConventionTransformAdmission[],
): string {
  return JSON.stringify(admissions.map((admission) => admission.identityKey));
}

export class ResourceConventionTransformAdmission {
  constructor(
    readonly evidenceHandles: readonly EvidenceHandle[],
    private readonly projectRootDir: string,
    private readonly filter: (sourcePath: string) => boolean,
    private readonly requirePairedTemplateTransform = false,
  ) {}

  admits(source: SourceFileAdmission, pairedTemplate?: SourceFileAdmission): boolean {
    return this.filter(path.resolve(this.projectRootDir, source.path))
      && (!this.requirePairedTemplateTransform || pairedTemplate == null
        || this.filter(path.resolve(this.projectRootDir, pairedTemplate.path)));
  }
}

/** Project-local convention-transform evidence indexed by the authored sources it actually reaches. */
export class ResourceConventionTransformAdmissionIndex {
  constructor(
    private readonly configuredGroups: readonly (readonly ResourceConventionTransformAdmission[])[],
    private readonly invocation: readonly ResourceConventionTransformAdmission[],
  ) {}

  evidenceHandlesForSource(source: SourceFileAdmission, pairedTemplate?: SourceFileAdmission): readonly EvidenceHandle[] {
    const evidence = (admissions: readonly ResourceConventionTransformAdmission[]) => admissions
      .filter(admission => admission.admits(source, pairedTemplate))
      .flatMap(admission => admission.evidenceHandles);
    const fromInvocation = evidence(this.invocation);
    // With two configured build tools and no selected invocation, admit only their common reach.
    const configured = this.configuredGroups.map(evidence);
    return configured.every(group => group.length > 0) ? [...fromInvocation, ...configured.flat()] : fromInvocation;
  }
}

class ResourceConventionTransformRead {
  constructor(
    readonly sourceNode: ts.Node,
    readonly providerModuleSpecifier: string,
    readonly filter: (sourcePath: string) => boolean,
    readonly requirePairedTemplateTransform = false,
  ) {}
}

class ResourceConventionTransformOpen {
  constructor(
    readonly sourceNode: ts.Node,
    readonly summary: string,
    readonly reasonKinds: readonly OpenSeamReasonKind[],
  ) {}
}

class ResourceConventionTransformReadResult {
  constructor(
    readonly admissions: readonly ResourceConventionTransformRead[],
    readonly opens: readonly ResourceConventionTransformOpen[],
  ) {}
}

const enum ConventionPluginOptionsState {
  Enabled,
  Disabled,
  Open,
}

class ConventionPluginOptionsRead {
  constructor(
    readonly state: ConventionPluginOptionsState,
    readonly include: readonly ConventionTransformSourcePattern[] = [],
    readonly exclude: readonly ConventionTransformSourcePattern[] = [],
  ) {}
}

class ConventionPluginEvaluation {
  constructor(
    readonly call: ts.CallExpression,
    readonly options: EvaluationValueEvidence,
    readonly providerModuleSpecifier: string,
  ) {}
}

class ConventionPluginListRead {
  constructor(
    readonly plugins: readonly ConventionPluginEvaluation[],
    readonly closed: boolean,
  ) {}
}

type ConventionToolingFactoryValue = EvaluationBoundaryValue | EvaluationObjectValue;

function isConventionToolingFactoryValue(value: EvaluationValue): value is ConventionToolingFactoryValue {
  return value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.Object;
}

/** Profile-owned interpretation state for one Vite convention-tooling evaluation generation. */
export class ResourceConventionToolingEvaluationContext {
  private readonly plugins = new WeakMap<EvaluationObjectValue, ConventionPluginEvaluation>();
  private readonly aureliaPluginFactories = new WeakMap<ConventionToolingFactoryValue, ConventionPluginFactoryDescriptor>();
  private readonly defineConfigFactories = new WeakSet<ConventionToolingFactoryValue>();
  private readonly pathFunctions = new WeakMap<ConventionToolingFactoryValue, 'join' | 'resolve'>();
  private readonly executedAureliaPluginCalls = new WeakSet<ts.CallExpression>();

  readonly runtimeHost: StaticEvaluationRuntimeHost = {
    canShareSnapshotValue: (value: EvaluationValue) =>
      (value.kind !== EvaluationValueKind.Object || !this.plugins.has(value))
      && (!isConventionToolingFactoryValue(value) || (
        !this.aureliaPluginFactories.has(value)
        && !this.defineConfigFactories.has(value) && !this.pathFunctions.has(value)
      )),
    transferValueMetadata: (source, target, transfer) =>
      this.transferValueMetadata(source, target, transfer),
    evaluateInvocation: (frame, host) => this.evaluateInvocation(frame, host),
    resolveIdentifier: identifier => {
      if (identifier.text !== '__dirname') return null;
      const source = identifier.getSourceFile();
      if (!isWebpackConfigPath(source.fileName)) return null;
      // Bundler-mode Programs can leave plain JS unclassified. Only the actual CommonJS export
      // of such a script is accepted below, after checking the config's Node package scope.
      const commonJs = /\.c[jt]s$/iu.test(source.fileName) || source.impliedNodeFormat === ts.ModuleKind.CommonJS
        || (source.impliedNodeFormat == null && /\.js$/iu.test(source.fileName) && !ts.isExternalModule(source));
      if (!commonJs) return null;
      return new EvaluationStringValue(path.dirname(source.fileName), identifier);
    },
    resolveCommonJsRequire: (_moduleKey, moduleSpecifier, node) => {
      const value = this.resolveCommonJsRequire(moduleSpecifier, node);
      return value == null ? null : new StaticEvaluationRuntimeValueResult(value, null);
    },
  };

  readonly externalValueResolver: StaticModuleExternalValueResolver = {
    resolveImportValue: (_fromModuleKey, entry) => this.resolveExternalImport(entry),
  };

  isAureliaPluginCall(call: ts.CallExpression): boolean {
    return this.executedAureliaPluginCalls.has(call);
  }

  readPlugin(value: EvaluationValue): ConventionPluginEvaluation | null {
    return value.kind === EvaluationValueKind.Object
      ? this.plugins.get(value) ?? null
      : null;
  }

  private transferValueMetadata(
    source: EvaluationValue,
    target: EvaluationValue,
    transfer: StaticEvaluationValueMetadataTransfer,
  ): void {
    if (source.kind === EvaluationValueKind.Object && target.kind === EvaluationValueKind.Object) {
      const plugin = this.plugins.get(source);
      if (plugin != null) {
        this.plugins.set(target, new ConventionPluginEvaluation(
          plugin.call,
          new EvaluationValueEvidence(
            transfer.forkValue(plugin.options.value),
            plugin.options.openSeams,
          ),
          plugin.providerModuleSpecifier,
        ));
      }
    }
    if (isConventionToolingFactoryValue(source) && isConventionToolingFactoryValue(target)) {
      const pluginFactory = this.aureliaPluginFactories.get(source);
      if (pluginFactory != null) {
        this.aureliaPluginFactories.set(target, pluginFactory);
      }
      const pathFunction = this.pathFunctions.get(source);
      if (pathFunction != null) this.pathFunctions.set(target, pathFunction);
      if (this.defineConfigFactories.has(source)) {
        this.defineConfigFactories.add(target);
      }
    }
  }

  private evaluateInvocation(
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    if (frame.kind !== StaticInvocationKind.Call || !ts.isCallExpression(frame.node)) {
      return StaticInvocationNotApplicable;
    }
    const call = frame.node;
    const callee = frame.callee.value;
    if (!isConventionToolingFactoryValue(callee)) {
      return StaticInvocationNotApplicable;
    }
    const arguments_ = frame.argumentList.exactEvidence();
    if (arguments_ == null) {
      return staticInvocationValue(host.unknown(
        'Convention tooling factory argument positions did not close.',
        call,
        frame.moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      ));
    }
    const pathFunction = this.pathFunctions.get(callee);
    if (pathFunction != null) {
      const parts: string[] = [];
      for (const arg of arguments_) {
        if (arg.value.kind !== EvaluationValueKind.String || arg.openSeams.length) return StaticInvocationNotApplicable;
        parts.push(arg.value.value);
      }
      // A relative resolve needs webpack's invocation cwd, which the project frame doesn't establish.
      if (pathFunction === 'resolve' && !parts.some(part => path.isAbsolute(part))) return StaticInvocationNotApplicable;
      return staticInvocationValue(new EvaluationStringValue(path[pathFunction](...parts), call));
    }
    const firstArgument = arguments_[0]
      ?? new EvaluationValueEvidence(EvaluationUndefined, []);
    const pluginFactory = this.aureliaPluginFactories.get(callee);
    if (pluginFactory != null) {
      this.executedAureliaPluginCalls.add(call);
      const marker = new EvaluationObjectValue(new Map(), false, call);
      this.plugins.set(marker, new ConventionPluginEvaluation(
        call,
        this.conventionOptionsEvidence(pluginFactory, firstArgument, call, frame, host),
        pluginFactory.moduleSpecifier,
      ));
      return staticInvocationValue(marker, firstArgument.openSeams);
    }
    if (!this.defineConfigFactories.has(callee)) {
      return StaticInvocationNotApplicable;
    }
    // Vite's defineConfig retains its argument; the loader invokes the default export.
    return staticInvocationValue(firstArgument.value, firstArgument.openSeams);
  }

  private conventionOptionsEvidence(
    factory: ConventionPluginFactoryDescriptor,
    firstArgument: EvaluationValueEvidence,
    call: ts.CallExpression,
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValueEvidence {
    if (factory.optionsCarrier === ConventionPluginOptionsCarrier.Direct) {
      return firstArgument;
    }
    if (firstArgument.value.kind === EvaluationValueKind.Undefined) {
      return new EvaluationValueEvidence(EvaluationUndefined, []);
    }
    if (firstArgument.value.kind !== EvaluationValueKind.Object) {
      return new EvaluationValueEvidence(host.unknown(
        'AOT Vite convention options did not close to an object.',
        call.arguments[0] ?? call,
        frame.moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      ), firstArgument.openSeams);
    }
    const read = readStaticValueProperty(firstArgument.value, 'conventions', firstArgument.value.node ?? call);
    switch (read.kind) {
      case StaticValueMemberReadKind.Value:
      case StaticValueMemberReadKind.Candidate:
        return new EvaluationValueEvidence(read.value, read.openSeams);
      case StaticValueMemberReadKind.Getter:
      case StaticValueMemberReadKind.Open:
        return new EvaluationValueEvidence(host.unknown(
          'AOT Vite conventions property remained open.',
          call.arguments[0] ?? call,
          frame.moduleKey,
          EvaluationOpenSeamKind.DynamicCall,
        ), read.openSeams);
    }
  }

  private resolveCommonJsRequire(
    moduleSpecifier: string,
    node: ts.Node,
  ): EvaluationValue | null {
    if (moduleSpecifier === 'path' || moduleSpecifier === 'node:path') return this.nodePathModule(node);
    const pluginFactory = AURELIA_VITE_PLUGIN_FACTORIES.get(moduleSpecifier);
    if (pluginFactory != null) {
      return this.aureliaPluginModuleValue(pluginFactory, node);
    }
    if (VITE_MODULES.has(moduleSpecifier)) {
      return this.viteModuleValue(moduleSpecifier, node);
    }
    return null;
  }

  private resolveExternalImport(entry: EvaluationImportEntry): EvaluationValue | null {
    if (entry.moduleSpecifier === 'path' || entry.moduleSpecifier === 'node:path') {
      if (entry.importKind === EvaluationImportKind.Default || entry.importKind === EvaluationImportKind.Namespace) {
        return this.nodePathModule(entry.node);
      }
      if (entry.importKind === EvaluationImportKind.Named && (entry.exportName === 'join' || entry.exportName === 'resolve')) {
        return this.nodePathFunction(entry.exportName, entry.node);
      }
    }
    const pluginFactory = AURELIA_VITE_PLUGIN_FACTORIES.get(entry.moduleSpecifier);
    if (pluginFactory != null) {
      if (
        (entry.importKind === EvaluationImportKind.Default && pluginFactory.exportNames.includes('default'))
        || (
          entry.importKind === EvaluationImportKind.Named
          && entry.exportName != null
          && pluginFactory.exportNames.includes(entry.exportName)
        )
      ) {
        return this.aureliaPluginFactory(pluginFactory, entry.exportName ?? 'default', entry.node);
      }
      return entry.importKind === EvaluationImportKind.Namespace
        ? this.aureliaPluginModuleValue(pluginFactory, entry.node)
        : null;
    }
    if (!VITE_MODULES.has(entry.moduleSpecifier)) {
      return null;
    }
    if (entry.importKind === EvaluationImportKind.Named && entry.exportName === 'defineConfig') {
      return this.defineConfigFactory(entry.moduleSpecifier, entry.node);
    }
    return entry.importKind === EvaluationImportKind.Namespace
      ? this.viteModuleValue(entry.moduleSpecifier, entry.node)
      : null;
  }

  private nodePathModule(node: ts.Node): EvaluationObjectValue {
    const members = new Map<string, EvaluationObjectProperty>();
    for (const name of ['join', 'resolve'] as const) {
      members.set(name, new EvaluationObjectProperty(name, this.nodePathFunction(name, node), node, EvaluationObjectPropertyState.Closed));
    }
    return new EvaluationObjectValue(members, true, node);
  }

  private nodePathFunction(name: 'join' | 'resolve', node: ts.Node): EvaluationBoundaryValue {
    const fn = new EvaluationBoundaryValue(EvaluationBoundaryKind.ExternalModule, `node:path.${name}`, node);
    this.pathFunctions.set(fn, name);
    return fn;
  }

  private aureliaPluginModuleValue(
    descriptor: ConventionPluginFactoryDescriptor,
    node: ts.Node,
  ): EvaluationObjectValue {
    const properties = new Map<string, EvaluationObjectProperty>();
    for (const exportName of descriptor.exportNames) {
      properties.set(exportName, new EvaluationObjectProperty(
        exportName,
        this.aureliaPluginFactory(descriptor, exportName, node),
        node,
        EvaluationObjectPropertyState.Closed,
      ));
    }
    const namespace = new EvaluationObjectValue(properties, false, node);
    this.aureliaPluginFactories.set(namespace, descriptor);
    return namespace;
  }

  private aureliaPluginFactory(
    descriptor: ConventionPluginFactoryDescriptor,
    exportName: string,
    node: ts.Node,
  ): EvaluationBoundaryValue {
    const factory = new EvaluationBoundaryValue(
      EvaluationBoundaryKind.ExternalModule,
      `${descriptor.moduleSpecifier}.${exportName}`,
      node,
    );
    this.aureliaPluginFactories.set(factory, descriptor);
    return factory;
  }

  private viteModuleValue(moduleSpecifier: string, node: ts.Node): EvaluationObjectValue {
    const defineConfig = this.defineConfigFactory(moduleSpecifier, node);
    return new EvaluationObjectValue(new Map([
      ['defineConfig', new EvaluationObjectProperty('defineConfig', defineConfig, node, EvaluationObjectPropertyState.Closed)],
    ]), false, node);
  }

  private defineConfigFactory(moduleSpecifier: string, node: ts.Node): EvaluationBoundaryValue {
    const factory = new EvaluationBoundaryValue(
      EvaluationBoundaryKind.ExternalModule,
      `${moduleSpecifier}.defineConfig`,
      node,
    );
    this.defineConfigFactories.add(factory);
    return factory;
  }
}

export const enum ResourceConventionToolingEvaluationProfileKind {
  /** Stable tooling-profile identity; the revision differentiates the supported config semantics. */
  Vite = 'aurelia-vite-convention-tooling',
}

/** Static-evaluation profile for project tooling that controls convention-derived resource admission. */
export const resourceConventionToolingEvaluationProfile = new StaticProjectEvaluationComputationProfile(
  ResourceConventionToolingEvaluationProfileKind.Vite,
  '2',
  'Build configuration evaluation with Aurelia Vite plugin and webpack rule evidence.',
  () => {
    const context = new ResourceConventionToolingEvaluationContext();
    return new StaticProjectEvaluationComputationPreparation(
      new StaticProjectEvaluationOptions(
        DefaultStaticEvaluationPolicy,
        context.runtimeHost,
        context.externalValueResolver,
        DefaultEvaluationModuleResolutionPolicy,
        [SourceFileRole.ToolingConfig],
      ),
      context,
    );
  },
);

class ResourceConventionTransformEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly admission: ResourceConventionTransformAdmission,
  ) {}
}

/** Publish build-provider evidence for the specific authored sources that receive convention transforms. */
export class ResourceConventionTransformAdmissionMaterializer {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluationAccess: StaticProjectEvaluationAccess<ResourceConventionToolingEvaluationContext>,
    publication: KernelPublicationContext,
    providerAdmissions: readonly NormalizedResourceConventionTransformAdmission[] = [],
  ): ResourceConventionTransformAdmissionIndex {
    if (!evaluationAccess.generation.belongsToProject(project)) {
      throw new Error(`Convention-tooling evaluation belongs to another project semantic frame.`);
    }
    const baseline = evaluationAccess.readBaseline();
    const configs = conventionConfigSources(baseline);
    const evaluation = configs.some(source => exportedConfigValue(source, project)?.kind === EvaluationValueKind.Function)
      ? evaluationAccess.forkSession() : baseline;
    const toolingHost = evaluationAccess.readBaselineContext();
    const configured = new Map<string, ResourceConventionTransformEmission[]>();
    const openRecords: KernelStoreRecord[] = [];
    for (const source of evaluation === baseline ? configs : conventionConfigSources(evaluation)) {
      const webpack = isWebpackConfigPath(source.admission.path);
      const exported = exportedConfigValue(source, project);
      const factory = exported?.kind === EvaluationValueKind.Function
        ? new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost).evaluateFunctionValue(
            exported, exported.declaration, source.moduleKey,
            webpack
              ? ['webpack.env', 'webpack.argv'].map(name => new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, name, new Map(), exported.declaration))
              : [new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, 'vite.config-env', new Map(), exported.declaration)],
            null, 'awaited',
          )
        : null;
      const config = factory == null ? exported : factory.abruptCompletion == null ? factory.value : null;
      const result = webpack
        ? readWebpackTransforms(source.sourceFile, config)
        : readConventionTransforms(
            [...source.evaluation.invocations, ...(factory?.invocations ?? [])]
              .map((invocation) => invocation.node)
              .filter(ts.isCallExpression)
              .filter((call) => toolingHost.isAureliaPluginCall(call)),
            config,
            toolingHost,
            project.rootDir,
          );
      const provider = webpack ? 'webpack' : 'vite';
      const group = configured.get(provider) ?? [];
      group.push(...result.admissions.map((read, index) =>
        conventionTransformEmission(store, project, source.admission, source.sourceFile, read, index)));
      configured.set(provider, group);
      openRecords.push(...result.opens.flatMap((open, index) =>
        recordsForSourceOpenMaterialization(store, {
          localKey: `resource-convention-transform-open:${project.projectKey}:${source.admission.path}:${index}`,
          openKind: KernelVocabulary.Resource.OpenConventionTransformAdmission.key,
          summary: open.summary,
          sourceFileAddressHandle: source.admission.addressHandle,
          start: open.sourceNode.getStart(source.sourceFile),
          end: open.sourceNode.end,
          evidenceRoles: [EvidenceRole.Admission, EvidenceRole.Configuration],
          reasonKinds: open.reasonKinds,
        }).records
      ));
    }
    const invocation = providerAdmissions.map(admission => providerConventionTransformEmission(store, project, admission));
    const groups = [...configured.values()];
    const records = [
      ...groups.flatMap(group => group.flatMap(emission => emission.records)),
      ...invocation.flatMap(emission => emission.records),
      ...openRecords,
    ];
    if (records.length > 0) {
      publication.publish(new KernelPublicationPlan(
        new KernelStoreBatch(records, `resource-convention-transforms:${project.projectKey}`),
      ));
    }
    return new ResourceConventionTransformAdmissionIndex(
      groups.map(group => group.map(emission => emission.admission)),
      invocation.map(emission => emission.admission),
    );
  }
}

function providerConventionTransformEmission(
  store: KernelStore,
  project: ProjectBootFrame,
  input: NormalizedResourceConventionTransformAdmission,
): ResourceConventionTransformEmission {
  const local = `resource-convention-transform-provider:${project.projectKey}:${stableKernelLocalHash(input.identityKey)}`;
  const evidenceHandle = store.handles.evidence(local);
  return new ResourceConventionTransformEmission(
    [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.External,
        [EvidenceRole.Admission, EvidenceRole.Configuration],
        `${input.providerModuleSpecifier} declares convention preprocessing for matching project sources `
        + `with string patterns resolved from ${input.patternResolutionBase}.`,
      ),
    ],
    new ResourceConventionTransformAdmission(
      [evidenceHandle],
      project.rootDir,
      createFilter(input.include, input.exclude, { resolve: input.patternResolutionBase }),
    ),
  );
}

function conventionTransformEmission(
  store: KernelStore,
  project: ProjectBootFrame,
  source: SourceFileAdmission,
  sourceFile: ts.SourceFile,
  read: ResourceConventionTransformRead,
  index: number,
): ResourceConventionTransformEmission {
  const local = `resource-convention-transform:${project.projectKey}:${source.path}:${index}`;
  const sourceAddressHandle = store.handles.address(local);
  const evidenceHandle = store.handles.evidence(local);
  return new ResourceConventionTransformEmission(
    [
      new SourceSpanAddress(
        sourceAddressHandle,
        source.addressHandle,
        read.sourceNode.getStart(sourceFile),
        read.sourceNode.end,
        SourceSpanRole.Range,
      ),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Admission, EvidenceRole.Configuration],
        `${read.providerModuleSpecifier} admits convention preprocessing for matching project sources.`,
        sourceAddressHandle,
      ),
    ],
    new ResourceConventionTransformAdmission(
      [source.evidenceHandle, evidenceHandle],
      project.rootDir,
      read.filter,
      read.requirePairedTemplateTransform,
    ),
  );
}

function conventionConfigSources(evaluation: StaticProjectEvaluationResult): readonly EvaluatedProjectSource[] {
  const tooling = evaluation.readEvaluatedSources().filter(source => source.admission.role === SourceFileRole.ToolingConfig);
  // The default webpack CLI searches the project root's popular extensions in this order.
  const webpack = ['js', 'mjs', 'cjs', 'ts', 'cts', 'mts']
    .map(ext => tooling.find(source => source.admission.path === `webpack.config.${ext}`))
    .find(source => source != null);
  const vite = tooling.filter(source => isViteConfigPath(source.admission.path));
  return webpack == null ? vite : [...vite, webpack];
}

function readWebpackTransforms(source: ts.SourceFile, exported: EvaluationValue | null): ResourceConventionTransformReadResult {
  const config = exported?.kind === EvaluationValueKind.Promise ? closedEvaluationPromiseFulfillment(exported) : exported;
  const rules = readWebpackConventionRules(config);
  const site = rules.ruleSource?.getSourceFile() === source ? rules.ruleSource : source;
  const admissions = !rules.hasLoader ? [] : [
    new ResourceConventionTransformRead(site, aureliaWebpackLoader, rules.admits, true),
  ];
  const opens = rules.open
    ? [new ResourceConventionTransformOpen(site,
      'The webpack loader configuration contains rules or options whose reach cannot be established statically.',
      [OpenSeamReasonKind.FeatureNotYetModeled])]
    : [];
  return new ResourceConventionTransformReadResult(admissions, opens);
}

function exportedConfigValue(source: EvaluatedProjectSource, project: ProjectBootFrame): EvaluationValue | null {
  const environment = source.evaluation.environment;
  const exported = environment.readValue('default');
  if (exported != null) return exported;
  if (isWebpackConfigPath(source.admission.path)) {
    // Node loads the config in its own package scope even if the application uses bundler resolution.
    const format = ts.getImpliedNodeFormatForFile(source.sourceFile.fileName, undefined, project.inputGeneration.host,
      { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext });
    if (format === ts.ModuleKind.ESNext) return null;
  }
  return readStaticCommonJsExportValue(environment, 'default');
}

function readConventionTransforms(
  calls: readonly ts.CallExpression[],
  exportedConfig: EvaluationValue | null,
  toolingHost: ResourceConventionToolingEvaluationContext,
  projectRootDir: string,
): ResourceConventionTransformReadResult {
  if (calls.length === 0) {
    return new ResourceConventionTransformReadResult([], []);
  }
  const config = exportedConfig?.kind === EvaluationValueKind.Promise
    ? closedEvaluationPromiseFulfillment(exportedConfig) : exportedConfig;
  if (config?.kind !== EvaluationValueKind.Object) {
    return openConventionTransformCalls(
      calls,
      'The Aurelia Vite conventions plugin is called, but the exported Vite configuration could not be closed statically.',
      exportedConfig,
    );
  }
  const then = closedStaticValueMemberValue(readStaticValueProperty(config, 'then', config.node));
  if (then == null || readEvaluationCallability(then) !== false) {
    return openConventionTransformCalls(calls, 'The exported Vite configuration may settle through a custom thenable.', config);
  }
  const pluginsRead = readStaticValueProperty(config, 'plugins', config.node);
  const pluginsValue = closedStaticValueMemberValue(pluginsRead);
  if (pluginsValue == null) {
    return openConventionTransformCalls(
      calls,
      'The Aurelia Vite conventions plugin is called, but the exported Vite plugin list could not be closed statically.',
      config,
      pluginsRead.kind === StaticValueMemberReadKind.Open ? pluginsRead.reasonKinds : [],
    );
  }
  if (pluginsValue.kind === EvaluationValueKind.Undefined) {
    return new ResourceConventionTransformReadResult([], []);
  }
  const list = readConventionPluginList(pluginsValue, toolingHost);
  const admissions: ResourceConventionTransformRead[] = [];
  const opens: ResourceConventionTransformOpen[] = [];
  const handledCalls = new Set<ts.CallExpression>();
  for (const plugin of list.plugins) {
    handledCalls.add(plugin.call);
    const options = plugin.options.openSeams.length === 0
      ? readConventionPluginOptions(plugin.options.value)
      : new ConventionPluginOptionsRead(ConventionPluginOptionsState.Open);
    switch (options.state) {
      case ConventionPluginOptionsState.Enabled:
        admissions.push(new ResourceConventionTransformRead(
          plugin.call,
          plugin.providerModuleSpecifier,
          createFilter(options.include, options.exclude, { resolve: projectRootDir }),
        ));
        break;
      case ConventionPluginOptionsState.Disabled:
        break;
      case ConventionPluginOptionsState.Open:
        opens.push(new ResourceConventionTransformOpen(
          plugin.call,
          'The Aurelia Vite conventions plugin uses transform options or source filters that could not be closed statically.',
          conventionTransformEvidenceOpenReasonKinds(plugin.options),
        ));
        break;
    }
  }
  if (!list.closed) {
    opens.push(...calls
      .filter((call) => !handledCalls.has(call))
      .map((call) => new ResourceConventionTransformOpen(
        call,
        'The Aurelia Vite conventions plugin is behind a plugin-list expression that could not be closed statically.',
        conventionTransformOpenReasonKinds(pluginsValue),
      )));
  }
  return new ResourceConventionTransformReadResult(admissions, opens);
}

function openConventionTransformCalls(
  calls: readonly ts.CallExpression[],
  summary: string,
  value: EvaluationValue | null,
  reasonKinds: readonly OpenSeamReasonKind[] = [],
): ResourceConventionTransformReadResult {
  return new ResourceConventionTransformReadResult(
    [],
    calls.map((call) => new ResourceConventionTransformOpen(
      call,
      summary,
      reasonKinds.length === 0 ? conventionTransformOpenReasonKinds(value) : reasonKinds,
    )),
  );
}

function conventionTransformOpenReasonKinds(
  value: EvaluationValue | null,
): readonly OpenSeamReasonKind[] {
  const reasonKinds = openSeamReasonKindsForEvaluationValue(value);
  return reasonKinds.length === 0
    ? [OpenSeamReasonKind.FeatureNotYetModeled]
    : reasonKinds;
}

function conventionTransformEvidenceOpenReasonKinds(
  evidence: EvaluationValueEvidence,
): readonly OpenSeamReasonKind[] {
  const reasonKinds = [
    ...evidence.openSeams.flatMap((seam) => seam.reasonKinds),
    ...openSeamReasonKindsForEvaluationValue(evidence.value),
  ];
  return reasonKinds.length === 0
    ? [OpenSeamReasonKind.FeatureNotYetModeled]
    : [...new Set(reasonKinds)];
}

function readConventionPluginList(
  value: EvaluationValue,
  toolingHost: ResourceConventionToolingEvaluationContext,
): ConventionPluginListRead {
  const plugin = toolingHost.readPlugin(value);
  if (plugin != null) {
    return new ConventionPluginListRead([plugin], true);
  }
  if (value.kind === EvaluationValueKind.Array) {
    const children = value.elements.map((element) =>
      readConventionPluginList(element.value, toolingHost)
    );
    return new ConventionPluginListRead(
      children.flatMap((child) => child.plugins),
      !value.mayHaveUnknownElements
        && !value.mayHaveUnknownOrder
        && children.every((child) => child.closed),
    );
  }
  if (value.kind === EvaluationValueKind.Promise) {
    const fulfillment = closedEvaluationPromiseFulfillment(value);
    return fulfillment == null
      ? new ConventionPluginListRead([], false)
      : readConventionPluginList(fulfillment, toolingHost);
  }
  return new ConventionPluginListRead(
    [],
    value.kind !== EvaluationValueKind.Unknown
      && value.kind !== EvaluationValueKind.BoundaryValue
      && value.kind !== EvaluationValueKind.BoundaryObject,
  );
}

function readConventionPluginOptions(value: EvaluationValue): ConventionPluginOptionsRead {
  if (value.kind === EvaluationValueKind.Undefined) {
    return new ConventionPluginOptionsRead(ConventionPluginOptionsState.Enabled, [DEFAULT_VITE_INCLUDE]);
  }
  if (value.kind !== EvaluationValueKind.Object) {
    return new ConventionPluginOptionsRead(ConventionPluginOptionsState.Open);
  }
  const enabledRead = readStaticValueProperty(value, 'enableConventions', value.node);
  const includeRead = readStaticValueProperty(value, 'include', value.node);
  const excludeRead = readStaticValueProperty(value, 'exclude', value.node);
  const enabled = closedStaticValueMemberValue(enabledRead);
  const includeValue = closedStaticValueMemberValue(includeRead);
  const excludeValue = closedStaticValueMemberValue(excludeRead);
  if (
    enabled == null
    || includeValue == null
    || excludeValue == null
  ) {
    return new ConventionPluginOptionsRead(ConventionPluginOptionsState.Open);
  }
  if (
    (enabled.kind === EvaluationValueKind.Boolean && !enabled.value)
    || enabled.kind === EvaluationValueKind.Null
  ) {
    return new ConventionPluginOptionsRead(ConventionPluginOptionsState.Disabled);
  }
  if (
    enabled.kind !== EvaluationValueKind.Undefined
    && (enabled.kind !== EvaluationValueKind.Boolean || !enabled.value)
  ) {
    return new ConventionPluginOptionsRead(ConventionPluginOptionsState.Open);
  }
  const include = readSourcePatterns(
    includeValue,
    [DEFAULT_VITE_INCLUDE],
  );
  const exclude = readSourcePatterns(
    excludeValue,
    [],
  );
  return include == null || exclude == null
    ? new ConventionPluginOptionsRead(ConventionPluginOptionsState.Open)
    : new ConventionPluginOptionsRead(ConventionPluginOptionsState.Enabled, include, exclude);
}

function readSourcePatterns(
  value: EvaluationValue,
  defaultPatterns: readonly ConventionTransformSourcePattern[],
): readonly ConventionTransformSourcePattern[] | null {
  switch (value.kind) {
    case EvaluationValueKind.Undefined:
      return defaultPatterns;
    case EvaluationValueKind.Null:
      return [];
    case EvaluationValueKind.String:
      return [value.value];
    case EvaluationValueKind.RegularExpression:
      try {
        return [new RegExp(value.pattern, value.flags)];
      } catch {
        return null;
      }
    case EvaluationValueKind.Array: {
      if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
        return null;
      }
      const patterns = value.elements.map((element) => readSourcePatterns(element.value, []));
      return patterns.some((entries) => entries == null)
        ? null
        : patterns.flatMap((entries) => entries ?? []);
    }
    default:
      return null;
  }
}

function normalizeConventionTransformSourcePatterns(
  patterns: readonly ConventionTransformSourcePattern[],
  admissionIndex: number,
  lane: 'include' | 'exclude',
): readonly ConventionTransformSourcePattern[] {
  return patterns.map((pattern, patternIndex) => {
    if (typeof pattern === 'string') {
      return pattern;
    }
    if (pattern instanceof RegExp) {
      // Capture the invocation value rather than retaining a caller-mutable lastIndex.
      return new RegExp(pattern.source, pattern.flags);
    }
    throw new Error(
      `Convention-transform admission ${admissionIndex} ${lane} pattern ${patternIndex} `
      + 'must be a string or RegExp.',
    );
  });
}

function conventionTransformSourcePatternIdentity(
  pattern: ConventionTransformSourcePattern,
): readonly string[] {
  return typeof pattern === 'string'
    ? ['string', pattern]
    : ['regexp', pattern.source, pattern.flags];
}
