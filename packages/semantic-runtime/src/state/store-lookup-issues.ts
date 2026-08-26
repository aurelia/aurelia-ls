import type { ProjectBootFrame } from '../boot/frames.js';
import type { AddressHandle } from '../kernel/handles.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import { expressionProductHandlesForRuntimeBinding } from '../template/runtime-binding-expression-products.js';
import { sourceAddressForRuntimeExpressionSpan } from '../template/runtime-expression-source-address.js';
import {
  StateBinding,
  StateDispatchBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import {
  isRuntimeExpressionBinding,
  runtimeBindingSourceExpressionForProduct,
} from '../observation/runtime-binding-expression.js';
import { resourceLocalRuntimeBindings } from '../template/runtime-resource-ownership.js';
import {
  bindingBehaviorResourceOccurrences,
  staticStringLiteralExpression,
} from '../template/expression-resource-occurrence.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import { StateRawErrorAuthority } from './framework-raw-error-authority.js';
import { readFromStateStoreReferenceSites } from './from-state-decorator-recognition.js';
import { StateProductDetails } from './product-details.js';
import { configuredStateStoreForName } from './state-store-identity.js';
import {
  type StateStoreVisibility,
  type StateStoreVisibilitySelection,
} from './state-store-visibility.js';
import {
  StateIssueKind,
  StateIssuePhase,
  type StateIssue,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';

const STATE_BINDING_BEHAVIOR_NAME: string = BuiltInBindingBehaviorName.State;

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
    readonly storeVisibility: StateStoreVisibilitySelection,
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
    readonly publication: KernelPublicationContext,
  ) {
    this.publisher = new StateIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    storeVisibility: StateStoreVisibility,
    templates: TemplateCompilationProjectEmission,
  ): StateStoreLookupIssueProjectResult {
    const publications = [
      ...fromStateStoreLookupSites(
        this.publication,
        project,
        typeSystem,
        storeVisibility.defaultSelection(),
      ),
      ...templateStoreLookupSites(this.publication, templates, storeVisibility),
    ]
      .filter((site) =>
        configuredStateStoreForName(site.storeVisibility.stores, site.storeName) == null
        && site.storeVisibility.openReason == null
      )
      .map((site) => this.publicationForSite(project, site));
    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `state-store-lookup-issues:${project.projectKey}`),
      publishProductDetails(
        StateProductDetails.Issue,
        publications.map((publication) => publication.issue),
      ),
    ));
    return new StateStoreLookupIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: StateStoreLookupSite,
  ): StateIssuePublication {
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
  publication: KernelPublicationContext,
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  storeVisibility: StateStoreVisibilitySelection,
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
    const source = sourceSpanAddressForSite(publication, local, site);
    return new StateStoreLookupSite(
      StateStoreLookupSiteKind.FromStateDecorator,
      site.storeName,
      source.handle,
      source.records,
      storeVisibility,
    );
  });
}

function templateStoreLookupSites(
  publication: KernelPublicationContext,
  templates: TemplateCompilationProjectEmission,
  storeVisibility: StateStoreVisibility,
): readonly StateStoreLookupSite[] {
  return [
    ...templates.resources,
    ...templates.authoringResources,
  ].flatMap((resource) =>
    resourceLocalRuntimeBindings(publication, resource).flatMap((binding) => {
      const renderContext = resource.runtimeAnalysis.runtimeRendering
        .requireRenderContextForBinding(binding.productHandle);
      return bindingStateStoreLookupSites(
        publication,
        binding,
        storeVisibility.selectionForContainer(renderContext.sourceController.containerFrame),
      );
    })
  );
}

function bindingStateStoreLookupSites(
  publication: KernelPublicationContext,
  binding: RuntimeBinding,
  storeVisibility: StateStoreVisibilitySelection,
): readonly StateStoreLookupSite[] {
  return [
    ...stateCommandStoreLookupSites(binding, storeVisibility),
    ...stateBindingBehaviorStoreLookupSites(publication, binding, storeVisibility),
  ];
}

function stateCommandStoreLookupSites(
  binding: RuntimeBinding,
  storeVisibility: StateStoreVisibilitySelection,
): readonly StateStoreLookupSite[] {
  if (binding instanceof StateBinding && binding.storeName != null && binding.sourceAddressHandle != null) {
    return [
      new StateStoreLookupSite(
        StateStoreLookupSiteKind.StateBindingCommand,
        binding.storeName,
        binding.storeNameSourceAddressHandle ?? binding.sourceAddressHandle,
        [],
        storeVisibility,
      ),
    ];
  }
  if (binding instanceof StateDispatchBinding && binding.storeName != null && binding.sourceAddressHandle != null) {
    return [
      new StateStoreLookupSite(
        StateStoreLookupSiteKind.DispatchBindingCommand,
        binding.storeName,
        binding.storeNameSourceAddressHandle ?? binding.sourceAddressHandle,
        [],
        storeVisibility,
      ),
    ];
  }
  return [];
}

function stateBindingBehaviorStoreLookupSites(
  publication: KernelPublicationContext,
  binding: RuntimeBinding,
  storeVisibility: StateStoreVisibilitySelection,
): readonly StateStoreLookupSite[] {
  return expressionProductHandlesForRuntimeBinding(binding).flatMap((productHandle) => {
    const parse = readTemplateExpressionParse(publication, productHandle);
    const ast = isRuntimeExpressionBinding(binding)
      ? runtimeBindingSourceExpressionForProduct(publication, binding, productHandle)
      : null;
    if (ast == null || parse?.sourceAddressHandle == null) {
      return [];
    }
    const sourceAddressHandle = parse.sourceAddressHandle;
    return bindingBehaviorResourceOccurrences(ast).flatMap(({ expression: behavior }) => {
      if (behavior.name.name !== STATE_BINDING_BEHAVIOR_NAME) {
        return [];
      }
      const storeExpression = behavior.args[0] ?? null;
      const storeName = staticStringLiteralExpression(storeExpression);
      if (storeName == null || storeExpression == null) {
        return [];
      }
      const source = sourceAddressForRuntimeExpressionSpan(
        publication,
        [
          'state-store-lookup',
          localKeyPart(productHandle),
          storeExpression.span.start,
          storeExpression.span.end,
        ].join(':'),
        sourceAddressHandle,
        storeExpression.span,
      );
      return [
        new StateStoreLookupSite(
          StateStoreLookupSiteKind.StateBindingBehavior,
          storeName,
          source.handle ?? sourceAddressHandle,
          source.records,
          storeVisibility,
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
