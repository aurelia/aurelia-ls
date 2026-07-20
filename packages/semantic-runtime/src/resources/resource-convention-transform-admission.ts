import path from 'node:path';

import { createFilter } from '@rollup/pluginutils';
import ts from 'typescript';

import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import {
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
  isEvaluatedProjectSource,
  StaticProjectEvaluationComputationPreparation,
  StaticProjectEvaluationComputationProfile,
  type StaticProjectEvaluationGeneration,
  StaticProjectEvaluationOptions,
} from '../evaluation/project-evaluation.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationValueKind,
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

const AURELIA_VITE_PLUGIN_MODULES = new Set(['@aurelia/vite-plugin']);
const VITE_MODULES = new Set(['vite']);
const DEFAULT_VITE_INCLUDE = 'src/**/*.{ts,js,html}';

type ConventionTransformSourcePattern = string | RegExp;

export class ResourceConventionTransformAdmission {
  private readonly filter: (id: unknown) => boolean;

  constructor(
    readonly evidenceHandles: readonly EvidenceHandle[],
    private readonly projectRootDir: string,
    include: readonly ConventionTransformSourcePattern[],
    exclude: readonly ConventionTransformSourcePattern[],
  ) {
    this.filter = createFilter(include, exclude, { resolve: projectRootDir });
  }

  admits(source: SourceFileAdmission): boolean {
    return this.filter(path.resolve(this.projectRootDir, source.path));
  }
}

/** Project-local convention-transform evidence indexed by the authored sources it actually reaches. */
export class ResourceConventionTransformAdmissionIndex {
  constructor(
    readonly admissions: readonly ResourceConventionTransformAdmission[],
  ) {}

  evidenceHandlesForSource(source: SourceFileAdmission): readonly EvidenceHandle[] {
    return this.admissions
      .filter((admission) => admission.admits(source))
      .flatMap((admission) => admission.evidenceHandles);
  }
}

class ResourceConventionTransformRead {
  constructor(
    readonly sourceNode: ts.Node,
    readonly include: readonly ConventionTransformSourcePattern[],
    readonly exclude: readonly ConventionTransformSourcePattern[],
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
  private readonly aureliaPluginFactories = new WeakSet<ConventionToolingFactoryValue>();
  private readonly defineConfigFactories = new WeakSet<ConventionToolingFactoryValue>();
  private readonly executedAureliaPluginCalls = new WeakSet<ts.CallExpression>();

  readonly runtimeHost: StaticEvaluationRuntimeHost = {
    transferValueMetadata: (source, target, transfer) =>
      this.transferValueMetadata(source, target, transfer),
    evaluateInvocation: (frame, host) => this.evaluateInvocation(frame, host),
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
        ));
      }
    }
    if (isConventionToolingFactoryValue(source) && isConventionToolingFactoryValue(target)) {
      if (this.aureliaPluginFactories.has(source)) {
        this.aureliaPluginFactories.add(target);
      }
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
    const firstArgument = arguments_[0]
      ?? new EvaluationValueEvidence(EvaluationUndefined, []);
    if (this.aureliaPluginFactories.has(callee)) {
      this.executedAureliaPluginCalls.add(call);
      const marker = new EvaluationObjectValue(new Map(), false, call);
      this.plugins.set(marker, new ConventionPluginEvaluation(call, firstArgument));
      return staticInvocationValue(marker, firstArgument.openSeams);
    }
    if (!this.defineConfigFactories.has(callee)) {
      return StaticInvocationNotApplicable;
    }
    const config = firstArgument.value;
    const result = config.kind === EvaluationValueKind.Function
      ? host.evaluateFunctionWithArguments(
          config,
          call,
          [new EvaluationValueEvidence(
            new EvaluationBoundaryObjectValue(
              EvaluationBoundaryKind.HostEnvironment,
              'vite.config-env',
              new Map(),
              call,
            ),
            [],
          )],
          frame.moduleKey,
          frame.depth + 1,
          null,
        )
      : config;
    return staticInvocationValue(result, firstArgument.openSeams);
  }

  private resolveCommonJsRequire(
    moduleSpecifier: string,
    node: ts.Node,
  ): EvaluationValue | null {
    if (AURELIA_VITE_PLUGIN_MODULES.has(moduleSpecifier)) {
      const namespace = this.aureliaPluginModuleValue(moduleSpecifier, node);
      this.aureliaPluginFactories.add(namespace);
      return namespace;
    }
    if (VITE_MODULES.has(moduleSpecifier)) {
      return this.viteModuleValue(moduleSpecifier, node);
    }
    return null;
  }

  private resolveExternalImport(entry: EvaluationImportEntry): EvaluationValue | null {
    if (AURELIA_VITE_PLUGIN_MODULES.has(entry.moduleSpecifier)) {
      if (
        entry.importKind === EvaluationImportKind.Default
        || (entry.importKind === EvaluationImportKind.Named && entry.exportName === 'default')
      ) {
        return this.aureliaPluginFactory(entry.moduleSpecifier, entry.node);
      }
      return entry.importKind === EvaluationImportKind.Namespace
        ? this.aureliaPluginModuleValue(entry.moduleSpecifier, entry.node)
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

  private aureliaPluginModuleValue(moduleSpecifier: string, node: ts.Node): EvaluationObjectValue {
    const factory = this.aureliaPluginFactory(moduleSpecifier, node);
    return new EvaluationObjectValue(new Map([
      ['default', new EvaluationObjectProperty('default', factory, node, EvaluationObjectPropertyState.Closed)],
    ]), false, node);
  }

  private aureliaPluginFactory(moduleSpecifier: string, node: ts.Node): EvaluationBoundaryValue {
    const factory = new EvaluationBoundaryValue(
      EvaluationBoundaryKind.ExternalModule,
      `${moduleSpecifier}.default`,
      node,
    );
    this.aureliaPluginFactories.add(factory);
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
  /** Vite configuration evaluation with Aurelia convention-plugin intrinsics. */
  Vite = 'aurelia-vite-convention-tooling',
}

/** Static-evaluation profile for Vite configuration that controls convention-derived resource admission. */
export const resourceConventionToolingEvaluationProfile = new StaticProjectEvaluationComputationProfile(
  ResourceConventionToolingEvaluationProfileKind.Vite,
  '1',
  'Vite configuration evaluation with Aurelia convention-plugin intrinsics.',
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

/** Read supported Vite configuration and publish the evidence that admits convention-derived resources. */
export class ResourceConventionTransformAdmissionMaterializer {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluationGeneration: StaticProjectEvaluationGeneration<ResourceConventionToolingEvaluationContext>,
    publication: KernelPublicationContext,
  ): ResourceConventionTransformAdmissionIndex {
    evaluationGeneration.requireCurrent();
    if (evaluationGeneration.project !== project) {
      throw new Error(`Convention-tooling evaluation belongs to another project generation.`);
    }
    const evaluation = evaluationGeneration.readBaseline();
    const toolingHost = evaluationGeneration.readBaselineContext();
    const emissions: ResourceConventionTransformEmission[] = [];
    const openRecords: KernelStoreRecord[] = [];
    for (const source of evaluation.sources) {
      if (
        !isEvaluatedProjectSource(source)
        || source.admission.role !== SourceFileRole.ToolingConfig
        || !isViteConfigPath(source.admission.path)
      ) {
        continue;
      }
      const environment = source.evaluation.environment;
      const result = readConventionTransforms(
        source.evaluation.invocations
          .map((invocation) => invocation.node)
          .filter(ts.isCallExpression)
          .filter((call) => toolingHost.isAureliaPluginCall(call)),
        environment.readValue('default') ?? readStaticCommonJsExportValue(environment, 'default'),
        toolingHost,
      );
      emissions.push(...result.admissions.map((read, index) =>
        conventionTransformEmission(store, project, source.admission, source.sourceFile, read, index)
      ));
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
          includeProvenanceRecord: true,
        }).records
      ));
    }
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...openRecords,
    ];
    if (records.length > 0) {
      publication.publish(new KernelPublicationPlan(
        new KernelStoreBatch(records, `resource-convention-transforms:${project.projectKey}`),
      ));
    }
    return new ResourceConventionTransformAdmissionIndex(
      emissions.map((emission) => emission.admission),
    );
  }
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
        '@aurelia/vite-plugin admits convention preprocessing for matching project sources.',
        sourceAddressHandle,
      ),
    ],
    new ResourceConventionTransformAdmission(
      [source.evidenceHandle, evidenceHandle],
      project.rootDir,
      read.include,
      read.exclude,
    ),
  );
}

function readConventionTransforms(
  calls: readonly ts.CallExpression[],
  config: EvaluationValue | null,
  toolingHost: ResourceConventionToolingEvaluationContext,
): ResourceConventionTransformReadResult {
  if (calls.length === 0) {
    return new ResourceConventionTransformReadResult([], []);
  }
  if (config?.kind !== EvaluationValueKind.Object) {
    return openConventionTransformCalls(
      calls,
      'The Aurelia Vite conventions plugin is called, but the exported Vite configuration could not be closed statically.',
      config,
    );
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
        admissions.push(new ResourceConventionTransformRead(plugin.call, options.include, options.exclude));
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
    return readConventionPluginList(value.fulfilledValue, toolingHost);
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

function isViteConfigPath(sourcePath: string): boolean {
  return /^vite\.config\.[cm]?[jt]sx?$/u.test(path.basename(sourcePath).toLowerCase());
}
