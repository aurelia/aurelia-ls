import {
  AppTaskSlot,
} from '../configuration/app-task.js';
import { uniqueStrings } from '../kernel/collections.js';
import {
  appTaskRegistrationSourceText,
} from '../configuration/app-task-source.js';
import {
  APP_BUILDER_BINDING_BEHAVIORS,
} from './binding-behavior-catalog.js';
import {
  ExpressionParser,
} from '../expression/expression-parser.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import {
  computedDecoratorSourceText,
} from '../observation/computed-decorator-source.js';
import {
  AU_COMPOSE_FLUSH_MODES,
  AU_COMPOSE_RESOURCE_NAME,
  AU_COMPOSE_SCOPE_BEHAVIORS,
  auComposeElementSource,
  type AuComposeFlushMode,
  type AuComposeScopeBehavior,
} from '../template/au-compose-source.js';
import {
  AU_SLOT_RESOURCE_NAME,
  auSlotElementSource,
} from '../template/au-slot-source.js';
import {
  type NamedResourceDefinitionKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  attributePatternCreateCallSourceText,
  customElementDefineCallSourceText,
  customElementDecoratorSourceText,
  customElementStaticAuPropertySourceText,
  namedResourceDefineCallSourceText,
  namedResourceDecoratorSourceText,
  namedResourceStaticAuPropertySourceText,
  resourceDependenciesPropertySourceText,
  ResourceDefinitionMetadataPropertyName,
} from '../resources/resource-definition-source.js';
import {
  fromStateDecoratorSourceText,
} from '../state/from-state-decorator-source.js';
import {
  ComponentLifecycleHookName,
  componentLifecycleHookMethodSourceText,
} from '../template/component-lifecycle-source.js';
import {
  asElementAttributeSource,
  containerlessAttributeSource,
  TemplateSpecialAttributeName,
} from '../template/special-attribute-source.js';
import {
  routerHrefAttributeSource,
  routerLoadAttributeSource,
} from '../router/route-instruction-source.js';
import {
  ROUTE_CONTEXT_PARAMETER_MERGE_STRATEGY_SOURCES,
  routeContextParameterReadExpressionSourceText,
  type RouteContextParameterMergeStrategySource,
} from '../router/route-context-source.js';
import {
  routerRouteDecoratorExpressionSourceText,
} from '../router/route-configuration-source.js';
import {
  parseRouteExpression,
  RouteExpressionParseFailure,
} from '../router/route-expression-parser.js';
import {
  parseRouterStringNavigationInstruction,
} from '../router/router-string-navigation-instruction.js';
import {
  i18nTranslationKeyExpressionValidationSummary,
} from '../i18n/key-evaluation-result.js';
import {
  ROUTER_VIEWPORT_RESOURCE_NAME,
  routerViewportElementSource,
} from '../router/viewport-source.js';
import {
  VALIDATION_CONTAINER_RESOURCE_NAME,
  VALIDATION_ERRORS_RESOURCE_NAME,
  validationContainerElementSource,
  validationErrorsAttributeSource,
} from '../validation/validation-html-source.js';
import {
  AttributeSyntaxKind,
} from '../template/attribute-syntax.js';
import {
  authoredTemplateAttributeText,
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  type AuthoredTemplateAttributeSource,
  type AuthoredTemplateChildSource,
} from '../template/authored-template-source.js';
import {
  bindingBehaviorExpressionSourceText,
  iteratorBindingExpressionSourceText,
  textInterpolationSourceText,
  valueConverterExpressionSourceText,
} from '../template/binding-expression-source.js';
import {
  PORTAL_INSERT_POSITIONS,
  type PortalInsertPosition,
  portalAttributeSource,
} from '../template/portal-source.js';
import {
  BuiltInTemplateControllerName,
} from '../template/template-controller-semantics.js';
import {
  templateControllerBareAttributeSource,
  templateControllerIteratorAttributeSource,
  templateControllerLocalAttributeSource,
  templateControllerValueAttributeSource,
} from '../template/template-controller-source.js';
import {
  builtInBindingCommandAttributeSource,
  BuiltInBindingCommandName,
  BuiltInBindingCommandTargetName,
  builtInBindingCommandExpressionType,
  findUniqueBuiltInBindingCommandByName,
  parseBuiltInAttributeSyntax,
} from '../template/built-in-syntax.js';
import {
  AppBuilderBindingPartId,
} from './binding-part-catalog.js';
import {
  APP_BUILDER_CHOICE_OPTION_BINDING_KINDS,
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from './control-catalog.js';
import {
  APP_BUILDER_COMPONENT_LIFECYCLES,
} from './component-lifecycle-catalog.js';
import {
  AppBuilderFrameworkComponentId,
} from './framework-component-catalog.js';
import {
  AppBuilderFrameworkSyntaxId,
} from './framework-syntax-catalog.js';
import {
  AppBuilderFrameworkApiId,
  appBuilderNamedResourceNameSlotKind,
} from './framework-api-catalog.js';
import {
  AppBuilderResourceMetadataId,
} from './resource-metadata-catalog.js';
import {
  appBuilderPartMenuDescriptorFilter,
  type AppBuilderPartAuthoringTierPolicy,
  type AppBuilderPartMenuRequest,
} from './part-menu.js';
import {
  AppBuilderPartApplicationSiteKind,
  type AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
  AppBuilderPartSlotValueLanguage,
} from './part-application.js';
import {
  appBuilderPartSlotExpectation,
} from './part-slot-expectation.js';
import {
  APP_BUILDER_PARTS,
  type AppBuilderPartAuthoringTier,
  type AppBuilderPartId,
  AppBuilderPartKind,
  type AppBuilderPartDescriptor,
  type AppBuilderBindingBehaviorPartDescriptor,
  type AppBuilderBindingPartPartDescriptor,
  type AppBuilderComponentLifecyclePartDescriptor,
  type AppBuilderControlPartDescriptor,
  type AppBuilderFrameworkComponentPartDescriptor,
  type AppBuilderFrameworkApiPartDescriptor,
  type AppBuilderFrameworkSyntaxPartDescriptor,
  type AppBuilderResourceMetadataPartDescriptor,
  type AppBuilderStructuralPartPartDescriptor,
  type AppBuilderValueConverterPartDescriptor,
  tryAppBuilderPartDescriptor,
} from './part-catalog.js';
import {
  AppBuilderPartSourceFragmentKind,
  AppBuilderSourceFragmentOriginKind,
  AppBuilderPartSourceLoweringIssueKind,
  AppBuilderPartSourceLoweringState,
  type AppBuilderPartSlotAssignment,
  type AppBuilderPartSourceFragment,
  type AppBuilderPartSourceFragmentForKind,
  type AppBuilderPartSourceFragmentOrigin,
  type AppBuilderSourceFragmentOrigin,
  type AppBuilderSourceLoweringFragmentOrigin,
  type AppBuilderPartSourceInvocation,
  type AppBuilderPartSourceLowering,
  type AppBuilderPartSourceLoweringIssue,
  type AppBuilderTemplateElementPartSourceFragment,
  type AppBuilderTemplateAttributeSource,
  type AppBuilderTemplateElementSource,
  type AppBuilderTypeScriptImportRequirement,
} from './part-source-invocation.js';
import {
  AppBuilderPartSourceLoweringSampleKind,
  sampleSlotAssignmentSamplesForPart,
} from './part-source-samples.js';
import {
  AppBuilderStructuralPartId,
} from './structural-part-catalog.js';
import {
  APP_BUILDER_VALUE_CONVERTERS,
} from './value-converter-catalog.js';
import {
  readTypeScriptSourceSyntaxDiagnostics,
} from '../type-system/source-syntax.js';

export {
  AppBuilderPartSourceFragmentKind,
  AppBuilderSourceFragmentOriginKind,
  AppBuilderPartSourceLoweringIssueKind,
  AppBuilderPartSourceLoweringState,
  type AppBuilderPartSlotAssignment,
  type AppBuilderPartSourceFragment,
  type AppBuilderPartSourceFragmentForKind,
  type AppBuilderPartSourceFragmentOrigin,
  type AppBuilderSourceFragmentOrigin,
  type AppBuilderSourceLoweringFragmentOrigin,
  type AppBuilderPartSourceInvocation,
  type AppBuilderPartSourceLowering,
  type AppBuilderPartSourceLoweringIssue,
  type AppBuilderTemplateElementPartSourceFragment,
  type AppBuilderTemplateAttributeSource,
  type AppBuilderTemplateElementSource,
} from './part-source-invocation.js';
export {
  APP_BUILDER_PART_SOURCE_LOWERING_SAMPLE_KINDS,
  AppBuilderPartSourceLoweringSampleKind,
  type AppBuilderPartSourceLoweringSample,
} from './part-source-samples.js';

/** Request for compact source-lowering preview rows over the app-builder part menu. */
export interface AppBuilderPartSourceLoweringPreviewRequest extends AppBuilderPartMenuRequest {
  /** Restrict preview rows to required-only, optional-slot, or both sample families; omitted keeps broad previews required-only. */
  readonly sampleKinds?: readonly AppBuilderPartSourceLoweringSampleKind[];
  /** Include generated source text in addition to fragment kinds and structural hints. */
  readonly includeSourceText?: boolean;
}

/** Compact source-fragment preview; text is optional because menu calls should stay cheap. */
export interface AppBuilderPartSourceFragmentPreview {
  readonly kind: AppBuilderPartSourceFragmentKind;
  readonly text?: string;
  readonly templateAttributeName: string | null;
  readonly templateAttributeHasValue: boolean;
  readonly templateElementTagName: string | null;
  readonly templateAttributeCount: number;
  readonly childTextContainsInterpolation: boolean;
  readonly childElementCount: number;
  readonly requiredImports: readonly AppBuilderTypeScriptImportRequirement[];
}

/** One callable source-lowering sample row for an app-builder part. */
export interface AppBuilderPartSourceLoweringPreviewRow {
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly title: string;
  readonly authoringTier: AppBuilderPartAuthoringTier;
  readonly operationKind: AppBuilderPartOperationKind;
  readonly sampleKind: AppBuilderPartSourceLoweringSampleKind;
  readonly invocation: AppBuilderPartSourceInvocation;
  readonly state: AppBuilderPartSourceLoweringState;
  readonly fragments: readonly AppBuilderPartSourceFragmentPreview[];
  readonly issues: readonly AppBuilderPartSourceLoweringIssue[];
  readonly packageDependencies: readonly string[];
}

/** AI-facing source-lowering preview over callable app-builder part samples. */
export interface AppBuilderPartSourceLoweringPreview {
  readonly displayText: string;
  readonly rows: readonly AppBuilderPartSourceLoweringPreviewRow[];
  readonly authoringTierPolicy: AppBuilderPartAuthoringTierPolicy;
  readonly authoringTierFilteredOutCount: number;
  readonly authoringTierFilteredOutTiers: readonly AppBuilderPartAuthoringTier[];
  readonly authoringTierFilteredOutSummary: string | null;
  readonly sourceTextIncluded: boolean;
  readonly issueCount: number;
}

/** Catalog-level issue showing that a part cannot close through the source-lowering registry. */
export interface AppBuilderPartSourceLoweringCatalogIssue {
  readonly issueKind:
    | AppBuilderPartSourceLoweringIssueKind.UnknownPart
    | AppBuilderPartSourceLoweringIssueKind.MissingRequiredSlot
    | AppBuilderPartSourceLoweringIssueKind.UnsupportedSlotAssignment
    | AppBuilderPartSourceLoweringIssueKind.DuplicateSlotAssignment
    | AppBuilderPartSourceLoweringIssueKind.InvalidSlotValue
    | AppBuilderPartSourceLoweringIssueKind.UnsupportedApplicationSite
    | AppBuilderPartSourceLoweringIssueKind.UnsupportedPart
    | AppBuilderPartSourceLoweringIssueKind.DuplicateSourceLowerer
    | AppBuilderPartSourceLoweringIssueKind.OrphanedSourceLowerer
    | AppBuilderPartSourceLoweringIssueKind.LoweringFailed
    | AppBuilderPartSourceLoweringIssueKind.GeneratedFragmentSiteMismatch
    | AppBuilderPartSourceLoweringIssueKind.GeneratedSyntaxMismatch;
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly summary: string;
}

type AppBuilderPartSourceLowerer<TPart extends AppBuilderPartDescriptor = AppBuilderPartDescriptor> = (
  part: TPart,
  slots: AppBuilderPartSlotReader,
) => readonly AppBuilderPartSourceFragment[];

/** Per-invocation validated slot reader passed to executable app-builder part lowerers. */
class AppBuilderPartSlotReader {
  public constructor(
    private readonly part: AppBuilderPartDescriptor,
    private readonly slots: ReadonlyMap<AppBuilderPartSlotKind, string>,
  ) {}

  public get(slotKind: AppBuilderPartSlotKind): string | undefined {
    return this.slots.get(slotKind);
  }

  /** Read a required slot after public invocation validation has accepted it. */
  public required(slotKind: AppBuilderPartSlotKind): string {
    const value = this.slots.get(slotKind);
    if (value == null) {
      throw new Error(`Internal app-builder source-lowering invariant failed: part '${this.part.kind}:${this.part.id}' is missing '${slotKind}' slot.`);
    }
    return value;
  }

  /** Read an optional slot as null when absent or intentionally empty. */
  public optionalNonEmpty(slotKind: AppBuilderPartSlotKind): string | null {
    const value = this.slots.get(slotKind);
    return value == null || value.length === 0 ? null : value;
  }

  /** Read a required slot that was already validated against a closed value set. */
  public requiredClosed<TValue extends string>(
    slotKind: AppBuilderPartSlotKind,
    allowedValues: readonly TValue[],
  ): TValue {
    return this.closedValue(slotKind, this.required(slotKind), allowedValues);
  }

  /** Read an optional slot that was already validated against a closed value set. */
  public optionalClosed<TValue extends string>(
    slotKind: AppBuilderPartSlotKind,
    allowedValues: readonly TValue[],
  ): TValue | null {
    const value = this.optionalNonEmpty(slotKind);
    return value == null ? null : this.closedValue(slotKind, value, allowedValues);
  }

  /** Read an optional static boolean slot validated from literal source text. */
  public optionalBooleanLiteral(slotKind: AppBuilderPartSlotKind): boolean | null {
    const value = this.optionalNonEmpty(slotKind);
    if (value == null) {
      return null;
    }
    switch (value) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        throw new Error(`Internal app-builder source-lowering invariant failed: part '${this.part.kind}:${this.part.id}' slot '${slotKind}' has non-boolean value '${value}'.`);
    }
  }

  private closedValue<TValue extends string>(
    slotKind: AppBuilderPartSlotKind,
    value: string,
    allowedValues: readonly TValue[],
  ): TValue {
    if ((allowedValues as readonly string[]).includes(value)) {
      return value as TValue;
    }
    throw new Error(`Internal app-builder source-lowering invariant failed: part '${this.part.kind}:${this.part.id}' slot '${slotKind}' has unsupported value '${value}'.`);
  }
}

/** Executable callback registered for one cataloged app-builder part. */
interface AppBuilderPartSourceLowererRegistration {
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly lower: AppBuilderPartSourceLowerer;
}

interface AppBuilderPartSourceLowererRegistrationInput<TPart extends AppBuilderPartDescriptor> {
  readonly partKind: TPart['kind'];
  readonly partId: TPart['id'];
  readonly lower: AppBuilderPartSourceLowerer<TPart>;
}

function appBuilderPartSourceLowererRegistration<TPart extends AppBuilderPartDescriptor>(
  input: AppBuilderPartSourceLowererRegistrationInput<TPart>,
): AppBuilderPartSourceLowererRegistration {
  return {
    partKind: input.partKind,
    partId: input.partId,
    lower: (part, slots) => input.lower(requiredPartForSourceLowererRegistration(input, part), slots),
  };
}

function requiredPartForSourceLowererRegistration<TPart extends AppBuilderPartDescriptor>(
  registration: AppBuilderPartSourceLowererRegistrationInput<TPart>,
  part: AppBuilderPartDescriptor,
): TPart {
  if (part.kind !== registration.partKind || part.id !== registration.partId) {
    throw new Error(
      `Internal app-builder source-lowering invariant failed: lowerer '${registration.partKind}:${registration.partId}' received '${part.kind}:${part.id}'.`,
    );
  }
  return part as TPart;
}

const APP_BUILDER_APP_TASK_SLOTS = [
  AppTaskSlot.Creating,
  AppTaskSlot.Hydrating,
  AppTaskSlot.Hydrated,
  AppTaskSlot.Activating,
  AppTaskSlot.Activated,
  AppTaskSlot.Deactivating,
  AppTaskSlot.Deactivated,
] as const;

interface NamedResourceFrameworkApiSourceLowererRegistrationRequest {
  readonly resourceKind: NamedResourceDefinitionKind;
  readonly decoratorId: AppBuilderFrameworkApiId;
  readonly staticAuId: AppBuilderFrameworkApiId;
  readonly defineCallId: AppBuilderFrameworkApiId;
}

function namedResourceFrameworkApiSourceLowererRegistrations(
  request: NamedResourceFrameworkApiSourceLowererRegistrationRequest,
): readonly AppBuilderPartSourceLowererRegistration[] {
  return [
    appBuilderPartSourceLowererRegistration({
      partKind: AppBuilderPartKind.FrameworkApi,
      partId: request.decoratorId,
      lower: (part, slots) => lowerNamedResourceDecoratorFrameworkApiPart(part as AppBuilderFrameworkApiPartDescriptor, slots, request.resourceKind),
    }),
    appBuilderPartSourceLowererRegistration({
      partKind: AppBuilderPartKind.FrameworkApi,
      partId: request.staticAuId,
      lower: (part, slots) => lowerNamedResourceStaticAuFrameworkApiPart(part as AppBuilderFrameworkApiPartDescriptor, slots, request.resourceKind),
    }),
    appBuilderPartSourceLowererRegistration({
      partKind: AppBuilderPartKind.FrameworkApi,
      partId: request.defineCallId,
      lower: (part, slots) => lowerNamedResourceDefineCallFrameworkApiPart(part as AppBuilderFrameworkApiPartDescriptor, slots, request.resourceKind),
    }),
  ];
}

/** Lower a part invocation to source fragments using operation/site/slot metadata as authority. */
export function lowerAppBuilderPartSourceInvocation(
  invocation: AppBuilderPartSourceInvocation,
): AppBuilderPartSourceLowering {
  const part = tryAppBuilderPartDescriptor(invocation.partKind, invocation.partId);
  if (part == null) {
    return unknownPartSourceLowering(invocation);
  }
  if (invocation.applicationSite !== undefined && !part.applicationSites.includes(invocation.applicationSite)) {
    return partSourceLowering(invocation, part, AppBuilderPartSourceLoweringState.UnsupportedApplicationSite, [], [{
      issueKind: AppBuilderPartSourceLoweringIssueKind.UnsupportedApplicationSite,
      partKind: part.kind,
      partId: part.id,
      applicationSite: invocation.applicationSite,
      slotKind: null,
      summary: `App-builder part '${part.kind}:${part.id}' does not support application site '${invocation.applicationSite}'. Supported sites: ${part.applicationSites.join(', ')}.`,
    }]);
  }
  const slotAssignments = invocation.slotAssignments ?? [];
  const assignmentIssues = slotAssignmentIssues(part, invocation.applicationSite ?? null, slotAssignments);
  const missingSlots = missingRequiredSlots(part, slotAssignments);
  if (assignmentIssues.length > 0 || missingSlots.length > 0) {
    const missingIssues = missingSlots.map((slotKind): AppBuilderPartSourceLoweringIssue => ({
      issueKind: AppBuilderPartSourceLoweringIssueKind.MissingRequiredSlot,
      partKind: part.kind,
      partId: part.id,
      applicationSite: invocation.applicationSite ?? null,
      slotKind,
      valueLanguage: appBuilderPartSlotExpectation(part, slotKind).valueLanguage,
      summary: `App-builder part '${part.kind}:${part.id}' requires slot '${slotKind}' before it can lower to source.`,
    }));
    return partSourceLowering(
      invocation,
      part,
      missingIssues.length > 0
        ? AppBuilderPartSourceLoweringState.MissingSlots
        : AppBuilderPartSourceLoweringState.InvalidSlotAssignments,
      [],
      [
        ...assignmentIssues,
        ...missingIssues,
      ],
    );
  }

  const lowererLookup = sourceLowererLookupForPart(part);
  if (lowererLookup.duplicateCount > 1) {
    return partSourceLowering(invocation, part, AppBuilderPartSourceLoweringState.LoweringFailed, [], [{
      issueKind: AppBuilderPartSourceLoweringIssueKind.DuplicateSourceLowerer,
      partKind: part.kind,
      partId: part.id,
      applicationSite: invocation.applicationSite ?? null,
      slotKind: null,
      summary: `App-builder part '${part.kind}:${part.id}' has ${lowererLookup.duplicateCount} source lowerers; exactly one callback must own each part.`,
    }]);
  }
  if (lowererLookup.lowerer == null) {
    return partSourceLowering(invocation, part, AppBuilderPartSourceLoweringState.UnsupportedPart, [], [{
      issueKind: AppBuilderPartSourceLoweringIssueKind.UnsupportedPart,
      partKind: part.kind,
      partId: part.id,
      applicationSite: invocation.applicationSite ?? null,
      slotKind: null,
      summary: `App-builder part '${part.kind}:${part.id}' does not have a source lowerer yet.`,
    }]);
  }

  let fragments: readonly AppBuilderPartSourceFragment[];
  try {
    fragments = lowererLookup.lowerer(part, new AppBuilderPartSlotReader(part, slotAssignmentMap(slotAssignments)));
  } catch (error) {
    return partSourceLowering(invocation, part, AppBuilderPartSourceLoweringState.LoweringFailed, [], [{
      issueKind: AppBuilderPartSourceLoweringIssueKind.LoweringFailed,
      partKind: part.kind,
      partId: part.id,
      applicationSite: invocation.applicationSite ?? null,
      slotKind: null,
      summary: error instanceof Error ? error.message : String(error),
    }]);
  }
  const generatedSyntaxIssues = generatedFragmentInvocationIssues(part, invocation.applicationSite ?? null, fragments);
  const issues = [
    ...(invocation.applicationSite == null
      ? []
      : invocationSiteIssues(part, invocation.applicationSite, fragments)),
    ...generatedSyntaxIssues,
  ];
  return partSourceLowering(
    invocation,
    part,
    issues.length === 0
      ? AppBuilderPartSourceLoweringState.Complete
      : AppBuilderPartSourceLoweringState.InvalidGeneratedSource,
    fragments,
    issues,
  );
}

function unknownPartSourceLowering(
  invocation: AppBuilderPartSourceInvocation,
): AppBuilderPartSourceLowering {
  return {
    displayText: `App-builder part source lowering: ${invocation.partKind}:${invocation.partId} -> ${AppBuilderPartSourceLoweringState.UnknownPart}.\nFragments: 0; issues: 1.`,
    invocation,
    part: null,
    state: AppBuilderPartSourceLoweringState.UnknownPart,
    fragments: [],
    issues: [{
      issueKind: AppBuilderPartSourceLoweringIssueKind.UnknownPart,
      partKind: invocation.partKind,
      partId: invocation.partId,
      applicationSite: invocation.applicationSite ?? null,
      slotKind: null,
      summary: `App-builder part '${invocation.partKind}:${invocation.partId}' is not in the catalog.`,
    }],
    packageDependencies: [],
  };
}

/** Lower an invocation and read its single fragment of the expected source kind. */
export function lowerAppBuilderPartSourceFragment<TKind extends AppBuilderPartSourceFragmentKind>(
  invocation: AppBuilderPartSourceInvocation,
  expectedKind: TKind,
): AppBuilderPartSourceFragmentForKind<TKind>;
export function lowerAppBuilderPartSourceFragment<TKind extends AppBuilderPartSourceFragmentKind>(
  invocation: AppBuilderPartSourceInvocation,
  expectedKind: TKind,
): AppBuilderPartSourceFragmentForKind<TKind> {
  const lowering = lowerAppBuilderPartSourceInvocation(invocation);
  if (lowering.state !== AppBuilderPartSourceLoweringState.Complete) {
    throw new Error(
      `App-builder source invocation '${invocation.partKind}:${invocation.partId}' did not complete: ${lowering.issues
        .map((issue) => issue.summary)
        .join('; ')}`,
    );
  }
  if (lowering.fragments.length !== 1) {
    throw new Error(
      `App-builder source invocation '${invocation.partKind}:${invocation.partId}' produced ${lowering.fragments.length} fragments; expected exactly one.`,
    );
  }
  const fragment = lowering.fragments[0]!;
  if (fragment.kind !== expectedKind) {
    throw new Error(
      `App-builder source invocation '${invocation.partKind}:${invocation.partId}' produced '${fragment.kind}'; expected '${expectedKind}'.`,
    );
  }
  return fragment as AppBuilderPartSourceFragmentForKind<TKind>;
}

/** Lower an invocation and read the generated source text for one expected fragment kind. */
export function lowerAppBuilderPartSourceText(
  invocation: AppBuilderPartSourceInvocation,
  expectedKind: AppBuilderPartSourceFragmentKind,
): string {
  return lowerAppBuilderPartSourceFragment(invocation, expectedKind).text;
}

/** Add authored attributes to a structured template-element fragment without parsing its rendered source text. */
export function appendAppBuilderTemplateElementAttributes(
  fragment: AppBuilderTemplateElementPartSourceFragment,
  attributes: readonly AuthoredTemplateAttributeSource[],
): AppBuilderTemplateElementPartSourceFragment {
  const source = authoredTemplateElementSource(
    fragment.templateElement.tagName,
    normalizedAppBuilderTemplateElementAttributes([
      ...fragment.templateElement.attributes,
      ...attributes,
    ]),
    fragment.templateElement.childText,
    fragment.templateElement.children ?? [],
  );
  return {
    ...templateElement(authoredTemplateElementSourceText(source), source),
    origin: fragment.origin,
  };
}

/** Create a structured template-element fragment through the app-builder source composer. */
export function appBuilderTemplateElementFromParts(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[],
  childText: string | null,
  children: readonly AuthoredTemplateChildSource[] = [],
): AppBuilderTemplateElementPartSourceFragment {
  return templateElementFromParts(tagName, attributes, childText, children);
}

/** Preview callable source-lowering samples for the neutral part menu without generating an app. */
export function appBuilderPartSourceLoweringPreview(
  request: AppBuilderPartSourceLoweringPreviewRequest = {},
): AppBuilderPartSourceLoweringPreview {
  const filter = appBuilderPartMenuDescriptorFilter(request);
  const authoringTierPolicy = filter.authoringTierPolicy;
  const sampleKinds = request.sampleKinds ?? [AppBuilderPartSourceLoweringSampleKind.RequiredOnly];
  const rows: AppBuilderPartSourceLoweringPreviewRow[] = [];
  for (const part of filter.parts) {
    for (const sample of sampleSlotAssignmentSamplesForPart(part)) {
      if (!sampleKinds.includes(sample.sampleKind)) {
        continue;
      }
      const invocation: AppBuilderPartSourceInvocation = {
        partKind: part.kind,
        partId: part.id,
        applicationSite: preferredApplicationSite(part),
        slotAssignments: sample.slotAssignments,
      };
      const lowered = lowerAppBuilderPartSourceInvocation(invocation);
      rows.push({
        partKind: part.kind,
        partId: part.id,
        title: part.title,
        authoringTier: part.authoringTier,
        operationKind: part.operationKind,
        sampleKind: sample.sampleKind,
        invocation,
        state: lowered.state,
        fragments: lowered.fragments.map((fragment) => sourceFragmentPreview(fragment, request.includeSourceText === true)),
        issues: lowered.issues,
        packageDependencies: lowered.packageDependencies,
      });
    }
  }
  const issueCount = rows.reduce((count, row) => count + row.issues.length, 0);
  return {
    displayText: partSourceLoweringPreviewDisplayText(rows, filter, request.includeSourceText === true, issueCount),
    rows,
    authoringTierPolicy,
    authoringTierFilteredOutCount: filter.authoringTierFilteredOutCount,
    authoringTierFilteredOutTiers: filter.authoringTierFilteredOutTiers,
    authoringTierFilteredOutSummary: filter.authoringTierFilteredOutSummary,
    sourceTextIncluded: request.includeSourceText === true,
    issueCount,
  };
}

function partSourceLoweringPreviewDisplayText(
  rows: readonly AppBuilderPartSourceLoweringPreviewRow[],
  filter: ReturnType<typeof appBuilderPartMenuDescriptorFilter>,
  sourceTextIncluded: boolean,
  issueCount: number,
): string {
  const authoringTierPolicy = filter.authoringTierPolicy;
  const completeCount = rows.filter((row) => row.state === AppBuilderPartSourceLoweringState.Complete).length;
  const authoringTiers = uniqueStrings(rows.map((row) => row.authoringTier), 'sorted');
  const packageDependencies = uniqueStrings(rows.flatMap((row) => row.packageDependencies), 'sorted');
  const lines = [
    `App-builder part source-lowering preview: ${rows.length} sample(s), ${completeCount} complete, ${issueCount} issue(s).`,
    `Authoring tier policy: ${authoringTierPolicy.kind}. ${authoringTierPolicy.summary}`,
    `Authoring tiers: ${authoringTiers.length === 0 ? 'none' : authoringTiers.join(', ')}.`,
    `Source text included: ${sourceTextIncluded ? 'yes' : 'no'}.`,
  ];
  if (packageDependencies.length > 0) {
    lines.push(`Package dependencies: ${packageDependencies.join(', ')}.`);
  }
  if (filter.authoringTierFilteredOutSummary != null) {
    lines.push(filter.authoringTierFilteredOutSummary);
  }
  return lines.join('\n');
}

/** Check that every currently cataloged part has a structurally callable source lowerer. */
export function appBuilderPartSourceLoweringCatalogIssues(): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const issues: AppBuilderPartSourceLoweringCatalogIssue[] = [];
  issues.push(...sourceLowererRegistryIssues());
  for (const part of APP_BUILDER_PARTS) {
    for (const sample of sampleSlotAssignmentSamplesForPart(part)) {
      try {
        const lowered = lowerAppBuilderPartSourceInvocation({
          partKind: part.kind,
          partId: part.id,
          slotAssignments: sample.slotAssignments,
        });
        if (lowered.state !== AppBuilderPartSourceLoweringState.Complete) {
          issues.push(...lowered.issues.map((issue): AppBuilderPartSourceLoweringCatalogIssue => ({
            issueKind: issue.issueKind,
            partKind: issue.partKind,
            partId: issue.partId,
            summary: issue.summary,
          })));
          continue;
        }
        issues.push(...generatedFragmentCatalogIssues(part, lowered.fragments));
      } catch (error) {
        issues.push({
          issueKind: AppBuilderPartSourceLoweringIssueKind.LoweringFailed,
          partKind: part.kind,
          partId: part.id,
          summary: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return issues;
}

/** Throw when a cataloged app-builder part cannot be invoked by the source-lowering registry. */
export function assertAppBuilderPartSourceLoweringIntegrity(): void {
  const issues = appBuilderPartSourceLoweringCatalogIssues();
  if (issues.length === 0) {
    return;
  }
  throw new Error(
    `App-builder part source lowering has ${issues.length} issue(s): ${issues
      .map((issue) => `${issue.partKind}:${issue.partId}->${issue.issueKind}:${issue.summary}`)
      .join(', ')}`,
  );
}

function partSourceLowering(
  invocation: AppBuilderPartSourceInvocation,
  part: AppBuilderPartDescriptor,
  state: AppBuilderPartSourceLoweringState,
  fragments: readonly AppBuilderPartSourceFragment[],
  issues: readonly AppBuilderPartSourceLoweringIssue[],
): AppBuilderPartSourceLowering {
  const origin = partSourceFragmentOrigin(part, invocation);
  const packageDependencies = packageDependenciesForSourceLowering(part, fragments);
  return {
    displayText: partSourceLoweringDisplayText(part, state, fragments, issues, packageDependencies),
    invocation,
    part,
    state,
    fragments: fragments.map((fragment) => sourceFragmentWithOrigin(fragment, origin)),
    issues,
    packageDependencies,
  };
}

function packageDependenciesForSourceLowering(
  part: AppBuilderPartDescriptor,
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly string[] {
  return uniqueStrings([
    ...(part.requiredPackageSpecifier == null ? [] : [part.requiredPackageSpecifier]),
    ...fragments.flatMap((fragment) =>
      (fragment.requiredImports ?? [])
        .map((requirement) => requirement.moduleSpecifier)
        .filter(isPackageModuleSpecifier)
    ),
  ], 'sorted');
}

function isPackageModuleSpecifier(moduleSpecifier: string): boolean {
  return !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/');
}

function partSourceFragmentOrigin(
  part: AppBuilderPartDescriptor,
  invocation: AppBuilderPartSourceInvocation,
): AppBuilderPartSourceFragmentOrigin {
  return {
    kind: AppBuilderSourceFragmentOriginKind.PartSourceInvocation,
    partKind: part.kind,
    partId: part.id,
    operationKind: part.operationKind,
    applicationSite: invocation.applicationSite ?? null,
    slotKinds: uniqueStrings((invocation.slotAssignments ?? []).map((assignment) => assignment.slotKind), 'sorted'),
  };
}

function sourceFragmentWithOrigin<TFragment extends AppBuilderPartSourceFragment>(
  fragment: TFragment,
  origin: AppBuilderPartSourceFragmentOrigin,
): TFragment {
  return {
    ...fragment,
    origin: fragment.origin ?? origin,
  };
}

function partSourceLoweringDisplayText(
  part: AppBuilderPartDescriptor,
  state: AppBuilderPartSourceLoweringState,
  fragments: readonly AppBuilderPartSourceFragment[],
  issues: readonly AppBuilderPartSourceLoweringIssue[],
  packageDependencies: readonly string[],
): string {
  const fragmentKinds = fragments.map((fragment) => fragment.kind).join(', ');
  const lines = [
    `App-builder part source lowering: ${part.title} (${part.kind}:${part.id}) -> ${state}.`,
    `Fragments: ${fragments.length}${fragmentKinds.length === 0 ? '' : ` (${fragmentKinds})`}; issues: ${issues.length}.`,
  ];
  if (packageDependencies.length > 0) {
    lines.push(`Requires package: ${packageDependencies.join(', ')}.`);
  }
  return lines.join('\n');
}

function missingRequiredSlots(
  part: AppBuilderPartDescriptor,
  assignments: readonly AppBuilderPartSlotAssignment[],
): readonly AppBuilderPartSlotKind[] {
  const assigned = new Set(assignments.map((assignment) => assignment.slotKind));
  return part.requiredSlotKinds.filter((slotKind) => !assigned.has(slotKind));
}

function slotAssignmentIssues(
  part: AppBuilderPartDescriptor,
  applicationSite: AppBuilderPartApplicationSiteKind | null,
  assignments: readonly AppBuilderPartSlotAssignment[],
): readonly AppBuilderPartSourceLoweringIssue[] {
  const issues: AppBuilderPartSourceLoweringIssue[] = [];
  const allowedSlots = new Set<AppBuilderPartSlotKind>([
    ...part.requiredSlotKinds,
    ...part.optionalSlotKinds,
  ]);
  const seenSlots = new Set<AppBuilderPartSlotKind>();
  for (const assignment of assignments) {
    if (seenSlots.has(assignment.slotKind)) {
      const valueLanguage = allowedSlots.has(assignment.slotKind)
        ? appBuilderPartSlotExpectation(part, assignment.slotKind).valueLanguage
        : null;
      issues.push({
        issueKind: AppBuilderPartSourceLoweringIssueKind.DuplicateSlotAssignment,
        partKind: part.kind,
        partId: part.id,
        applicationSite,
        slotKind: assignment.slotKind,
        valueLanguage,
        summary: `App-builder part '${part.kind}:${part.id}' received more than one assignment for slot '${assignment.slotKind}'.`,
      });
      continue;
    }
    seenSlots.add(assignment.slotKind);
    if (!allowedSlots.has(assignment.slotKind)) {
      issues.push({
        issueKind: AppBuilderPartSourceLoweringIssueKind.UnsupportedSlotAssignment,
        partKind: part.kind,
        partId: part.id,
        applicationSite,
        slotKind: assignment.slotKind,
        valueLanguage: null,
        summary: `App-builder part '${part.kind}:${part.id}' does not declare slot '${assignment.slotKind}'. Declared slots: ${[
          ...allowedSlots,
        ].join(', ') || '<none>'}.`,
      });
      continue;
    }
    const expectation = appBuilderPartSlotExpectation(part, assignment.slotKind);
    const validationSummary = slotValueValidationSummary(expectation.valueLanguage, assignment.value);
    if (validationSummary != null) {
      issues.push({
        issueKind: AppBuilderPartSourceLoweringIssueKind.InvalidSlotValue,
        partKind: part.kind,
        partId: part.id,
        applicationSite,
        slotKind: assignment.slotKind,
        valueLanguage: expectation.valueLanguage,
        summary: `App-builder slot '${assignment.slotKind}' expected ${expectation.valueLanguage}: ${validationSummary}`,
      });
    }
  }
  return issues;
}

function slotValueValidationSummary(
  valueLanguage: AppBuilderPartSlotValueLanguage,
  value: string,
): string | null {
  switch (valueLanguage) {
    case AppBuilderPartSlotValueLanguage.Identifier:
      return identifierValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.DomEventName:
      return htmlNameValidationSummary(value, 'DOM event name');
    case AppBuilderPartSlotValueLanguage.HtmlAttributeName:
      return htmlNameValidationSummary(value, 'HTML/Aurelia attribute name');
    case AppBuilderPartSlotValueLanguage.HtmlAttributeValue:
      return nonEmptySingleLineValidationSummary(value, valueLanguage);
    case AppBuilderPartSlotValueLanguage.CssClassToken:
      return cssClassTokenValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.CssPropertyName:
      return cssPropertyNameValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.AureliaBindingExpression:
      return aureliaExpressionValidationSummary(value, 'IsProperty', ExpressionParseResultKind.ExpressionSuccess);
    case AppBuilderPartSlotValueLanguage.AureliaFunctionExpression:
      return aureliaExpressionValidationSummary(value, 'IsFunction', ExpressionParseResultKind.ExpressionSuccess);
    case AppBuilderPartSlotValueLanguage.AureliaIterableValueExpression:
      return aureliaExpressionValidationSummary(value, 'IsProperty', ExpressionParseResultKind.ExpressionSuccess);
    case AppBuilderPartSlotValueLanguage.ChoiceOptionBindingKind:
      return choiceOptionBindingKindValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.StateStoreName:
      return stateStoreNameValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.AureliaExpressionArgumentList:
      return aureliaExpressionArgumentListValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.RouterNavigationInstruction:
      return routerNavigationInstructionValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.RouterRouteExpression:
      return routerRouteExpressionValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.RouteContextParameterMergeStrategy:
      return routeContextParameterMergeStrategyValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.RouterViewportName:
      return staticNameTokenValidationSummary(value, valueLanguage);
    case AppBuilderPartSlotValueLanguage.RouterComponentFilter:
      return routerComponentFilterValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.ProjectionSlotName:
      return staticNameTokenValidationSummary(value, valueLanguage);
    case AppBuilderPartSlotValueLanguage.HtmlTagName:
      return htmlNameValidationSummary(value, 'HTML tag name');
    case AppBuilderPartSlotValueLanguage.PortalTarget:
      return nonEmptySingleLineValidationSummary(value, valueLanguage);
    case AppBuilderPartSlotValueLanguage.I18nTranslationKey:
      return i18nTranslationKeyExpressionValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.AuComposeScopeBehavior:
      return closedValueValidationSummary(value, AU_COMPOSE_SCOPE_BEHAVIORS, valueLanguage);
    case AppBuilderPartSlotValueLanguage.AuComposeFlushMode:
      return closedValueValidationSummary(value, AU_COMPOSE_FLUSH_MODES, valueLanguage);
    case AppBuilderPartSlotValueLanguage.PortalInsertPosition:
      return closedValueValidationSummary(value, PORTAL_INSERT_POSITIONS, valueLanguage);
    case AppBuilderPartSlotValueLanguage.BooleanLiteral:
      return booleanLiteralValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.NumericLiteral:
      return numericLiteralValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.ResourceName:
      return resourceNameValidationSummary(value);
    case AppBuilderPartSlotValueLanguage.TypeScriptExpression:
      return typeScriptSourceValidationSummary(`const __au_value = ${value};`, 'TypeScript expression');
    case AppBuilderPartSlotValueLanguage.TypeScriptType:
      return typeScriptSourceValidationSummary(`type __AuValue = ${value};`, 'TypeScript type');
    case AppBuilderPartSlotValueLanguage.TypeScriptExpressionList:
      return typeScriptSourceValidationSummary(`const __au_values = [${value}];`, 'TypeScript expression list');
    case AppBuilderPartSlotValueLanguage.TypeScriptStatements:
      return typeScriptSourceValidationSummary(`class __AuProbe { __au() { ${value} } }`, 'TypeScript statements');
    case AppBuilderPartSlotValueLanguage.AppTaskSlotName:
      return appTaskSlotValueValidationSummary(value);
  }
}

function identifierValidationSummary(value: string): string | null {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
    ? null
    : `value '${value}' is not an identifier.`;
}

function htmlNameValidationSummary(value: string, label: string): string | null {
  return value.length > 0 && /^[^\s"'<>/=]+$/.test(value)
    ? null
    : `value '${value}' is not a valid ${label}.`;
}

function cssClassTokenValidationSummary(value: string): string | null {
  return value.length > 0 && !/\s/.test(value)
    ? null
    : `value '${value}' is not a single CSS class token.`;
}

function cssPropertyNameValidationSummary(value: string): string | null {
  return /^(?:--[A-Za-z0-9_-]+|-?[a-z][a-z0-9-]*)$/.test(value)
    ? null
    : `value '${value}' is not a CSS property name.`;
}

function resourceNameValidationSummary(value: string): string | null {
  return /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/.test(value)
    ? null
    : `value '${value}' is not an Aurelia resource name.`;
}

function staticNameTokenValidationSummary(
  value: string,
  valueLanguage: AppBuilderPartSlotValueLanguage,
): string | null {
  return /^[A-Za-z][A-Za-z0-9_-]*$/.test(value)
    ? null
    : `value '${value}' is not a ${valueLanguage} static name token.`;
}

function routerComponentFilterValidationSummary(value: string): string | null {
  const lineIssue = nonEmptySingleLineValidationSummary(value, AppBuilderPartSlotValueLanguage.RouterComponentFilter);
  if (lineIssue != null) {
    return lineIssue;
  }
  const names = value.split(',');
  const invalid = names.find((name) => staticNameTokenValidationSummary(name, AppBuilderPartSlotValueLanguage.RouterComponentFilter) != null);
  return invalid == null
    ? null
    : `value '${value}' is not a comma-separated router component filter; '${invalid}' is not a static name token.`;
}

function choiceOptionBindingKindValidationSummary(value: string): string | null {
  return closedValueValidationSummary(
    value,
    APP_BUILDER_CHOICE_OPTION_BINDING_KINDS,
    AppBuilderPartSlotValueLanguage.ChoiceOptionBindingKind,
  );
}

function routeContextParameterMergeStrategyValidationSummary(value: string): string | null {
  return closedValueValidationSummary(
    value,
    ROUTE_CONTEXT_PARAMETER_MERGE_STRATEGY_SOURCES,
    AppBuilderPartSlotValueLanguage.RouteContextParameterMergeStrategy,
  );
}

function stateStoreNameValidationSummary(value: string): string | null {
  return value.length > 0 && /^[^\s"'<>/=.:]+$/.test(value)
    ? null
    : `value '${value}' is not an app-builder state store name; it must be a non-empty attribute-pattern part without '.', ':', whitespace, or HTML attribute delimiters.`;
}

function closedValueValidationSummary(
  value: string,
  allowedValues: readonly string[],
  valueLanguage: AppBuilderPartSlotValueLanguage,
): string | null {
  return allowedValues.includes(value)
    ? null
    : `value '${value}' is not a ${valueLanguage}. Expected one of: ${allowedValues.map((candidate) => `'${candidate}'`).join(', ')}.`;
}

function booleanLiteralValidationSummary(value: string): string | null {
  return value === 'true' || value === 'false'
    ? null
    : `value '${value}' is not a boolean literal. Expected 'true' or 'false'.`;
}

function numericLiteralValidationSummary(value: string): string | null {
  return /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(value)
    ? null
    : `value '${value}' is not a finite numeric literal.`;
}

function nonEmptySingleLineValidationSummary(
  value: string,
  valueLanguage: AppBuilderPartSlotValueLanguage,
): string | null {
  return value.length > 0 && !/[\r\n]/.test(value)
    ? null
    : `value '${value}' is not a non-empty single-line ${valueLanguage}.`;
}

function routerRouteExpressionValidationSummary(value: string): string | null {
  const lineIssue = nonEmptySingleLineValidationSummary(value, AppBuilderPartSlotValueLanguage.RouterRouteExpression);
  if (lineIssue != null) {
    return lineIssue;
  }
  try {
    parseRouteExpression(value);
    return null;
  } catch (error) {
    return error instanceof RouteExpressionParseFailure
      ? error.message
      : `value '${value}' did not parse as a router RouteExpression: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

function routerNavigationInstructionValidationSummary(value: string): string | null {
  const lineIssue = nonEmptySingleLineValidationSummary(value, AppBuilderPartSlotValueLanguage.RouterNavigationInstruction);
  if (lineIssue != null) {
    return lineIssue;
  }
  try {
    parseRouterStringNavigationInstruction(value);
    return null;
  } catch (error) {
    return error instanceof RouteExpressionParseFailure
      ? error.message
      : `value '${value}' did not parse as a router string navigation instruction: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

function aureliaExpressionArgumentListValidationSummary(value: string): string | null {
  return aureliaExpressionValidationSummary(
    bindingBehaviorExpressionSourceText({
      sourceExpression: '__auValue',
      behaviorName: '__auProbe',
      rawArguments: value,
    }),
    'IsProperty',
    ExpressionParseResultKind.ExpressionSuccess,
  );
}

function aureliaExpressionValidationSummary(
  value: string,
  expressionType: 'IsProperty' | 'IsFunction',
  expectedKind: ExpressionParseResultKind,
): string | null {
  const result = APP_BUILDER_SOURCE_EXPRESSION_PARSER.parse(value, expressionType);
  return result.kind === expectedKind
    ? null
    : `value '${value}' parsed as '${result.kind}', expected '${expectedKind}'.`;
}

function typeScriptSourceValidationSummary(
  source: string,
  label: string,
): string | null {
  const diagnostics = parseTypeScriptSourceDiagnostics(source);
  if (diagnostics.length === 0) {
    return null;
  }
  const first = diagnostics[0];
  return `${label} did not parse as TypeScript: ${first?.messageText ?? 'unknown parse error'}.`;
}

function appTaskSlotValueValidationSummary(value: string): string | null {
  return closedValueValidationSummary(
    value,
    APP_BUILDER_APP_TASK_SLOTS,
    AppBuilderPartSlotValueLanguage.AppTaskSlotName,
  );
}

function slotAssignmentMap(
  assignments: readonly AppBuilderPartSlotAssignment[],
): ReadonlyMap<AppBuilderPartSlotKind, string> {
  return new Map(assignments.map((assignment) => [assignment.slotKind, assignment.value]));
}

function sourceFragmentPreview(
  fragment: AppBuilderPartSourceFragment,
  includeSourceText: boolean,
): AppBuilderPartSourceFragmentPreview {
  return {
    kind: fragment.kind,
    text: includeSourceText ? fragment.text : undefined,
    templateAttributeName: fragment.templateAttribute?.rawName ?? null,
    templateAttributeHasValue: fragment.templateAttribute?.rawValue != null,
    templateElementTagName: fragment.templateElement?.tagName ?? null,
    templateAttributeCount: fragment.templateElement?.attributes.length ?? 0,
    childTextContainsInterpolation: templateElementContainsInterpolation(fragment.templateElement),
    childElementCount: templateElementChildElementCount(fragment.templateElement),
    requiredImports: fragment.requiredImports ?? [],
  };
}

function templateElementContainsInterpolation(
  element: AppBuilderTemplateElementSource | undefined,
): boolean {
  return textContainsExecutableInterpolation(element?.childText) === true
    || element?.children?.some((child) => (
      isAuthoredTemplateElementSource(child)
        ? templateElementContainsInterpolation(child)
        : textContainsExecutableInterpolation(child.text)
    )) === true;
}

function templateElementChildElementCount(
  element: AppBuilderTemplateElementSource | undefined,
): number {
  return element?.children?.filter(isAuthoredTemplateElementSource).length ?? 0;
}

function sourceLowererLookupForPart(
  part: AppBuilderPartDescriptor,
): { readonly lowerer: AppBuilderPartSourceLowerer | null; readonly duplicateCount: number } {
  const registrations = APP_BUILDER_PART_SOURCE_LOWERER_BY_KIND.get(part.kind)?.get(part.id) ?? [];
  return {
    lowerer: registrations.length === 1 ? registrations[0]!.lower : null,
    duplicateCount: registrations.length,
  };
}

const APP_BUILDER_PART_SOURCE_LOWERERS: readonly AppBuilderPartSourceLowererRegistration[] = [
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.TextInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.EmailInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.UrlInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.TelInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.PasswordInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.SearchInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.TimeInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.DateTimeLocalInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.MonthInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.WeekInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.NumberInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.DateInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.RangeInput, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.TextArea, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.Checkbox, lower: lowerSimpleControlElement }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.CheckboxList, lower: lowerCheckboxListControl }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.RadioGroup, lower: lowerRadioGroupControl }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.SingleSelect, lower: lowerSingleSelectControl }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.Control, partId: AppBuilderControlId.MultiSelect, lower: lowerMultiSelectControl }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.TextInterpolation, lower: lowerTextInterpolationBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.EventListener, lower: lowerEventListenerBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.EventCaptureListener, lower: lowerEventListenerBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.ElementRef, lower: lowerElementRefBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.ClassListBinding, lower: lowerClassListBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.ClassTokenToggle, lower: lowerClassTokenToggleBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.StyleRulesBinding, lower: lowerStyleRulesBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.StylePropertyBinding, lower: lowerStylePropertyBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.AttributeBinding, lower: lowerAttributeBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.AttributeToViewBinding, lower: lowerAttributeBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.LetBinding, lower: lowerLetBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.ElementModelValue, lower: lowerElementModelValueBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.CustomMatcher, lower: lowerCustomMatcherBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.StateBinding, lower: lowerStateBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.StateDispatch, lower: lowerStateDispatchPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.Translation, lower: lowerTranslationBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.DynamicTranslation, lower: lowerDynamicTranslationBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingPart, partId: AppBuilderBindingPartId.TranslationParameters, lower: lowerTranslationParametersBindingPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.Conditional, lower: lowerConditionalStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.ConditionalElse, lower: lowerConditionalElseStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.Repeat, lower: lowerRepeatStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.VirtualRepeat, lower: lowerVirtualRepeatStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.Switch, lower: lowerSwitchStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.SwitchCase, lower: lowerSwitchCaseStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.SwitchDefault, lower: lowerSwitchDefaultStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.Promise, lower: lowerPromiseStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.PromisePending, lower: lowerPromisePendingStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.PromiseFulfilled, lower: lowerPromiseFulfilledStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.PromiseRejected, lower: lowerPromiseRejectedStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.ValueScope, lower: lowerValueScopeStructuralPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.StructuralPart, partId: AppBuilderStructuralPartId.Portal, lower: lowerPortalStructuralPart }),
  ...APP_BUILDER_BINDING_BEHAVIORS.map((behavior) =>
    (appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.BindingBehavior, partId: behavior.id, lower: lowerBindingBehaviorPart }))),
  ...APP_BUILDER_VALUE_CONVERTERS.map((converter) =>
    (appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.ValueConverter, partId: converter.id, lower: lowerValueConverterPart }))),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.AuCompose, lower: lowerAuComposeFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.AuSlot, lower: lowerAuSlotFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.Focus, lower: lowerFocusFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.Show, lower: lowerShowFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.Viewport, lower: lowerViewportFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.Load, lower: lowerLoadFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.Href, lower: lowerHrefFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.ValidationErrors, lower: lowerValidationErrorsFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkComponent, partId: AppBuilderFrameworkComponentId.ValidationContainer, lower: lowerValidationContainerFrameworkResourcePart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkSyntax, partId: AppBuilderFrameworkSyntaxId.AsElement, lower: lowerAsElementFrameworkSyntaxPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkSyntax, partId: AppBuilderFrameworkSyntaxId.Containerless, lower: lowerContainerlessFrameworkSyntaxPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.CustomElementDecorator, lower: lowerCustomElementDecoratorFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.CustomElementStaticAuDefinition, lower: lowerCustomElementStaticAuFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.CustomElementDefineCall, lower: lowerCustomElementDefineCallFrameworkApiPart }),
  ...namedResourceFrameworkApiSourceLowererRegistrations({
    resourceKind: ResourceDefinitionKind.CustomAttribute,
    decoratorId: AppBuilderFrameworkApiId.CustomAttributeDecorator,
    staticAuId: AppBuilderFrameworkApiId.CustomAttributeStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.CustomAttributeDefineCall,
  }),
  ...namedResourceFrameworkApiSourceLowererRegistrations({
    resourceKind: ResourceDefinitionKind.TemplateController,
    decoratorId: AppBuilderFrameworkApiId.TemplateControllerDecorator,
    staticAuId: AppBuilderFrameworkApiId.TemplateControllerStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.TemplateControllerDefineCall,
  }),
  ...namedResourceFrameworkApiSourceLowererRegistrations({
    resourceKind: ResourceDefinitionKind.ValueConverter,
    decoratorId: AppBuilderFrameworkApiId.ValueConverterDecorator,
    staticAuId: AppBuilderFrameworkApiId.ValueConverterStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.ValueConverterDefineCall,
  }),
  ...namedResourceFrameworkApiSourceLowererRegistrations({
    resourceKind: ResourceDefinitionKind.BindingBehavior,
    decoratorId: AppBuilderFrameworkApiId.BindingBehaviorDecorator,
    staticAuId: AppBuilderFrameworkApiId.BindingBehaviorStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.BindingBehaviorDefineCall,
  }),
  ...namedResourceFrameworkApiSourceLowererRegistrations({
    resourceKind: ResourceDefinitionKind.BindingCommand,
    decoratorId: AppBuilderFrameworkApiId.BindingCommandDecorator,
    staticAuId: AppBuilderFrameworkApiId.BindingCommandStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.BindingCommandDefineCall,
  }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.AttributePatternCreate, lower: lowerAttributePatternCreateFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.RouteDecorator, lower: lowerRouteDecoratorFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.RouteContextParameterRead, lower: lowerRouteContextParameterReadFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.FromStateDecorator, lower: lowerFromStateFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.ComputedDecorator, lower: lowerComputedDecoratorFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.FrameworkApi, partId: AppBuilderFrameworkApiId.AppTaskRegistration, lower: lowerAppTaskRegistrationFrameworkApiPart }),
  appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.ResourceMetadata, partId: AppBuilderResourceMetadataId.LocalDependencies, lower: lowerLocalDependenciesResourceMetadataPart }),
  ...APP_BUILDER_COMPONENT_LIFECYCLES.map((lifecycle) =>
    (appBuilderPartSourceLowererRegistration({ partKind: AppBuilderPartKind.ComponentLifecycle, partId: lifecycle.id, lower: lowerComponentLifecyclePart }))),
];

const APP_BUILDER_PART_SOURCE_LOWERER_BY_KIND = sourceLowererRegistryByKind(APP_BUILDER_PART_SOURCE_LOWERERS);

const APP_BUILDER_SOURCE_EXPRESSION_PARSER = new ExpressionParser();

function sourceLowererRegistryIssues(): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const issues: AppBuilderPartSourceLoweringCatalogIssue[] = [];
  const knownPartIdsByKind = new Map<AppBuilderPartKind, Set<AppBuilderPartId>>();
  for (const part of APP_BUILDER_PARTS) {
    let ids = knownPartIdsByKind.get(part.kind);
    if (ids == null) {
      ids = new Set();
      knownPartIdsByKind.set(part.kind, ids);
    }
    ids.add(part.id);
  }
  const registrationCounts = new Map<AppBuilderPartKind, Map<AppBuilderPartId, number>>();
  for (const registration of APP_BUILDER_PART_SOURCE_LOWERERS) {
    incrementSourceLowererRegistrationCount(registrationCounts, registration);
    if (!(knownPartIdsByKind.get(registration.partKind)?.has(registration.partId) ?? false)) {
      issues.push({
        issueKind: AppBuilderPartSourceLoweringIssueKind.OrphanedSourceLowerer,
        partKind: registration.partKind,
        partId: registration.partId,
        summary: `App-builder part source lowerer '${registration.partKind}:${registration.partId}' is not backed by a cataloged part.`,
      });
    }
  }
  for (const [partKind, countsById] of registrationCounts) {
    for (const [partId, count] of countsById) {
      if (count <= 1) {
        continue;
      }
      issues.push({
        issueKind: AppBuilderPartSourceLoweringIssueKind.DuplicateSourceLowerer,
        partKind,
        partId,
        summary: `App-builder part source lowerer '${partKind}:${partId}' is registered ${count} times.`,
      });
    }
  }
  return issues;
}

function invocationSiteIssues(
  part: AppBuilderPartDescriptor,
  applicationSite: AppBuilderPartApplicationSiteKind,
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderPartSourceLoweringIssue[] {
  const issues: AppBuilderPartSourceLoweringIssue[] = [];
  const allowedKinds = fragmentKindsForApplicationSite(applicationSite);
  for (const fragment of fragments) {
    if (allowedKinds.includes(fragment.kind)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderPartSourceLoweringIssueKind.GeneratedFragmentSiteMismatch,
      partKind: part.kind,
      partId: part.id,
      applicationSite,
      slotKind: null,
      summary: `App-builder part '${part.kind}:${part.id}' generated '${fragment.kind}' for application site '${applicationSite}'; expected ${allowedKinds.join(' or ')}.`,
    });
  }
  return issues;
}

function generatedFragmentCatalogIssues(
  part: AppBuilderPartDescriptor,
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const issues: AppBuilderPartSourceLoweringCatalogIssue[] = [];
  for (const fragment of fragments) {
    if (!fragmentMatchesPartApplicationSites(part, fragment)) {
      issues.push(generatedFragmentSiteMismatch(
        part,
        `Generated fragment kind '${fragment.kind}' does not match any advertised application site for '${part.kind}:${part.id}'.`,
      ));
    }

    if (fragment.kind === AppBuilderPartSourceFragmentKind.TemplateAttribute) {
      const attribute = fragment.templateAttribute;
      const syntax = parseBuiltInAttributeSyntax(attribute.rawName, attribute.rawValue ?? '').execution;
      if (part.syntaxCommandName != null && syntax.command !== part.syntaxCommandName) {
        issues.push(generatedSyntaxMismatch(
          part,
          `Generated template attribute '${fragment.text}' parsed as command '${syntax.command ?? '<none>'}', expected '${part.syntaxCommandName}'.`,
        ));
      }
      issues.push(...generatedAttributeValueCatalogIssues(part, fragment.text, syntax));
      if (isAttributeResourcePart(part) && syntax.target !== part.resourceName) {
        issues.push(generatedSyntaxMismatch(
          part,
          `Generated template attribute '${fragment.text}' parsed as target '${syntax.target}', expected resource '${part.resourceName}'.`,
        ));
      }
    }

    if (fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement) {
      if (part.resourceKind === ResourceDefinitionKind.CustomElement && fragment.templateElement.tagName !== part.resourceName) {
        issues.push(generatedSyntaxMismatch(
          part,
          `Generated template element '${fragment.text}' carried tag '${fragment.templateElement.tagName}', expected resource '${part.resourceName}'.`,
        ));
      }
    }

    if (fragment.kind === AppBuilderPartSourceFragmentKind.TemplateElement && fragment.templateElement != null) {
      issues.push(...generatedTemplateElementAttributeCatalogIssues(part, fragment.templateElement));
      issues.push(...generatedTemplateElementChildTextCatalogIssues(part, fragment.templateElement));
    }

    if (fragment.kind === AppBuilderPartSourceFragmentKind.BindingExpression) {
      issues.push(...generatedBindingExpressionCatalogIssues(part, fragment.text));
    }

    if (fragment.kind === AppBuilderPartSourceFragmentKind.TextInterpolation) {
      issues.push(...generatedTextInterpolationCatalogIssues(part, fragment.text));
    }

    if (
      fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptDecorator
      || fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty
      || fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptExpression
      || fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration
      || fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptClassMember
    ) {
      issues.push(...generatedTypeScriptFragmentCatalogIssues(part, fragment));
    }
  }
  return issues;
}

function generatedFragmentInvocationIssues(
  part: AppBuilderPartDescriptor,
  applicationSite: AppBuilderPartApplicationSiteKind | null,
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderPartSourceLoweringIssue[] {
  return generatedFragmentCatalogIssues(part, fragments)
    .filter((issue) => issue.issueKind === AppBuilderPartSourceLoweringIssueKind.GeneratedSyntaxMismatch)
    .map((issue): AppBuilderPartSourceLoweringIssue => ({
      issueKind: AppBuilderPartSourceLoweringIssueKind.GeneratedSyntaxMismatch,
      partKind: issue.partKind,
      partId: issue.partId,
      applicationSite,
      slotKind: null,
      summary: issue.summary,
    }));
}

function generatedTypeScriptFragmentCatalogIssues(
  part: AppBuilderPartDescriptor,
  fragment: AppBuilderPartSourceFragment,
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const source = fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty
    ? `const __au_definition = { ${fragment.text} };`
    : fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptExpression
      ? `const __au_expression = ${fragment.text};`
      : fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration
        ? `${fragment.text}\n`
        : `class __AuGeneratedProbe {\n  ${fragment.text}\n  __au!: unknown;\n}`;
  const diagnostics = parseTypeScriptSourceDiagnostics(source);
  if (diagnostics.length === 0) {
    return [];
  }
  const first = diagnostics[0];
  return [generatedSyntaxMismatch(
    part,
    `Generated ${fragment.kind} '${fragment.text}' did not parse as TypeScript: ${first?.messageText ?? 'unknown parse error'}.`,
  )];
}

function parseTypeScriptSourceDiagnostics(
  source: string,
): ReturnType<typeof readTypeScriptSourceSyntaxDiagnostics> {
  return readTypeScriptSourceSyntaxDiagnostics(source, '__app_builder_part_source.ts');
}

function generatedTemplateElementAttributeCatalogIssues(
  part: AppBuilderPartDescriptor,
  element: AppBuilderTemplateElementSource,
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const scan = scanGeneratedTemplateElementAttributes(part, element);
  if (part.syntaxCommandName != null && !scan.commands.has(part.syntaxCommandName)) {
    return [
      ...scan.issues,
      generatedSyntaxMismatch(
        part,
        `Generated template element '${element.tagName}' did not contain expected binding command '${part.syntaxCommandName}'.`,
      ),
    ];
  }
  const expectedTarget = expectedTemplateElementCommandTarget(part);
  if (
    part.syntaxCommandName != null
    && expectedTarget != null
    && !(scan.targetsByCommand.get(part.syntaxCommandName)?.has(expectedTarget) ?? false)
  ) {
    return [
      ...scan.issues,
      generatedSyntaxMismatch(
        part,
        `Generated template element '${element.tagName}' did not contain expected '${expectedTarget}.${part.syntaxCommandName}' binding target.`,
      ),
    ];
  }
  return scan.issues;
}

function scanGeneratedTemplateElementAttributes(
  part: AppBuilderPartDescriptor,
  element: AppBuilderTemplateElementSource,
): {
  readonly issues: readonly AppBuilderPartSourceLoweringCatalogIssue[];
  readonly commands: ReadonlySet<string>;
  readonly targetsByCommand: ReadonlyMap<string, ReadonlySet<string>>;
} {
  const issues: AppBuilderPartSourceLoweringCatalogIssue[] = [];
  const commands = new Set<string>();
  const targetsByCommand = new Map<string, Set<string>>();
  for (const attribute of element.attributes) {
    const attributeText = authoredTemplateAttributeText(attribute);
    const syntax = parseBuiltInAttributeSyntax(attribute.rawName, attribute.rawValue ?? '').execution;
    if (syntax.syntaxKind === AttributeSyntaxKind.Open) {
      issues.push(generatedSyntaxMismatch(
        part,
        `Generated template element '${element.tagName}' attribute '${attributeText}' matched a built-in pattern that could not execute.`,
      ));
    }
    issues.push(...generatedAttributeValueCatalogIssues(part, attributeText, syntax));
    if (syntax.command != null) {
      commands.add(syntax.command);
      let targets = targetsByCommand.get(syntax.command);
      if (targets == null) {
        targets = new Set();
        targetsByCommand.set(syntax.command, targets);
      }
      targets.add(syntax.target);
    }
  }
  for (const child of element.children ?? []) {
    if (!isAuthoredTemplateElementSource(child)) {
      continue;
    }
    const childScan = scanGeneratedTemplateElementAttributes(part, child);
    issues.push(...childScan.issues);
    for (const command of childScan.commands) {
      commands.add(command);
    }
    for (const [command, targets] of childScan.targetsByCommand) {
      let existingTargets = targetsByCommand.get(command);
      if (existingTargets == null) {
        existingTargets = new Set();
        targetsByCommand.set(command, existingTargets);
      }
      for (const target of targets) {
        existingTargets.add(target);
      }
    }
  }
  return { issues, commands, targetsByCommand };
}

function generatedTemplateElementChildTextCatalogIssues(
  part: AppBuilderPartDescriptor,
  element: AppBuilderTemplateElementSource,
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const issues: AppBuilderPartSourceLoweringCatalogIssue[] = [];
  if (textContainsExecutableInterpolation(element.childText)) {
    issues.push(...generatedTextInterpolationCatalogIssues(part, element.childText));
  }
  for (const child of element.children ?? []) {
    if (isAuthoredTemplateElementSource(child)) {
      issues.push(...generatedTemplateElementChildTextCatalogIssues(part, child));
    } else if (textContainsExecutableInterpolation(child.text)) {
      issues.push(...generatedTextInterpolationCatalogIssues(part, child.text));
    }
  }
  return issues;
}

function textContainsExecutableInterpolation(text: string | null | undefined): text is string {
  if (text == null || !text.includes('${')) {
    return false;
  }
  return APP_BUILDER_SOURCE_EXPRESSION_PARSER.parse(text, 'Interpolation').kind === ExpressionParseResultKind.InterpolationSuccess;
}

function expectedTemplateElementCommandTarget(part: AppBuilderPartDescriptor): string | null {
  if (part.kind !== AppBuilderPartKind.Control) {
    return null;
  }
  return part.detail.bindingTargetName;
}

function generatedBindingExpressionCatalogIssues(
  part: AppBuilderPartDescriptor,
  expression: string,
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const result = APP_BUILDER_SOURCE_EXPRESSION_PARSER.parse(expression);
  if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) {
    return [generatedSyntaxMismatch(
      part,
      `Generated binding expression '${expression}' parsed as '${result.kind}', expected complete binding expression syntax.`,
    )];
  }

  if (part.resourceKind === ResourceDefinitionKind.BindingBehavior) {
    const ast = result.ast;
    if (ast.$kind !== 'BindingBehavior' || ast.name.name !== part.resourceName) {
      return [generatedSyntaxMismatch(
        part,
        `Generated binding expression '${expression}' parsed as binding behavior '${ast.$kind === 'BindingBehavior' ? ast.name.name : '<none>'}', expected '${part.resourceName}'.`,
      )];
    }
  }

  if (part.resourceKind === ResourceDefinitionKind.ValueConverter) {
    const ast = result.ast;
    if (ast.$kind !== 'ValueConverter' || ast.name.name !== part.resourceName) {
      return [generatedSyntaxMismatch(
        part,
        `Generated binding expression '${expression}' parsed as value converter '${ast.$kind === 'ValueConverter' ? ast.name.name : '<none>'}', expected '${part.resourceName}'.`,
      )];
    }
  }

  return [];
}

function generatedTextInterpolationCatalogIssues(
  part: AppBuilderPartDescriptor,
  text: string,
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  const result = APP_BUILDER_SOURCE_EXPRESSION_PARSER.parse(text, 'Interpolation');
  if (result.kind === ExpressionParseResultKind.InterpolationSuccess) {
    return [];
  }
  return [generatedSyntaxMismatch(
    part,
    `Generated text interpolation '${text}' parsed as '${result.kind}', expected complete interpolation syntax.`,
  )];
}

function generatedAttributeValueCatalogIssues(
  part: AppBuilderPartDescriptor,
  attributeText: string,
  syntax: { readonly command: string | null; readonly rawValue: string },
): readonly AppBuilderPartSourceLoweringCatalogIssue[] {
  if (syntax.command == null || syntax.rawValue.length === 0) {
    return [];
  }
  const command = findUniqueBuiltInBindingCommandByName(syntax.command);
  if (command == null) {
    return [];
  }
  const expressionType = builtInBindingCommandExpressionType(command);
  if (expressionType == null) {
    return [];
  }
  const result = APP_BUILDER_SOURCE_EXPRESSION_PARSER.parse(syntax.rawValue, expressionType);
  if (commandValueParseSucceeded(expressionType, result.kind)) {
    return [];
  }
  return [generatedSyntaxMismatch(
    part,
    `Generated template attribute '${attributeText}' value '${syntax.rawValue}' parsed as '${result.kind}', expected complete ${expressionType} syntax for command '${syntax.command}'.`,
  )];
}

function commandValueParseSucceeded(
  expressionType: NonNullable<ReturnType<typeof builtInBindingCommandExpressionType>>,
  resultKind: ExpressionParseResultKind,
): boolean {
  switch (expressionType) {
    case 'IsIterator':
      return resultKind === ExpressionParseResultKind.IteratorSuccess;
    case 'Interpolation':
      return resultKind === ExpressionParseResultKind.InterpolationSuccess;
    case 'IsProperty':
    case 'IsFunction':
    case 'IsCustom':
      return resultKind === ExpressionParseResultKind.ExpressionSuccess;
  }
}

function generatedSyntaxMismatch(
  part: AppBuilderPartDescriptor,
  summary: string,
): AppBuilderPartSourceLoweringCatalogIssue {
  return {
    issueKind: AppBuilderPartSourceLoweringIssueKind.GeneratedSyntaxMismatch,
    partKind: part.kind,
    partId: part.id,
    summary,
  };
}

function generatedFragmentSiteMismatch(
  part: AppBuilderPartDescriptor,
  summary: string,
): AppBuilderPartSourceLoweringCatalogIssue {
  return {
    issueKind: AppBuilderPartSourceLoweringIssueKind.GeneratedFragmentSiteMismatch,
    partKind: part.kind,
    partId: part.id,
    summary,
  };
}

function fragmentMatchesPartApplicationSites(
  part: AppBuilderPartDescriptor,
  fragment: AppBuilderPartSourceFragment,
): boolean {
  return part.applicationSites.some((applicationSite) =>
    fragmentKindsForApplicationSite(applicationSite).includes(fragment.kind));
}

function preferredApplicationSite(
  part: AppBuilderPartDescriptor,
): AppBuilderPartApplicationSiteKind {
  const site = part.applicationSites[0];
  if (site == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' does not advertise any application site.`);
  }
  return site;
}

function fragmentKindsForApplicationSite(
  applicationSite: AppBuilderPartApplicationSiteKind,
): readonly AppBuilderPartSourceFragmentKind[] {
  switch (applicationSite) {
    case AppBuilderPartApplicationSiteKind.TemplateElement:
      return [AppBuilderPartSourceFragmentKind.TemplateElement];
    case AppBuilderPartApplicationSiteKind.TemplateAttribute:
    case AppBuilderPartApplicationSiteKind.BindingCommandTarget:
    case AppBuilderPartApplicationSiteKind.TemplateController:
    case AppBuilderPartApplicationSiteKind.TemplateControllerBranch:
      return [AppBuilderPartSourceFragmentKind.TemplateAttribute];
    case AppBuilderPartApplicationSiteKind.TextInterpolation:
      return [AppBuilderPartSourceFragmentKind.TextInterpolation];
    case AppBuilderPartApplicationSiteKind.BindingExpressionModifier:
    case AppBuilderPartApplicationSiteKind.EventBindingExpressionModifier:
      return [AppBuilderPartSourceFragmentKind.BindingExpression];
    case AppBuilderPartApplicationSiteKind.TypeScriptDecorator:
      return [AppBuilderPartSourceFragmentKind.TypeScriptDecorator];
    case AppBuilderPartApplicationSiteKind.TypeScriptObjectProperty:
      return [AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty];
    case AppBuilderPartApplicationSiteKind.TypeScriptExpression:
      return [AppBuilderPartSourceFragmentKind.TypeScriptExpression];
    case AppBuilderPartApplicationSiteKind.TypeScriptTopLevelDeclaration:
      return [AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration];
    case AppBuilderPartApplicationSiteKind.TypeScriptClassMember:
      return [AppBuilderPartSourceFragmentKind.TypeScriptClassMember];
  }
}

function isAttributeResourcePart(part: AppBuilderPartDescriptor): boolean {
  return part.resourceKind === ResourceDefinitionKind.TemplateController
    || part.resourceKind === ResourceDefinitionKind.CustomAttribute;
}

function sourceLowererRegistryByKind(
  registrations: readonly AppBuilderPartSourceLowererRegistration[],
): ReadonlyMap<AppBuilderPartKind, ReadonlyMap<AppBuilderPartId, readonly AppBuilderPartSourceLowererRegistration[]>> {
  const registry = new Map<AppBuilderPartKind, Map<AppBuilderPartId, AppBuilderPartSourceLowererRegistration[]>>();
  for (const registration of registrations) {
    let registrationsById = registry.get(registration.partKind);
    if (registrationsById == null) {
      registrationsById = new Map();
      registry.set(registration.partKind, registrationsById);
    }
    let matchingRegistrations = registrationsById.get(registration.partId);
    if (matchingRegistrations == null) {
      matchingRegistrations = [];
      registrationsById.set(registration.partId, matchingRegistrations);
    }
    matchingRegistrations.push(registration);
  }
  return registry;
}

function incrementSourceLowererRegistrationCount(
  counts: Map<AppBuilderPartKind, Map<AppBuilderPartId, number>>,
  registration: AppBuilderPartSourceLowererRegistration,
): void {
  let countsById = counts.get(registration.partKind);
  if (countsById == null) {
    countsById = new Map();
    counts.set(registration.partKind, countsById);
  }
  countsById.set(registration.partId, (countsById.get(registration.partId) ?? 0) + 1);
}

function partBindingCommandAttribute(
  part: AppBuilderPartDescriptor,
  targetName: string,
  value: string,
  commandArgument = '',
): AppBuilderPartSourceFragment {
  return templateAttribute(partBindingCommandAttributeSource(part, targetName, value, commandArgument));
}

function partBindingCommandAttributeSource(
  part: AppBuilderPartDescriptor,
  targetName: string,
  value: string,
  commandArgument = '',
): AuthoredTemplateAttributeSource {
  const commandName = part.syntaxCommandName;
  if (commandName == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by a built-in binding command.`);
  }
  return builtInBindingCommandAttributeSource({
    commandName,
    targetName,
    rawValue: value,
    commandArgument,
  });
}

function requiredPartResourceName(part: AppBuilderPartDescriptor): string {
  if (part.resourceName == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by a built-in resource.`);
  }
  return part.resourceName;
}

function requirePartResourceName(
  part: AppBuilderPartDescriptor,
  expectedName: string,
): void {
  const resourceName = requiredPartResourceName(part);
  if (resourceName !== expectedName) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is backed by resource '${resourceName}', expected '${expectedName}'.`);
  }
}

function requiredPartFrameworkApiName(part: AppBuilderPartDescriptor): string {
  if (part.frameworkApiName == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by a framework API.`);
  }
  return part.frameworkApiName;
}

function requiredPartFrameworkApiModuleSpecifier(part: AppBuilderPartDescriptor): string {
  if (part.frameworkApiModuleSpecifier == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by a framework API module.`);
  }
  return part.frameworkApiModuleSpecifier;
}

function requireFrameworkSyntaxName(
  part: AppBuilderPartDescriptor,
  expectedName: TemplateSpecialAttributeName,
): void {
  if (part.frameworkSyntaxName !== expectedName) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by framework syntax '${expectedName}'.`);
  }
}

function requireResourceMetadataName(
  part: AppBuilderPartDescriptor,
  expectedName: ResourceDefinitionMetadataPropertyName,
): void {
  if (part.resourceMetadataName !== expectedName) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' is not backed by resource metadata '${expectedName}'.`);
  }
}

function lowerSimpleControlElement(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const control = part.detail;
  const expression = slots.required(AppBuilderPartSlotKind.BindingExpression);
  return [templateElementFromParts(
    control.sourceElement.tagName,
    [
      ...control.sourceElement.staticAttributes,
      partBindingCommandAttributeSource(part, control.bindingTargetName, expression),
      ...optionalControlNativeConstraintAttributes(slots),
    ],
    control.sourceElement.childText,
  )];
}

function optionalControlNativeConstraintAttributes(
  slots: AppBuilderPartSlotReader,
): readonly AuthoredTemplateAttributeSource[] {
  return [
    ...optionalBooleanAttribute('required', slots.optionalBooleanLiteral(AppBuilderPartSlotKind.NativeRequired)),
    ...optionalStaticAttribute('minlength', slots.get(AppBuilderPartSlotKind.TextMinLength)),
    ...optionalStaticAttribute('maxlength', slots.get(AppBuilderPartSlotKind.TextMaxLength)),
    ...optionalStaticAttribute('pattern', slots.get(AppBuilderPartSlotKind.TextPattern)),
    ...optionalStaticAttribute('min', slots.get(AppBuilderPartSlotKind.NumericMinimum)),
    ...optionalStaticAttribute('max', slots.get(AppBuilderPartSlotKind.NumericMaximum)),
    ...optionalStaticAttribute('step', slots.get(AppBuilderPartSlotKind.NumericStep)),
  ];
}

function optionalBooleanAttribute(
  rawName: string,
  value: boolean | null,
): readonly AuthoredTemplateAttributeSource[] {
  return value === true ? [{ rawName }] : [];
}

function optionalStaticAttribute(
  rawName: string,
  rawValue: string | null | undefined,
): readonly AuthoredTemplateAttributeSource[] {
  return rawValue == null ? [] : [{ rawName, rawValue }];
}

interface ChoiceOptionSourceInput {
  readonly optionDomain: string;
  readonly optionLocalName: string;
  readonly optionValue: string;
  readonly optionBindingTargetName: BuiltInBindingCommandTargetName.Value | BuiltInBindingCommandTargetName.Model;
  readonly optionLabelExpression: string;
  readonly matcherExpression: string | undefined;
}

interface ChoiceInputGroupElementInput extends ChoiceOptionSourceInput {
  readonly type: 'checkbox' | 'radio';
  readonly expression: string;
  readonly radioGroupName?: string | null;
  readonly required: boolean;
}

interface SelectElementInput extends ChoiceOptionSourceInput {
  readonly multiple: boolean;
  readonly expression: string;
  readonly required: boolean;
}

function lowerCheckboxListControl(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [choiceInputGroupElement({
    type: 'checkbox',
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    ...choiceOptionSourceInput(part, slots),
    required: false,
  })];
}

function lowerRadioGroupControl(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [choiceInputGroupElement({
    type: 'radio',
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    ...choiceOptionSourceInput(part, slots),
    radioGroupName: slots.optionalNonEmpty(AppBuilderPartSlotKind.RadioGroupName),
    required: slots.optionalBooleanLiteral(AppBuilderPartSlotKind.NativeRequired) === true,
  })];
}

function lowerSingleSelectControl(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [selectElement({
    multiple: false,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    ...choiceOptionSourceInput(part, slots),
    required: slots.optionalBooleanLiteral(AppBuilderPartSlotKind.NativeRequired) === true,
  })];
}

function lowerMultiSelectControl(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [selectElement({
    multiple: true,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    ...choiceOptionSourceInput(part, slots),
    required: false,
  })];
}

function lowerTextInterpolationBindingPart(
  _part: AppBuilderPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [textInterpolation(textInterpolationSourceText({
    sourceExpression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerEventListenerBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.EventName),
    slots.required(AppBuilderPartSlotKind.HandlerExpression),
  )];
}

function lowerElementRefBindingPart(
  _part: AppBuilderPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [templateAttribute(builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Ref,
    targetName: BuiltInBindingCommandTargetName.Element,
    rawValue: slots.required(AppBuilderPartSlotKind.ReferenceName),
  }))];
}

function lowerClassListBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(part, BuiltInBindingCommandTargetName.Class, slots.required(AppBuilderPartSlotKind.BindingExpression))];
}

function lowerClassTokenToggleBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.ClassToken),
    slots.required(AppBuilderPartSlotKind.BindingExpression),
  )];
}

function lowerStyleRulesBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(part, BuiltInBindingCommandTargetName.Style, slots.required(AppBuilderPartSlotKind.BindingExpression))];
}

function lowerStylePropertyBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.CssProperty),
    slots.required(AppBuilderPartSlotKind.BindingExpression),
  )];
}

function lowerAttributeBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.AttributeName),
    slots.required(AppBuilderPartSlotKind.BindingExpression),
  )];
}

function lowerLetBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [templateElementFromParts(
    'let',
    [partBindingCommandAttributeSource(
      part,
      slots.required(AppBuilderPartSlotKind.LocalName),
      slots.required(AppBuilderPartSlotKind.BindingExpression),
    )],
    '',
  )];
}

function lowerElementModelValueBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(part, BuiltInBindingCommandTargetName.Model, slots.required(AppBuilderPartSlotKind.OptionValueExpression))];
}

function lowerCustomMatcherBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(part, BuiltInBindingCommandTargetName.Matcher, slots.required(AppBuilderPartSlotKind.MatcherExpression))];
}

function lowerStateBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.BindingCommandTargetName),
    slots.required(AppBuilderPartSlotKind.BindingExpression),
    stateStoreCommandArgument(slots),
  )];
}

function lowerStateDispatchPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    slots.required(AppBuilderPartSlotKind.EventName),
    slots.required(AppBuilderPartSlotKind.BindingExpression),
    stateStoreCommandArgument(slots),
  )];
}

function lowerTranslationBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    '',
    slots.required(AppBuilderPartSlotKind.TranslationKeyExpression),
  )];
}

function lowerDynamicTranslationBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    '',
    slots.required(AppBuilderPartSlotKind.BindingExpression),
  )];
}

function lowerTranslationParametersBindingPart(
  part: AppBuilderBindingPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [partBindingCommandAttribute(
    part,
    '',
    slots.required(AppBuilderPartSlotKind.TranslationParametersExpression),
  )];
}

function lowerConditionalStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.If);
  return [templateAttribute(templateControllerValueAttributeSource({
    controllerName: BuiltInTemplateControllerName.If,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerConditionalElseStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Else);
  return [templateAttribute(templateControllerBareAttributeSource(BuiltInTemplateControllerName.Else))];
}

function lowerRepeatStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Repeat);
  return [templateAttribute(templateControllerIteratorAttributeSource({
    controllerName: BuiltInTemplateControllerName.Repeat,
    localName: slots.required(AppBuilderPartSlotKind.LocalName),
    iterableExpression: slots.required(AppBuilderPartSlotKind.IterableExpression),
  }))];
}

function lowerVirtualRepeatStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.VirtualRepeat);
  return [templateAttribute(templateControllerIteratorAttributeSource({
    controllerName: BuiltInTemplateControllerName.VirtualRepeat,
    localName: slots.required(AppBuilderPartSlotKind.LocalName),
    iterableExpression: slots.required(AppBuilderPartSlotKind.IterableExpression),
  }))];
}

function lowerSwitchStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Switch);
  return [templateAttribute(templateControllerValueAttributeSource({
    controllerName: BuiltInTemplateControllerName.Switch,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerSwitchCaseStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Case);
  return [templateAttribute(templateControllerValueAttributeSource({
    controllerName: BuiltInTemplateControllerName.Case,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerSwitchDefaultStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.DefaultCase);
  return [templateAttribute(templateControllerBareAttributeSource(BuiltInTemplateControllerName.DefaultCase))];
}

function lowerPromiseStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Promise);
  return [templateAttribute(templateControllerValueAttributeSource({
    controllerName: BuiltInTemplateControllerName.Promise,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerPromisePendingStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Pending);
  return [templateAttribute(templateControllerBareAttributeSource(BuiltInTemplateControllerName.Pending))];
}

function lowerPromiseFulfilledStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Then);
  return [templateAttribute(templateControllerLocalAttributeSource({
    controllerName: BuiltInTemplateControllerName.Then,
    localName: slots.get(AppBuilderPartSlotKind.LocalName),
  }))];
}

function lowerPromiseRejectedStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.Catch);
  return [templateAttribute(templateControllerLocalAttributeSource({
    controllerName: BuiltInTemplateControllerName.Catch,
    localName: slots.get(AppBuilderPartSlotKind.LocalName),
  }))];
}

function lowerValueScopeStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, BuiltInTemplateControllerName.With);
  return [templateAttribute(templateControllerValueAttributeSource({
    controllerName: BuiltInTemplateControllerName.With,
    expression: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerPortalStructuralPart(
  part: AppBuilderStructuralPartPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requiredPartResourceName(part);
  return [templateAttribute(portalAttributeSource({
    target: slots.get(AppBuilderPartSlotKind.PortalTarget),
    position: slots.optionalClosed(AppBuilderPartSlotKind.PortalPosition, PORTAL_INSERT_POSITIONS),
    renderContext: slots.get(AppBuilderPartSlotKind.PortalRenderContext),
    strict: slots.optionalBooleanLiteral(AppBuilderPartSlotKind.PortalStrict),
  }))];
}

function lowerBindingBehaviorPart(
  part: AppBuilderBindingBehaviorPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [bindingExpression(bindingBehaviorExpressionSourceText({
    sourceExpression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    behaviorName: requiredPartResourceName(part),
    rawArguments: slots.get(AppBuilderPartSlotKind.BindingBehaviorArguments),
  }))];
}

function lowerValueConverterPart(
  part: AppBuilderValueConverterPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [bindingExpression(valueConverterExpressionSourceText({
    sourceExpression: slots.required(AppBuilderPartSlotKind.BindingExpression),
    converterName: requiredPartResourceName(part),
    rawArguments: slots.get(AppBuilderPartSlotKind.ValueConverterArguments),
  }))];
}

function lowerAuComposeFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, AU_COMPOSE_RESOURCE_NAME);
  const source = auComposeElementSource({
    componentExpression: slots.get(AppBuilderPartSlotKind.CompositionComponentExpression),
    templateExpression: slots.get(AppBuilderPartSlotKind.CompositionTemplateExpression),
    modelExpression: slots.get(AppBuilderPartSlotKind.CompositionModelExpression),
    scopeBehavior: slots.optionalClosed(AppBuilderPartSlotKind.CompositionScopeBehavior, AU_COMPOSE_SCOPE_BEHAVIORS),
    hostTagName: slots.get(AppBuilderPartSlotKind.CompositionTagName),
    flushMode: slots.optionalClosed(AppBuilderPartSlotKind.CompositionFlushMode, AU_COMPOSE_FLUSH_MODES),
  });
  return [templateElement(authoredTemplateElementSourceText(source), source)];
}

function lowerAuSlotFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, AU_SLOT_RESOURCE_NAME);
  const source = auSlotElementSource({
    name: slots.get(AppBuilderPartSlotKind.ProjectionSlotName),
  });
  return [templateElement(authoredTemplateElementSourceText(source), source)];
}

function lowerFocusFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [templateAttribute(builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Bind,
    targetName: requiredPartResourceName(part),
    rawValue: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerShowFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [templateAttribute(builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Bind,
    targetName: requiredPartResourceName(part),
    rawValue: slots.required(AppBuilderPartSlotKind.BindingExpression),
  }))];
}

function lowerViewportFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, ROUTER_VIEWPORT_RESOURCE_NAME);
  const source = routerViewportElementSource({
    name: slots.get(AppBuilderPartSlotKind.ViewportName),
    usedBy: slots.get(AppBuilderPartSlotKind.ViewportUsedBy),
    defaultRoute: slots.get(AppBuilderPartSlotKind.ViewportDefault),
    fallback: slots.get(AppBuilderPartSlotKind.ViewportFallback),
  });
  return [templateElement(authoredTemplateElementSourceText(source), source)];
}

function lowerLoadFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const route = slots.required(AppBuilderPartSlotKind.RouteInstruction);
  return [templateAttribute(routerLoadAttributeSource({
    route,
    paramsExpression: slots.get(AppBuilderPartSlotKind.RouteParamsExpression),
    contextExpression: slots.get(AppBuilderPartSlotKind.RouteContextExpression),
    activeExpression: slots.get(AppBuilderPartSlotKind.RouteActiveExpression),
    targetAttributeName: slots.get(AppBuilderPartSlotKind.RouteTargetAttributeName),
  }))];
}

function lowerHrefFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const route = slots.required(AppBuilderPartSlotKind.RouteInstruction);
  return [templateAttribute(routerHrefAttributeSource({ value: route }))];
}

function lowerValidationErrorsFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, VALIDATION_ERRORS_RESOURCE_NAME);
  return [templateAttribute(validationErrorsAttributeSource({
    errorsExpression: slots.required(AppBuilderPartSlotKind.ValidationErrorsExpression),
    controllerExpression: slots.get(AppBuilderPartSlotKind.ValidationControllerExpression),
  }))];
}

function lowerValidationContainerFrameworkResourcePart(
  part: AppBuilderFrameworkComponentPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requirePartResourceName(part, VALIDATION_CONTAINER_RESOURCE_NAME);
  const source = validationContainerElementSource({
    errorsExpression: slots.get(AppBuilderPartSlotKind.ValidationErrorsExpression),
    controllerExpression: slots.get(AppBuilderPartSlotKind.ValidationControllerExpression),
  });
  return [templateElement(authoredTemplateElementSourceText(source), source)];
}

function lowerAsElementFrameworkSyntaxPart(
  part: AppBuilderFrameworkSyntaxPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requireFrameworkSyntaxName(part, TemplateSpecialAttributeName.AsElement);
  return [templateAttribute(asElementAttributeSource(
    slots.required(AppBuilderPartSlotKind.CustomElementResourceName),
  ))];
}

function lowerContainerlessFrameworkSyntaxPart(
  part: AppBuilderFrameworkSyntaxPartDescriptor,
): readonly AppBuilderPartSourceFragment[] {
  requireFrameworkSyntaxName(part, TemplateSpecialAttributeName.Containerless);
  return [templateAttribute(containerlessAttributeSource())];
}

function lowerCustomElementDecoratorFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptDecorator(
    customElementDecoratorSourceText({
      name: slots.required(AppBuilderPartSlotKind.CustomElementResourceName),
      templateExpression: slots.get(AppBuilderPartSlotKind.ResourceTemplateExpression),
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerCustomElementStaticAuFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptClassMember(
    customElementStaticAuPropertySourceText({
      name: slots.required(AppBuilderPartSlotKind.CustomElementResourceName),
      typeAnnotation: apiName,
      templateExpression: slots.get(AppBuilderPartSlotKind.ResourceTemplateExpression),
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedTypeImports: [apiName],
    }],
  )];
}

function lowerCustomElementDefineCallFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptExpression(
    customElementDefineCallSourceText({
      name: slots.required(AppBuilderPartSlotKind.CustomElementResourceName),
      customElementApiExpression: apiName,
      typeExpression: slots.required(AppBuilderPartSlotKind.ResourceTypeExpression),
      templateExpression: slots.get(AppBuilderPartSlotKind.ResourceTemplateExpression),
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerNamedResourceDecoratorFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
  resourceKind: NamedResourceDefinitionKind,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptDecorator(
    namedResourceDecoratorSourceText({
      resourceKind,
      name: slots.required(appBuilderNamedResourceNameSlotKind(resourceKind)),
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerNamedResourceStaticAuFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
  resourceKind: NamedResourceDefinitionKind,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptClassMember(
    namedResourceStaticAuPropertySourceText({
      resourceKind,
      name: slots.required(appBuilderNamedResourceNameSlotKind(resourceKind)),
      typeAnnotation: apiName,
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedTypeImports: [apiName],
    }],
  )];
}

function lowerNamedResourceDefineCallFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
  resourceKind: NamedResourceDefinitionKind,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptExpression(
    namedResourceDefineCallSourceText({
      resourceKind,
      name: slots.required(appBuilderNamedResourceNameSlotKind(resourceKind)),
      resourceApiExpression: apiName,
      typeExpression: slots.required(AppBuilderPartSlotKind.ResourceTypeExpression),
      dependencyExpressionList: slots.get(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerAttributePatternCreateFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptExpression(
    attributePatternCreateCallSourceText({
      attributePatternApiExpression: apiName,
      patternDefinitionExpressionList: slots.required(AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList),
      typeExpression: slots.required(AppBuilderPartSlotKind.ResourceTypeExpression),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerRouteDecoratorFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptDecorator(
    routerRouteDecoratorExpressionSourceText({
      routeConfigurationExpression: slots.required(AppBuilderPartSlotKind.RouteConfigurationExpression),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerRouteContextParameterReadFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  const receiverExpression = slots.optionalNonEmpty(AppBuilderPartSlotKind.RouteContextReceiverExpression);
  const mergeStrategy = slots.optionalClosed(
    AppBuilderPartSlotKind.RouteParameterMergeStrategy,
    ROUTE_CONTEXT_PARAMETER_MERGE_STRATEGY_SOURCES,
  ) as RouteContextParameterMergeStrategySource | null;
  const requiredImports = receiverExpression == null
    ? [
        { moduleSpecifier: 'aurelia', namedImports: ['resolve'] },
        { moduleSpecifier, namedImports: [apiName] },
      ]
    : [];
  return [typescriptExpression(
    routeContextParameterReadExpressionSourceText({
      receiverExpression: receiverExpression ?? undefined,
      parameterTypeSource: slots.required(AppBuilderPartSlotKind.RouteParameterType),
      mergeStrategy: mergeStrategy ?? undefined,
      includeQueryParams: slots.optionalBooleanLiteral(AppBuilderPartSlotKind.RouteIncludeQueryParams) ?? undefined,
    }),
    requiredImports,
  )];
}

function lowerFromStateFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptDecorator(
    fromStateDecoratorSourceText({
      storeName: slots.optionalNonEmpty(AppBuilderPartSlotKind.StateStoreName),
      selectorExpression: slots.required(AppBuilderPartSlotKind.StateSelectorExpression),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerComputedDecoratorFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptDecorator(
    computedDecoratorSourceText({
      argumentExpression: slots.required(AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerAppTaskRegistrationFrameworkApiPart(
  part: AppBuilderFrameworkApiPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  const moduleSpecifier = requiredPartFrameworkApiModuleSpecifier(part);
  const apiName = requiredPartFrameworkApiName(part);
  return [typescriptExpression(
    appTaskRegistrationSourceText({
      slot: slots.requiredClosed(AppBuilderPartSlotKind.AppTaskSlotName, APP_BUILDER_APP_TASK_SLOTS),
      keyExpression: slots.optionalNonEmpty(AppBuilderPartSlotKind.AppTaskKeyExpression),
      callbackExpression: slots.required(AppBuilderPartSlotKind.AppTaskCallbackExpression),
    }),
    [{
      moduleSpecifier,
      namedImports: [apiName],
    }],
  )];
}

function lowerLocalDependenciesResourceMetadataPart(
  part: AppBuilderResourceMetadataPartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  requireResourceMetadataName(part, ResourceDefinitionMetadataPropertyName.Dependencies);
  return [typescriptObjectProperty(resourceDependenciesPropertySourceText({
    dependencyExpressionList: slots.required(AppBuilderPartSlotKind.ResourceDependencyExpressionList),
  }))];
}

function lowerComponentLifecyclePart(
  part: AppBuilderComponentLifecyclePartDescriptor,
  slots: AppBuilderPartSlotReader,
): readonly AppBuilderPartSourceFragment[] {
  return [typescriptClassMember(componentLifecycleHookMethodSourceText({
    hookName: part.detail.hookName,
    bodyStatements: slots.optionalNonEmpty(AppBuilderPartSlotKind.TypeScriptMethodBodyStatements),
  }))];
}

function choiceInputGroupElement(
  input: ChoiceInputGroupElementInput,
): AppBuilderTemplateElementPartSourceFragment {
  return templateElementFromParts(
    'label',
    [choiceOptionRepeatAttribute(input)],
    null,
    [
      choiceInputControlElement(input),
      choiceOptionLabelElement(input),
    ],
  );
}

function selectElement(
  input: SelectElementInput,
): AppBuilderTemplateElementPartSourceFragment {
  return templateElementFromParts(
    'select',
    [
      ...(input.multiple ? [{ rawName: 'multiple' }] : []),
      builtInBindingCommandAttributeSource({
        commandName: BuiltInBindingCommandName.Bind,
        targetName: BuiltInBindingCommandTargetName.Value,
        rawValue: input.expression,
      }),
      ...optionalBooleanAttribute('required', input.required),
      ...optionalMatcherAttribute(input.matcherExpression),
    ],
    null,
    [selectOptionElement(input)],
  );
}

function choiceOptionSourceInput(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): ChoiceOptionSourceInput {
  return {
    optionDomain: slots.required(AppBuilderPartSlotKind.ValueDomainExpression),
    optionLocalName: choiceOptionLocalName(slots),
    optionValue: choiceOptionValueExpression(slots),
    optionBindingTargetName: choiceOptionBindingTargetName(part, slots),
    optionLabelExpression: choiceOptionLabelExpression(slots),
    matcherExpression: slots.get(AppBuilderPartSlotKind.MatcherExpression),
  };
}

function choiceOptionRepeatAttribute(
  input: ChoiceOptionSourceInput,
): AuthoredTemplateAttributeSource {
  return builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.For,
    targetName: BuiltInBindingCommandTargetName.Repeat,
    rawValue: iteratorBindingExpressionSourceText({
      localName: input.optionLocalName,
      iterableExpression: input.optionDomain,
    }),
  });
}

function choiceInputControlElement(
  input: ChoiceInputGroupElementInput,
): AuthoredTemplateChildSource {
  return authoredTemplateElementSource('input', [
    {
      rawName: 'type',
      rawValue: input.type,
    },
    ...(input.type === 'radio' ? optionalStaticAttribute('name', input.radioGroupName) : []),
    ...optionalBooleanAttribute('required', input.required),
    builtInBindingCommandAttributeSource({
      commandName: BuiltInBindingCommandName.Bind,
      targetName: BuiltInBindingCommandTargetName.Checked,
      rawValue: input.expression,
    }),
    builtInBindingCommandAttributeSource({
      commandName: BuiltInBindingCommandName.Bind,
      targetName: input.optionBindingTargetName,
      rawValue: input.optionValue,
    }),
    ...optionalMatcherAttribute(input.matcherExpression),
  ], null);
}

function choiceOptionLabelElement(
  input: ChoiceOptionSourceInput,
): AuthoredTemplateChildSource {
  return authoredTemplateElementSource('span', [], textInterpolationSourceText({
    sourceExpression: input.optionLabelExpression,
  }));
}

function selectOptionElement(
  input: ChoiceOptionSourceInput,
): AuthoredTemplateChildSource {
  return authoredTemplateElementSource(
    'option',
    [
      choiceOptionRepeatAttribute(input),
      builtInBindingCommandAttributeSource({
        commandName: BuiltInBindingCommandName.Bind,
        targetName: input.optionBindingTargetName,
        rawValue: input.optionValue,
      }),
    ],
    textInterpolationSourceText({ sourceExpression: input.optionLabelExpression }),
  );
}

function choiceOptionLocalName(slots: AppBuilderPartSlotReader): string {
  return slots.get(AppBuilderPartSlotKind.LocalName) ?? 'option';
}

function choiceOptionValueExpression(slots: AppBuilderPartSlotReader): string {
  return slots.get(AppBuilderPartSlotKind.OptionValueExpression) ?? choiceOptionLocalName(slots);
}

function choiceOptionBindingTargetName(
  part: AppBuilderControlPartDescriptor,
  slots: AppBuilderPartSlotReader,
): BuiltInBindingCommandTargetName.Value | BuiltInBindingCommandTargetName.Model {
  const bindingKind = slots.optionalClosed(
    AppBuilderPartSlotKind.OptionBindingKind,
    APP_BUILDER_CHOICE_OPTION_BINDING_KINDS,
  ) ?? AppBuilderChoiceOptionBindingKind.Model;
  const control = part.detail;
  if (!(control.optionBindingKinds?.includes(bindingKind) ?? false)) {
    throw new Error(`App-builder control '${control.id}' does not support option binding kind '${bindingKind}'.`);
  }
  switch (bindingKind) {
    case AppBuilderChoiceOptionBindingKind.Value:
      return BuiltInBindingCommandTargetName.Value;
    case AppBuilderChoiceOptionBindingKind.Model:
      return BuiltInBindingCommandTargetName.Model;
  }
}

function choiceOptionLabelExpression(slots: AppBuilderPartSlotReader): string {
  return slots.get(AppBuilderPartSlotKind.OptionLabelExpression) ?? choiceOptionLocalName(slots);
}

function stateStoreCommandArgument(
  slots: AppBuilderPartSlotReader,
): string {
  return slots.get(AppBuilderPartSlotKind.StateStoreName) ?? '';
}

function optionalMatcherAttribute(
  matcherExpression: string | undefined,
): readonly AuthoredTemplateAttributeSource[] {
  return matcherExpression == null || matcherExpression.length === 0
    ? []
    : [builtInBindingCommandAttributeSource({
      commandName: BuiltInBindingCommandName.Bind,
      targetName: BuiltInBindingCommandTargetName.Matcher,
      rawValue: matcherExpression,
    })];
}

function templateElement(
  text: string,
  templateElementSource: AppBuilderTemplateElementSource,
): AppBuilderTemplateElementPartSourceFragment {
  return {
    kind: AppBuilderPartSourceFragmentKind.TemplateElement,
    text,
    templateElement: templateElementSource,
  };
}

function templateElementFromParts(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[],
  childText: string | null,
  children: readonly AuthoredTemplateChildSource[] = [],
): AppBuilderTemplateElementPartSourceFragment {
  const source = authoredTemplateElementSource(
    tagName,
    normalizedAppBuilderTemplateElementAttributes(attributes),
    childText,
    children,
  );
  return templateElement(authoredTemplateElementSourceText(source), source);
}

export function normalizedAppBuilderTemplateElementAttributes(
  attributes: readonly AuthoredTemplateAttributeSource[],
): readonly AuthoredTemplateAttributeSource[] {
  const normalized: AuthoredTemplateAttributeSource[] = [];
  const classTokens: string[] = [];
  let classIndex = -1;
  const dataAttributeIndexByName = new Map<string, number>();
  for (const attribute of attributes) {
    const rawName = attribute.rawName.trim();
    if (rawName.length === 0) {
      continue;
    }
    const lowerName = rawName.toLowerCase();
    if (lowerName === 'class') {
      if (classIndex < 0) {
        classIndex = normalized.length;
        normalized.push({ rawName: 'class', rawValue: '' });
      }
      if (attribute.rawValue != null) {
        classTokens.push(...attribute.rawValue.split(/\s+/).filter((token) => token.length > 0));
      }
      continue;
    }
    if (lowerName.startsWith('data-')) {
      const dataAttribute = { rawName, rawValue: attribute.rawValue };
      const existingIndex = dataAttributeIndexByName.get(lowerName);
      if (existingIndex == null) {
        dataAttributeIndexByName.set(lowerName, normalized.length);
        normalized.push(dataAttribute);
      } else {
        normalized[existingIndex] = dataAttribute;
      }
      continue;
    }
    normalized.push({ rawName, rawValue: attribute.rawValue });
  }
  if (classIndex >= 0) {
    const uniqueClassTokens = uniqueStrings(classTokens);
    if (uniqueClassTokens.length === 0) {
      normalized.splice(classIndex, 1);
    } else {
      normalized[classIndex] = { rawName: 'class', rawValue: uniqueClassTokens.join(' ') };
    }
  }
  return normalized;
}

function isAuthoredTemplateElementSource(
  source: AuthoredTemplateChildSource,
): source is AppBuilderTemplateElementSource {
  return 'tagName' in source;
}

function templateAttribute(source: AppBuilderTemplateAttributeSource): AppBuilderPartSourceFragment {
  return {
    kind: AppBuilderPartSourceFragmentKind.TemplateAttribute,
    text: authoredTemplateAttributeText(source),
    templateAttribute: source,
  };
}

function textInterpolation(text: string): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.TextInterpolation, text };
}

function bindingExpression(text: string): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.BindingExpression, text };
}

function typescriptDecorator(
  text: string,
  requiredImports: readonly AppBuilderTypeScriptImportRequirement[],
): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.TypeScriptDecorator, text, requiredImports };
}

function typescriptObjectProperty(text: string): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty, text };
}

function typescriptExpression(
  text: string,
  requiredImports: readonly AppBuilderTypeScriptImportRequirement[],
): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.TypeScriptExpression, text, requiredImports };
}

function typescriptClassMember(
  text: string,
  requiredImports: readonly AppBuilderTypeScriptImportRequirement[] = [],
): AppBuilderPartSourceFragment {
  return { kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember, text, requiredImports };
}
