import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import { expressionProductHandlesForRuntimeBinding } from '../template/runtime-binding-expression-products.js';
import {
  StateBinding,
  StateDispatchBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import { bindingBehaviorExpressions, staticStringLiteralExpression } from '../template/binding-behavior-expression.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import { StateRawErrorAuthority } from './framework-raw-error-authority.js';
import {
  FromStateStoreReferenceSite,
  readFromStateStoreReferenceSites,
} from './from-state-decorator-recognition.js';
import type { StateStoreConfiguration } from './model.js';
import { StateProductDetails } from './product-details.js';
import {
  StateIssueKind,
  StateIssuePhase,
  type StateIssue,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';

/** Source surface that can name a configured @aurelia/state store. */
export enum StateStoreLookupSiteKind {
  /** `@fromState(...)` decorator argument store lookup. */
  FromStateDecorator = 'from-state-decorator',
  /** `.state` binding command store lookup. */
  StateBindingCommand = 'state-binding-command',
  /** `.dispatch` binding command store lookup. */
  DispatchBindingCommand = 'dispatch-binding-command',
  /** `& state` binding behavior argument store lookup. */
  StateBindingBehavior = 'state-binding-behavior',
}

class StateStoreLookupSite {
  constructor(
    readonly kind: StateStoreLookupSiteKind,
    readonly storeName: string,
    readonly sourceAddressHandle: AddressHandle,
    readonly sourceRecords: readonly KernelStoreRecord[],
    readonly sourcePath: string | null,
    readonly start: number | null,
    readonly end: number | null,
  ) {}
}

export class StateStoreLookupIssueProjectResult {
  constructor(
    readonly issues: readonly StateIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly StateIssue[] {
    return this.issues;
  }
}

/** Materializes missing named-store lookups that would reach StoreRegistry.getStore(...). */
export class StateStoreLookupIssueMaterializer {
  private readonly publisher: StateIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new StateIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    stores: readonly StateStoreConfiguration[],
    templates: TemplateCompilationProjectEmission,
  ): StateStoreLookupIssueProjectResult {
    const configuredStoreNames = new Set(
      stores
        .filter((store) => !store.isDefault)
        .map((store) => store.name)
        .filter((name): name is string => name != null),
    );
    const publications = [
      ...fromStateStoreLookupSites(this.store, project, typeSystem),
      ...templateStoreLookupSites(this.store, templates),
    ]
      .filter((site) => !configuredStoreNames.has(site.storeName))
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `state-store-lookup-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(StateProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new StateStoreLookupIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: StateStoreLookupSite,
    index: number,
  ): StateIssuePublication {
    const local = stateStoreLookupIssueLocalKey(project, site, index);
    const publication = this.publisher.publish(
      project.projectKey,
      null,
      StateIssuePhase.StoreLookup,
      StateIssueKind.StoreNotFound,
      stateStoreLookupIssueMessage(site),
      StateRawErrorAuthority.StoreNotFound,
      site.sourceAddressHandle,
      site.storeName,
    );
    return issuePublicationWithRecords(publication, site.sourceRecords);
  }
}

function fromStateStoreLookupSites(
  store: KernelStore,
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly StateStoreLookupSite[] {
  return readFromStateStoreReferenceSites(project, typeSystem).map((site, index) => {
    const local = [
      'from-state-store-reference',
      localKeyPart(project.projectKey),
      localKeyPart(site.sourcePath),
      site.start,
      site.end,
      index,
    ].join(':');
    const source = sourceSpanAddressForSite(store, local, site);
    return new StateStoreLookupSite(
      StateStoreLookupSiteKind.FromStateDecorator,
      site.storeName,
      source.handle,
      source.records,
      site.sourcePath,
      site.start,
      site.end,
    );
  });
}

function templateStoreLookupSites(
  store: KernelStore,
  templates: TemplateCompilationProjectEmission,
): readonly StateStoreLookupSite[] {
  return [
    ...templates.resources,
    ...templates.authoringResources,
  ].flatMap((resource) =>
    resource.runtimeAnalysis.runtimeRendering.bindings.flatMap((binding) =>
      bindingStateStoreLookupSites(store, binding)
    )
  );
}

function bindingStateStoreLookupSites(
  store: KernelStore,
  binding: RuntimeBinding,
): readonly StateStoreLookupSite[] {
  return [
    ...stateCommandStoreLookupSites(binding),
    ...stateBindingBehaviorStoreLookupSites(store, binding),
  ];
}

function stateCommandStoreLookupSites(
  binding: RuntimeBinding,
): readonly StateStoreLookupSite[] {
  if (binding instanceof StateBinding && binding.storeName != null && binding.sourceAddressHandle != null) {
    return [
      new StateStoreLookupSite(
        StateStoreLookupSiteKind.StateBindingCommand,
        binding.storeName,
        binding.sourceAddressHandle,
        [],
        null,
        null,
        null,
      ),
    ];
  }
  if (binding instanceof StateDispatchBinding && binding.storeName != null && binding.sourceAddressHandle != null) {
    return [
      new StateStoreLookupSite(
        StateStoreLookupSiteKind.DispatchBindingCommand,
        binding.storeName,
        binding.sourceAddressHandle,
        [],
        null,
        null,
        null,
      ),
    ];
  }
  return [];
}

function stateBindingBehaviorStoreLookupSites(
  store: KernelStore,
  binding: RuntimeBinding,
): readonly StateStoreLookupSite[] {
  return expressionProductHandlesForRuntimeBinding(binding).flatMap((productHandle) => {
    const parse = readTemplateExpressionParse(store, productHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (ast == null || parse?.sourceAddressHandle == null) {
      return [];
    }
    const sourceAddressHandle = parse.sourceAddressHandle;
    return bindingBehaviorExpressions(ast).flatMap((behavior) => {
      if (behavior.name.name !== BuiltInBindingBehaviorName.State) {
        return [];
      }
      const storeName = staticStringLiteralExpression(behavior.args[0] ?? null);
      return storeName == null
        ? []
        : [
          new StateStoreLookupSite(
            StateStoreLookupSiteKind.StateBindingBehavior,
            storeName,
            sourceAddressHandle,
            [],
            null,
            null,
            null,
          ),
        ];
    });
  });
}

function stateStoreLookupIssueMessage(site: StateStoreLookupSite): string {
  switch (site.kind) {
    case StateStoreLookupSiteKind.FromStateDecorator:
      return `@fromState references store "${site.storeName}", but no @aurelia/state store with that name is configured.`;
    case StateStoreLookupSiteKind.StateBindingCommand:
      return `The state binding command references store "${site.storeName}", but no @aurelia/state store with that name is configured.`;
    case StateStoreLookupSiteKind.DispatchBindingCommand:
      return `The dispatch binding command references store "${site.storeName}", but no @aurelia/state store with that name is configured.`;
    case StateStoreLookupSiteKind.StateBindingBehavior:
      return `The state binding behavior references store "${site.storeName}", but no @aurelia/state store with that name is configured.`;
  }
}

function stateStoreLookupIssueLocalKey(
  project: ProjectBootFrame,
  site: StateStoreLookupSite,
  index: number,
): string {
  return [
    'state-store-lookup-issue',
    site.kind,
    localKeyPart(project.projectKey),
    localKeyPart(site.storeName),
    localKeyPart(site.sourcePath ?? 'template'),
    site.start ?? 'address',
    site.end ?? 'address',
    index,
  ].join(':');
}
