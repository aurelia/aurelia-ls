import type { AuthoredTemplateAttributeSource, AuthoredTemplateElementSource } from '../template/authored-template-source.js';
import type { TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import type { AppBuilderOntologyRowKind } from './ontology/relation.js';
import type { AppBuilderSourceLoweringCompositionKind } from './ontology/source-lowering-composition-contracts.js';
import type { AppBuilderSourceLoweringSurfaceKind } from './ontology/source-lowering-surface.js';
import type {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
  AppBuilderPartSlotValueLanguage,
} from './part-application.js';
import type { AppBuilderPartDescriptor, AppBuilderPartId, AppBuilderPartKind } from './part-catalog.js';

/** TypeScript import required by a generated source fragment. */
export interface AppBuilderTypeScriptImportRequirement extends TypeScriptImportRequirement {}

/** Origin family carried by generated app-builder source fragments before file spans exist. */
export enum AppBuilderSourceFragmentOriginKind {
  /** Fragment was produced by a concrete low-level part source invocation. */
  PartSourceInvocation = 'part-source-invocation',
  /** Fragment was produced by a direct app-builder ontology source-lowering target. */
  SourceLoweringTarget = 'source-lowering-target',
  /** Fragment was produced by a app-builder ontology source-lowering invocation. */
  SourceLoweringInvocation = 'source-lowering-invocation',
  /** Fragment was produced by a app-builder source-lowering composition. */
  SourceLoweringComposition = 'source-lowering-composition',
}

/** App-builder part invocation that produced one source fragment. */
export interface AppBuilderPartSourceFragmentOrigin {
  readonly kind: AppBuilderSourceFragmentOriginKind.PartSourceInvocation;
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly operationKind: AppBuilderPartOperationKind;
  readonly applicationSite: AppBuilderPartApplicationSiteKind | null;
  readonly slotKinds: readonly AppBuilderPartSlotKind[];
}

/** App-builder ontology target that produced one direct source fragment. */
export interface AppBuilderSourceLoweringTargetFragmentOrigin {
  readonly kind: AppBuilderSourceFragmentOriginKind.SourceLoweringTarget;
  readonly targetKind: AppBuilderOntologyRowKind;
  readonly targetId: string;
  readonly surfaceKind: AppBuilderSourceLoweringSurfaceKind;
}

/** App-builder ontology target invocation that produced one composed source fragment. */
export interface AppBuilderSourceLoweringFragmentOrigin {
  readonly kind: AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation;
  readonly targetKind: AppBuilderOntologyRowKind;
  readonly targetId: string;
  readonly controlPatternId: string | null;
  readonly controlId: string | null;
  readonly innerControlPatternId: string | null;
}

/** App-builder source-lowering composition identity carried by a composed fragment. */
export interface AppBuilderSourceLoweringCompositionFragmentOrigin {
  readonly kind: AppBuilderSourceFragmentOriginKind.SourceLoweringComposition;
  readonly compositionKind: AppBuilderSourceLoweringCompositionKind;
  readonly targetKind: AppBuilderOntologyRowKind;
  readonly targetId: string;
  readonly memberTargetIds: readonly string[];
}

/** Origin carried by an app-builder generated source fragment before concrete file spans exist. */
export type AppBuilderSourceFragmentOrigin =
  | AppBuilderPartSourceFragmentOrigin
  | AppBuilderSourceLoweringTargetFragmentOrigin
  | AppBuilderSourceLoweringFragmentOrigin
  | AppBuilderSourceLoweringCompositionFragmentOrigin;

/** Concrete source-fragment family produced by an app-builder part lowerer. */
export enum AppBuilderPartSourceFragmentKind {
  /** Complete template element fragment. */
  TemplateElement = 'template-element',
  /** Template attribute fragment that can be attached to an element. */
  TemplateAttribute = 'template-attribute',
  /** Text interpolation fragment. */
  TextInterpolation = 'text-interpolation',
  /** Binding expression fragment. */
  BindingExpression = 'binding-expression',
  /** TypeScript decorator fragment, excluding the declaration it annotates. */
  TypeScriptDecorator = 'typescript-decorator',
  /** TypeScript object-literal property fragment, excluding surrounding braces. */
  TypeScriptObjectProperty = 'typescript-object-property',
  /** TypeScript expression fragment, excluding surrounding statement punctuation. */
  TypeScriptExpression = 'typescript-expression',
  /** TypeScript top-level declaration fragment, excluding unrelated imports. */
  TypeScriptTopLevelDeclaration = 'typescript-top-level-declaration',
  /** TypeScript class member fragment, excluding surrounding class braces. */
  TypeScriptClassMember = 'typescript-class-member',
}

/** Result state for a part source invocation. */
export enum AppBuilderPartSourceLoweringState {
  /** The source invocation closed and produced fragments. */
  Complete = 'complete',
  /** The invocation has duplicate, unsupported, or syntactically invalid slot assignments. */
  InvalidSlotAssignments = 'invalid-slot-assignments',
  /** The invocation produced fragments, but parser/type syntax validation rejected at least one fragment. */
  InvalidGeneratedSource = 'invalid-generated-source',
  /** The invocation names a part kind/id pair that is not in the app-builder catalog. */
  UnknownPart = 'unknown-part',
  /** The invocation is missing caller-supplied slots. */
  MissingSlots = 'missing-slots',
  /** The invocation names a source application site the selected part does not support. */
  UnsupportedApplicationSite = 'unsupported-application-site',
  /** The selected part is known but does not have a source lowerer yet. */
  UnsupportedPart = 'unsupported-part',
  /** The selected part lowerer failed after slot validation accepted the invocation. */
  LoweringFailed = 'lowering-failed',
}

/** Issue category for app-builder part source lowering. */
export enum AppBuilderPartSourceLoweringIssueKind {
  /** The selected part kind/id pair is not cataloged. */
  UnknownPart = 'unknown-part',
  /** A required part slot was absent. */
  MissingRequiredSlot = 'missing-required-slot',
  /** A slot assignment names a slot this part does not declare. */
  UnsupportedSlotAssignment = 'unsupported-slot-assignment',
  /** More than one assignment was supplied for the same slot. */
  DuplicateSlotAssignment = 'duplicate-slot-assignment',
  /** A slot assignment does not parse or validate as the slot's declared value language. */
  InvalidSlotValue = 'invalid-slot-value',
  /** The caller requested a source application site the part does not support. */
  UnsupportedApplicationSite = 'unsupported-application-site',
  /** The part exists, but no lowerer owns its current source form. */
  UnsupportedPart = 'unsupported-part',
  /** More than one executable lowerer registered for the same app-builder part. */
  DuplicateSourceLowerer = 'duplicate-source-lowerer',
  /** A source lowerer is registered for a part that is not in the catalog. */
  OrphanedSourceLowerer = 'orphaned-source-lowerer',
  /** The part lowerer threw while handling a structurally complete invocation. */
  LoweringFailed = 'lowering-failed',
  /** A generated fragment does not match the source application site advertised by the part. */
  GeneratedFragmentSiteMismatch = 'generated-fragment-site-mismatch',
  /** A generated fragment no longer matches the framework syntax or resource catalog facts claimed by the part. */
  GeneratedSyntaxMismatch = 'generated-syntax-mismatch',
}

/** Structured authored-template attribute source carried by attribute fragments when composition needs it. */
export type AppBuilderTemplateAttributeSource = AuthoredTemplateAttributeSource;

/** Structured authored-template element source carried by element fragments when composition needs it. */
export type AppBuilderTemplateElementSource = AuthoredTemplateElementSource;

/** Shared fields for source fragments produced by executable app-builder part lowerers. */
interface AppBuilderPartSourceFragmentBase {
  readonly text: string;
  readonly requiredImports?: readonly AppBuilderTypeScriptImportRequirement[];
  readonly origin?: AppBuilderSourceFragmentOrigin;
}

/** Complete template-element source fragment with its structured authored-template source. */
export interface AppBuilderTemplateElementPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TemplateElement;
  readonly templateElement: AppBuilderTemplateElementSource;
  readonly templateAttribute?: never;
}

/** Template-attribute source fragment with its structured authored-template source. */
export interface AppBuilderTemplateAttributePartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TemplateAttribute;
  readonly templateAttribute: AppBuilderTemplateAttributeSource;
  readonly templateElement?: never;
}

/** Text interpolation source fragment. */
export interface AppBuilderTextInterpolationPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TextInterpolation;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** Binding expression source fragment, usually produced by a converter or behavior part. */
export interface AppBuilderBindingExpressionPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.BindingExpression;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** TypeScript decorator source fragment. */
export interface AppBuilderTypeScriptDecoratorPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TypeScriptDecorator;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** TypeScript object-literal property source fragment. */
export interface AppBuilderTypeScriptObjectPropertyPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** TypeScript expression source fragment. */
export interface AppBuilderTypeScriptExpressionPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TypeScriptExpression;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** TypeScript top-level declaration source fragment. */
export interface AppBuilderTypeScriptTopLevelDeclarationPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** TypeScript class-member source fragment. */
export interface AppBuilderTypeScriptClassMemberPartSourceFragment extends AppBuilderPartSourceFragmentBase {
  readonly kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember;
  readonly templateAttribute?: never;
  readonly templateElement?: never;
}

/** One discriminated source fragment produced by an app-builder part lowerer. */
export type AppBuilderPartSourceFragment =
  | AppBuilderTemplateElementPartSourceFragment
  | AppBuilderTemplateAttributePartSourceFragment
  | AppBuilderTextInterpolationPartSourceFragment
  | AppBuilderBindingExpressionPartSourceFragment
  | AppBuilderTypeScriptDecoratorPartSourceFragment
  | AppBuilderTypeScriptObjectPropertyPartSourceFragment
  | AppBuilderTypeScriptExpressionPartSourceFragment
  | AppBuilderTypeScriptTopLevelDeclarationPartSourceFragment
  | AppBuilderTypeScriptClassMemberPartSourceFragment;

/** Source fragment narrowed by its concrete fragment kind. */
export type AppBuilderPartSourceFragmentForKind<TKind extends AppBuilderPartSourceFragmentKind> =
  Extract<AppBuilderPartSourceFragment, { readonly kind: TKind }>;

/** Caller assignment for one source-lowering slot. */
export interface AppBuilderPartSlotAssignment {
  readonly slotKind: AppBuilderPartSlotKind;
  readonly value: string;
}

/** Invocation request for lowering one app-builder part into source fragments. */
export interface AppBuilderPartSourceInvocation {
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly applicationSite?: AppBuilderPartApplicationSiteKind;
  readonly slotAssignments?: readonly AppBuilderPartSlotAssignment[];
}

/** Lowering issue tied to the invocation rather than to semantic reopen diagnostics. */
export interface AppBuilderPartSourceLoweringIssue {
  readonly issueKind: AppBuilderPartSourceLoweringIssueKind;
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly applicationSite: AppBuilderPartApplicationSiteKind | null;
  readonly slotKind: AppBuilderPartSlotKind | null;
  readonly valueLanguage?: AppBuilderPartSlotValueLanguage | null;
  readonly summary: string;
}

/** Source-lowering result for one app-builder part invocation. */
export interface AppBuilderPartSourceLowering {
  readonly displayText: string;
  readonly invocation: AppBuilderPartSourceInvocation;
  readonly part: AppBuilderPartDescriptor | null;
  readonly state: AppBuilderPartSourceLoweringState;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderPartSourceLoweringIssue[];
  readonly packageDependencies: readonly string[];
}
