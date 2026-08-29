import type { KernelPublicationContext } from '../kernel/publication.js';
import { CustomElementTemplateKind } from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  TemplateCompilationIngressPreparationRequest,
  type TemplateCompilationIngressPreparation,
  TemplateCompilationUnitMaterializer,
} from './compilation-unit-materializer.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import type {
  LocalTemplateOccurrenceDefinitionEntry,
  LocalTemplateOccurrenceDefinitionPreparation,
} from './local-template-definition-materializer.js';
import { TemplateCompilerInvocationPhase } from './template-compiler-execution.js';
import type {
  TemplateCompilerNormalizedSiteLaneTransfer,
  TemplateCompilerNormalizedSiteLaneView,
} from './template-compiler-normalized-site-lane-view.js';

const occurrenceCompilationIngressAuthority = {};
const occurrenceCompilationIngressOwners = new WeakMap<
  LocalTemplateOccurrenceDefinitionPreparation,
  TemplateCompilerOccurrenceCompilationIngressMaterializer
>();

/** One occurrence-defined child's prepared unit/source shell before its post-local compiler world exists. */
export class TemplateCompilerOccurrenceCompilationIngressPreparation {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly definitionPreparation: LocalTemplateOccurrenceDefinitionPreparation,
    readonly definitionEntry: LocalTemplateOccurrenceDefinitionEntry,
    readonly siteTransfer: TemplateCompilerNormalizedSiteLaneTransfer,
    readonly unitIngress: TemplateCompilationIngressPreparation,
  ) {
    const definition = definitionEntry.definition;
    const extracted = siteTransfer.transfer.extraction;
    const source = unitIngress.templateSource;
    const owner = source.owner;
    if (
      authority !== occurrenceCompilationIngressAuthority
      || !definitionPreparation.isModuleConstructed()
      || !definitionEntry.isModuleConstructed()
      || definitionEntry.siteTransfer !== siteTransfer
      || definitionEntry.extracted !== extracted
      || definition.productHandle !== extracted.definitionReservation.productHandle
      || definition.identityHandle !== extracted.definitionReservation.identityHandle
      || definition.name !== extracted.name
      || definition.template?.kind !== CustomElementTemplateKind.DomNode
      || definition.template.markup != null
      || definition.template.sourceMap != null
      || definition.template.authoredSourceRevision !== siteTransfer.childView.family.precedent.sourceRevision
      || !definition.needsCompile
      || unitIngress.localKey !== siteTransfer.childView.lane.localKey
      || unitIngress.unitKind !== TemplateCompilationUnitKind.CustomElement
      || source.sourceKind !== TemplateSourceKind.DomNode
      || source.markup != null
      || source.sourceMap != null
      || source.sourceAddressHandle !== (definition.template.addressHandle ?? definition.sourceAddressHandle)
      || owner?.productHandle !== definition.productHandle
      || owner.identityHandle !== definition.identityHandle
      || owner.resourceKind !== ResourceDefinitionKind.CustomElement
      || owner.localName !== definition.name
      || owner.addressHandle !== definition.sourceAddressHandle
    ) {
      throw new Error('Occurrence compilation ingress lost its exact definition, transfer, or DomNode unit authority.');
    }
    this.#authority = authority;
  }

  get childView(): TemplateCompilerNormalizedSiteLaneView {
    return this.siteTransfer.childView;
  }

  get lane() {
    return this.childView.lane;
  }

  get compilerCarrier() {
    return this.siteTransfer.transfer.extraction.carrier;
  }

  get compilerContent() {
    return this.siteTransfer.transfer.extraction.content;
  }

  get rawBinding() {
    return this.childView.family.binding;
  }

  get rawHtml() {
    return this.childView.family.precedent.compilation.html;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceCompilationIngressAuthority;
  }

  isCurrent(): boolean {
    return occurrenceDefinitionPreparationFrontierIsCurrent(this.definitionPreparation);
  }

  hasImmediateFrontier(): boolean {
    return occurrenceDefinitionPreparationFrontierIsStructurallyCurrent(this.definitionPreparation);
  }
}

/** Complete direct-sibling child-ingress preparation; nested cohorts are prepared only after their parent runs. */
export class TemplateCompilerOccurrenceCompilationIngressCohort {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly definitionPreparation: LocalTemplateOccurrenceDefinitionPreparation,
    readonly entries: readonly TemplateCompilerOccurrenceCompilationIngressPreparation[],
  ) {
    if (
      authority !== occurrenceCompilationIngressAuthority
      || entries.length !== definitionPreparation.entries.length
      || entries.some((entry, ordinal) =>
        !entry.isModuleConstructed()
        || entry.definitionPreparation !== definitionPreparation
        || entry.definitionEntry !== definitionPreparation.entries[ordinal]
      )
    ) {
      throw new Error('Occurrence compilation ingress cohort lost sibling preparation identity or order.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceCompilationIngressAuthority;
  }

  isCurrent(): boolean {
    return occurrenceDefinitionPreparationFrontierIsCurrent(this.definitionPreparation);
  }

  hasImmediateFrontier(): boolean {
    return occurrenceDefinitionPreparationFrontierIsStructurallyCurrent(this.definitionPreparation);
  }
}

/** Candidate-local owner for definition↔transfer/view↔unit ingress association. */
export class TemplateCompilerOccurrenceCompilationIngressMaterializer {
  private readonly unitMaterializer: TemplateCompilationUnitMaterializer;
  private readonly cohortsByPreparation = new WeakMap<
    LocalTemplateOccurrenceDefinitionPreparation,
    TemplateCompilerOccurrenceCompilationIngressCohort
  >();

  constructor(readonly store: KernelPublicationContext) {
    this.unitMaterializer = new TemplateCompilationUnitMaterializer(store);
  }

  prepareRootChildren(
    definitionPreparation: LocalTemplateOccurrenceDefinitionPreparation,
  ): TemplateCompilerOccurrenceCompilationIngressCohort {
    const existing = this.cohortsByPreparation.get(definitionPreparation);
    if (existing != null) {
      if (!existing.isCurrent()) {
        throw new Error('Occurrence compilation ingress cohort is no longer at its immediate root frontier.');
      }
      return existing;
    }
    const owner = occurrenceCompilationIngressOwners.get(definitionPreparation);
    if (owner != null && owner !== this) {
      throw new Error('Occurrence compilation ingress preparation belongs to another materializer.');
    }
    const partition = definitionPreparation.rootPartition;
    const family = partition.incoming.family;
    const binding = family.binding;
    const execution = binding.execution;
    if (
      !definitionPreparation.isModuleConstructed()
      || !partition.isModuleConstructed()
      || !occurrenceDefinitionPreparationFrontierIsCurrent(definitionPreparation)
      || partition.incoming !== family.rootView
      || partition.closure !== binding.bootstrapClosure
      || this.store !== binding.browserEmission.publication
      || definitionPreparation.entries.length !== partition.transfers.length
      || definitionPreparation.entries.some((entry, ordinal) =>
        !entry.isModuleConstructed()
        || entry.siteTransfer !== partition.transfers[ordinal]
        || entry.extracted.invocationLane !== entry.siteTransfer.childView.lane
        || entry.siteTransfer.childView.lane.targetPlan != null
        || execution.invocationPhase(entry.siteTransfer.childView.lane)
          !== TemplateCompilerInvocationPhase.CompilerHooks
        || execution.sequence.readLaneOperations(entry.siteTransfer.childView.lane).length !== 0
      )
    ) {
      throw new Error('Occurrence compilation ingress requires one current immediate root sibling preparation.');
    }

    const entries = definitionPreparation.entries.map((entry) => {
      const definition = entry.definition;
      const template = definition.template;
      if (template?.kind !== CustomElementTemplateKind.DomNode) {
        throw new Error(`Occurrence definition '${definition.name}' has no DomNode template.`);
      }
      const unitIngress = this.unitMaterializer.prepareIngress(new TemplateCompilationIngressPreparationRequest(
        entry.siteTransfer.childView.lane.localKey,
        TemplateCompilationUnitKind.CustomElement,
        new TemplateSourceOwnerReference(
          definition.productHandle,
          definition.identityHandle,
          ResourceDefinitionKind.CustomElement,
          definition.name,
          definition.sourceAddressHandle,
        ),
        TemplateSourceKind.DomNode,
        null,
        template.addressHandle ?? definition.sourceAddressHandle,
        null,
      ));
      return new TemplateCompilerOccurrenceCompilationIngressPreparation(
        occurrenceCompilationIngressAuthority,
        definitionPreparation,
        entry,
        entry.siteTransfer,
        unitIngress,
      );
    });
    const cohort = new TemplateCompilerOccurrenceCompilationIngressCohort(
      occurrenceCompilationIngressAuthority,
      definitionPreparation,
      entries,
    );
    this.cohortsByPreparation.set(definitionPreparation, cohort);
    occurrenceCompilationIngressOwners.set(definitionPreparation, this);
    return cohort;
  }
}

function occurrenceDefinitionPreparationFrontierIsCurrent(
  definitionPreparation: LocalTemplateOccurrenceDefinitionPreparation,
): boolean {
  return definitionPreparation.rootPartition.incoming.family.isCurrent()
    && occurrenceDefinitionPreparationFrontierIsStructurallyCurrent(definitionPreparation);
}

function occurrenceDefinitionPreparationFrontierIsStructurallyCurrent(
  definitionPreparation: LocalTemplateOccurrenceDefinitionPreparation,
): boolean {
  const partition = definitionPreparation.rootPartition;
  const family = partition.incoming.family;
  const binding = family.binding;
  const execution = binding.execution;
  return definitionPreparation.isModuleConstructed()
    && partition.isModuleConstructed()
    && partition.incoming === family.rootView
    && partition.closure === binding.bootstrapClosure
    && binding.forest.mutationRevision === partition.closure.forestMutationRevision
    && execution.invocationPhase(binding.lane) === TemplateCompilerInvocationPhase.BootstrapClosed
    && binding.lane.targetPlan == null
    && execution.sequence.readLaneOperations(binding.lane).length === partition.closure.laneOperationCount
    && !execution.sequence.readContexts().some((context) => context.lane === binding.lane)
    && definitionPreparation.entries.length === partition.transfers.length
    && definitionPreparation.entries.every((entry, ordinal) =>
      entry.isModuleConstructed()
      && entry.siteTransfer === partition.transfers[ordinal]
      && entry.extracted.invocationLane === entry.siteTransfer.childView.lane
      && entry.siteTransfer.childView.lane.targetPlan == null
      && execution.invocationPhase(entry.siteTransfer.childView.lane)
        === TemplateCompilerInvocationPhase.CompilerHooks
      && execution.sequence.readLaneOperations(entry.siteTransfer.childView.lane).length === 0
    );
}
