import type { SemanticSourceReference } from '../api/source-reference.js';
import { describeAddress } from '../api/source-reference.js';
import type { EvidenceKind, EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle, IdentityHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { KernelStore } from '../kernel/store.js';
import type { RuntimeExpressionAstValue } from '../expression/runtime-ast-value.js';
import type { ExpressionType } from '../expression/ast.js';
import type { BindableDefinition, BindableSetterKind } from '../resources/bindable-definition.js';
import {
  CustomElementCaptureKind,
  type ShadowRootMode,
  type TemplateSourceOffsetMap,
} from '../resources/custom-element-definition.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ResourceDefinitionSourceAttachment } from '../resources/resource-definition-source-attachment.js';
import type { ResourceDependencyReference, ResourceTargetReference } from '../resources/resource-reference.js';
import type {
  WatchCallbackDefinition,
  WatchDefinition,
  WatchExpressionDefinition,
  WatchFlushMode,
  WatchPropertyKeyDefinition,
} from '../resources/watch-definition.js';
import type { TemplateInstruction } from './instruction-ir.js';
import {
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
} from './instruction-ir.js';
import type { HtmlNamespaceKind } from './html-ir.js';
import {
  CompiledTemplateContextRole,
  type CompiledTemplateReference,
} from './compiled-template.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import {
  orderTemplateCompilerContextFamilyDefinitions,
  TemplateCompilerContextFamilyValueOwnerKind,
  type TemplateCompilerContextFamilyDefinitionLocation,
  type TemplateCompilerContextFamilyValueContext,
} from './template-compiler-context-family-value.js';
import type {
  TemplateCompilerCompiledDefinitionFamilyValue,
  TemplateCompilerCompiledDefinitionOverlay,
} from './template-compiler-compiled-definition-value.js';
import {
  CompilerTransformedTemplateComment,
  CompilerTransformedTemplateElement,
  CompilerTransformedTemplateFragment,
  CompilerTransformedTemplateText,
  type CompilerTransformedTemplateAttribute,
  type CompilerTransformedTemplateNode,
} from './template-structure.js';
import {
  TemplateCompilerFrameworkInstructionType,
  type TemplateCompilerRuntimeAttributeSyntaxValue,
  type TemplateCompilerRuntimeElementDataValue,
  type TemplateCompilerRuntimeInstructionValue,
} from './template-instruction-runtime-value.js';

export const TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION =
  'semantic-runtime/template-compiler-compiled-handoff/v3' as const;

export interface TemplateCompilerCompiledHandoffValue {
  readonly schemaVersion: typeof TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION;
  readonly address: TemplateCompilerCompiledHandoffAddress;
  readonly resourceName: string;
  readonly source: TemplateCompilerCompiledHandoffTemplateSource;
  readonly rootDefinitionId: string;
  readonly definitions: readonly TemplateCompilerCompiledHandoffDefinition[];
  readonly spreadClosure: TemplateCompilerCompiledHandoffSpreadClosure;
}

export interface TemplateCompilerCompiledHandoffSpreadClosureReason {
  readonly reasonKind: string;
  readonly summary: string;
  readonly stableKeys: readonly string[];
}

/** Runtime spread lookup closure is independent from the exact static compiled-definition handoff. */
export type TemplateCompilerCompiledHandoffSpreadClosure =
  | { readonly state: 'exact'; readonly reasons: readonly [] }
  | {
      readonly state: 'open' | 'pending' | 'ineligible';
      readonly reasons: readonly TemplateCompilerCompiledHandoffSpreadClosureReason[];
    };

/** Resource and compiler-world address for one detached compiled variant. */
export interface TemplateCompilerCompiledHandoffAddress {
  readonly definitionProductHandle: ProductHandle;
  readonly definitionIdentityHandle: IdentityHandle | null;
  readonly compilerWorldProductHandle: ProductHandle;
  readonly compilerWorldIdentityHandle: IdentityHandle;
  readonly sourceAttachment: ResourceDefinitionSourceAttachment | null;
}

export interface TemplateCompilerCompiledHandoffTemplateSource {
  readonly markup: string;
  readonly authoredSourceRevision: string;
  readonly sourceMap: TemplateSourceOffsetMap | null;
  readonly source: SemanticSourceReference | null;
}

export interface TemplateCompilerCompiledHandoffDefinition {
  readonly definitionId: string;
  readonly owner: TemplateCompilerCompiledHandoffDefinitionOwner;
  /** Compiler-front-door identity used by runtime controller topology; distinct from the final browser-family product. */
  readonly sourceCompiledTemplate: TemplateCompilerCompiledHandoffSourceCompiledTemplate;
  readonly header: TemplateCompilerCompiledHandoffDefinitionHeader;
  readonly tree: TemplateCompilerCompiledHandoffTree;
  readonly rows: readonly (readonly TemplateCompilerCompiledHandoffInstruction[])[];
  readonly surrogates: readonly TemplateCompilerCompiledHandoffInstruction[];
}

export interface TemplateCompilerCompiledHandoffSourceCompiledTemplate {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

/** Resource-local semantic unavailability while joining final definitions back to runtime controller topology. */
export class TemplateCompilerSourceCompiledTemplateUnavailable extends Error {
  constructor(
    readonly reasonKind: string,
    message: string,
    readonly stableKeys: readonly string[],
  ) {
    super(message);
    this.name = 'TemplateCompilerSourceCompiledTemplateUnavailable';
  }
}

export type TemplateCompilerCompiledHandoffDefinitionOwner =
  | { readonly ownerKind: 'root' }
  | {
      readonly ownerKind: 'local-template';
      readonly parentDefinitionId: string;
      readonly declarationOrdinal: number;
      readonly compilerAddedDependencyOrdinal: number;
      readonly definitionProductHandle: ProductHandle;
      readonly definitionIdentityHandle: IdentityHandle;
    }
  | {
      readonly ownerKind: 'template-controller' | 'projection';
      readonly parentDefinitionId: string;
      readonly parentRowIndex: number;
      readonly parentInstructionIndex: number;
      readonly slotName: string | null;
    };

export interface TemplateCompilerCompiledHandoffDefinitionHeader {
  readonly headerKind: 'root-resource-overlay' | 'generated-child';
  readonly type: ResourceDefinitionKind.CustomElement;
  readonly name: string | null;
  readonly needsCompile: false;
  readonly target: TemplateCompilerCompiledHandoffTargetReference | null;
  readonly aliases: readonly string[];
  readonly key: string | null;
  readonly capture: TemplateCompilerCompiledHandoffCapture;
  readonly dependencies: readonly TemplateCompilerCompiledHandoffDependencyReference[];
  readonly injectableIdentityHandle: IdentityHandle | null;
  readonly bindables: readonly TemplateCompilerCompiledHandoffBindable[];
  readonly containerless: boolean;
  readonly shadowOptions: { readonly mode: ShadowRootMode } | null;
  readonly hasSlots: boolean;
  readonly enhance: boolean;
  readonly watches: readonly TemplateCompilerCompiledHandoffWatch[];
  readonly strict: boolean | null;
  readonly processContent: TemplateCompilerCompiledHandoffTargetReference | null;
  readonly source: SemanticSourceReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffTargetReference {
  readonly identityHandle: IdentityHandle | null;
  readonly moduleKey: string | null;
  readonly localName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly declarationSource: SemanticSourceReference | null;
}

export interface TemplateCompilerCompiledHandoffCapture {
  readonly kind: CustomElementCaptureKind;
  readonly predicateTarget: TemplateCompilerCompiledHandoffTargetReference | null;
}

export interface TemplateCompilerCompiledHandoffDependencyReference {
  readonly identityHandle: IdentityHandle | null;
  readonly keyName: string | null;
  readonly moduleKey: string | null;
  readonly localName: string | null;
  readonly dependencyKind: ResourceDependencyReference['dependencyKind'];
  readonly registryKind: ResourceDependencyReference['registryKind'];
  readonly cssModulesInput: null | {
    readonly mappingArguments: readonly {
      readonly entries: readonly { readonly className: string; readonly mappedClassName: string }[];
      readonly mayHaveUnknownMappings: boolean;
      readonly sourceModuleKey: string | null;
    }[];
    readonly mayHaveUnknownArguments: boolean;
    readonly mayHaveUnknownArgumentOrder: boolean;
  };
}

export interface TemplateCompilerCompiledHandoffBindable {
  readonly attribute: string;
  readonly callback: string;
  readonly mode: BindableDefinition['mode'];
  readonly name: string;
  readonly setter: {
    readonly kind: BindableSetterKind;
    readonly target: TemplateCompilerCompiledHandoffTargetReference | null;
    readonly nullable: boolean | null;
  };
  readonly source: SemanticSourceReference | null;
  readonly propertyTarget: TemplateCompilerCompiledHandoffTargetReference | null;
  readonly callbackTarget: TemplateCompilerCompiledHandoffTargetReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffWatch {
  readonly expression: TemplateCompilerCompiledHandoffWatchExpression;
  readonly callback: TemplateCompilerCompiledHandoffWatchCallback;
  readonly flush: WatchFlushMode;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffWatchExpression {
  readonly kind: WatchExpressionDefinition['kind'];
  readonly propertyKey: TemplateCompilerCompiledHandoffWatchPropertyKey | null;
  readonly target: TemplateCompilerCompiledHandoffTargetReference | null;
}

export interface TemplateCompilerCompiledHandoffWatchCallback {
  readonly kind: WatchCallbackDefinition['kind'];
  readonly methodName: TemplateCompilerCompiledHandoffWatchPropertyKey | null;
  readonly target: TemplateCompilerCompiledHandoffTargetReference | null;
}

export interface TemplateCompilerCompiledHandoffWatchPropertyKey {
  readonly kind: WatchPropertyKeyDefinition['kind'];
  readonly text: string | null;
  readonly number: number | null;
  readonly target: TemplateCompilerCompiledHandoffTargetReference | null;
}

export interface TemplateCompilerCompiledHandoffTree {
  readonly compilerCarrierNodeId: string;
  readonly compilerContentNodeId: string;
  readonly nodes: readonly TemplateCompilerCompiledHandoffNode[];
  readonly attributes: readonly TemplateCompilerCompiledHandoffAttribute[];
  readonly source: SemanticSourceReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export type TemplateCompilerCompiledHandoffNode =
  | TemplateCompilerCompiledHandoffFragment
  | TemplateCompilerCompiledHandoffElement
  | TemplateCompilerCompiledHandoffText
  | TemplateCompilerCompiledHandoffComment;

interface TemplateCompilerCompiledHandoffNodeBase {
  readonly nodeId: string;
  readonly source: SemanticSourceReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffFragment extends TemplateCompilerCompiledHandoffNodeBase {
  readonly nodeKind: 'fragment';
  readonly children: readonly string[];
}

export interface TemplateCompilerCompiledHandoffElement extends TemplateCompilerCompiledHandoffNodeBase {
  readonly nodeKind: 'element';
  readonly tagName: string;
  readonly namespace: string;
  readonly namespaceUri: string;
  readonly attributeIds: readonly string[];
  readonly children: readonly string[];
  readonly templateContentNodeId: string | null;
}

export interface TemplateCompilerCompiledHandoffText extends TemplateCompilerCompiledHandoffNodeBase {
  readonly nodeKind: 'text';
  readonly text: string;
  readonly textKind: string;
}

export interface TemplateCompilerCompiledHandoffComment extends TemplateCompilerCompiledHandoffNodeBase {
  readonly nodeKind: 'comment';
  readonly text: string;
  readonly semanticKind: string;
}

export interface TemplateCompilerCompiledHandoffAttribute {
  readonly attributeId: string;
  readonly ownerNodeId: string;
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
  readonly source: SemanticSourceReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffFieldProvenance {
  readonly field: string;
  readonly provenanceHandle: ProvenanceHandle;
  readonly evidence: readonly TemplateCompilerCompiledHandoffEvidence[];
}

export interface TemplateCompilerCompiledHandoffEvidence {
  readonly evidenceKind: EvidenceKind;
  readonly roles: readonly EvidenceRole[];
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
}

export interface TemplateCompilerCompiledHandoffInstruction {
  readonly value: TemplateCompilerCompiledHandoffInstructionValue;
  readonly source: SemanticSourceReference | null;
  readonly fieldProvenance: readonly TemplateCompilerCompiledHandoffFieldProvenance[];
}

export interface TemplateCompilerCompiledHandoffDefinitionReference {
  readonly definitionId: string;
}

export interface TemplateCompilerCompiledHandoffProjectionReference {
  readonly slotName: string;
  readonly definition: TemplateCompilerCompiledHandoffDefinitionReference;
}

/** One runtime parser lookup that remains string-valued after a spread instruction closure is precompiled. */
export interface TemplateCompilerCompiledHandoffSpreadExpressionEntry {
  readonly expressionType: ExpressionType;
  readonly source: string;
  readonly value: RuntimeExpressionAstValue;
}

export interface TemplateCompilerCompiledHandoffSpreadTarget {
  readonly namespaceKind: HtmlNamespaceKind;
  readonly namespaceUri: string | null;
  readonly localName: string;
  readonly targetDefinitionMatch: 'structural' | 'explicit-definition';
  readonly definitionName: string | null;
  readonly definitionKey: string | null;
}

/** One exact compileSpread result for an emitted HydrateElement captures array and one requestor target. */
export interface TemplateCompilerCompiledHandoffSpreadCase {
  readonly requestorName: string;
  readonly requestorKey: string;
  readonly target: TemplateCompilerCompiledHandoffSpreadTarget;
  readonly instructions: readonly TemplateCompilerCompiledHandoffInstructionValue[];
  readonly residualExpressions: readonly TemplateCompilerCompiledHandoffSpreadExpressionEntry[];
}

export interface TemplateCompilerCompiledHandoffSpreadPlan {
  readonly cases: readonly TemplateCompilerCompiledHandoffSpreadCase[];
}

type HandoffUnchangedInstructionValue = Exclude<
  TemplateCompilerRuntimeInstructionValue,
  { readonly type:
    | TemplateCompilerFrameworkInstructionType.HydrateTemplateController
    | TemplateCompilerFrameworkInstructionType.HydrateElement
    | TemplateCompilerFrameworkInstructionType.HydrateAttribute
    | TemplateCompilerFrameworkInstructionType.HydrateLetElement
    | TemplateCompilerFrameworkInstructionType.IteratorBinding
    | TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding
    | TemplateCompilerFrameworkInstructionType.SpreadElementProp
  }
>;

export type TemplateCompilerCompiledHandoffInstructionValue =
  | HandoffUnchangedInstructionValue
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateTemplateController;
      readonly def: TemplateCompilerCompiledHandoffDefinitionReference;
      readonly res: string;
      readonly alias: undefined;
      readonly props: readonly TemplateCompilerCompiledHandoffInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateAttribute;
      readonly res: string;
      readonly alias: string | undefined;
      readonly props: readonly TemplateCompilerCompiledHandoffInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateElement;
      readonly res: string;
      readonly props: readonly TemplateCompilerCompiledHandoffInstructionValue[];
      readonly projections: readonly TemplateCompilerCompiledHandoffProjectionReference[] | null;
      readonly containerless: boolean;
      readonly captures: readonly TemplateCompilerRuntimeAttributeSyntaxValue[];
      readonly data: TemplateCompilerRuntimeElementDataValue;
      readonly spreadPlan: TemplateCompilerCompiledHandoffSpreadPlan | null;
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.HydrateLetElement;
      readonly instructions: readonly TemplateCompilerCompiledHandoffInstructionValue[];
      readonly toBindingContext: boolean;
    }
  | {
      readonly type:
        | TemplateCompilerFrameworkInstructionType.IteratorBinding
        | TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding;
      readonly forOf: RuntimeExpressionAstValue;
      readonly to: string;
      readonly props: readonly TemplateCompilerCompiledHandoffInstructionValue[];
    }
  | {
      readonly type: TemplateCompilerFrameworkInstructionType.SpreadElementProp;
      readonly instruction: TemplateCompilerCompiledHandoffInstructionValue;
    };

export interface TemplateCompilerCompiledHandoffProjectionRequest {
  readonly definitions: TemplateCompilerCompiledDefinitionFamilyValue;
  /** Original compiler-front-door family whose products are referenced by runtime controllers and view factories. */
  readonly sourceCompiledTemplates: CompiledTemplateEmission;
  readonly address: TemplateCompilerCompiledHandoffAddress;
  readonly markup: string;
  readonly authoredSourceRevision: string;
  readonly sourceMap: TemplateSourceOffsetMap | null;
  readonly source: SemanticSourceReference | null;
  readonly store: KernelStore;
  readonly spreadPlansByInstruction?: ReadonlyMap<TemplateInstruction, TemplateCompilerCompiledHandoffSpreadPlan>;
  readonly spreadClosure: TemplateCompilerCompiledHandoffSpreadClosure;
}

export interface TemplateCompilerCompiledHandoffLocalFamilyProjection {
  readonly definitions: TemplateCompilerCompiledDefinitionFamilyValue;
  readonly sourceCompiledTemplates: CompiledTemplateEmission;
  readonly parentDefinitions: TemplateCompilerCompiledDefinitionFamilyValue;
  readonly localDefinitionProductHandle: ProductHandle;
  readonly localDefinitionIdentityHandle: IdentityHandle;
  readonly parentDefinitionProductHandle: ProductHandle;
  readonly declarationOrdinal: number;
  readonly compilerAddedDependencyOrdinal: number;
}

export interface TemplateCompilerOccurrenceCompiledHandoffProjectionRequest
  extends TemplateCompilerCompiledHandoffProjectionRequest {
  readonly locals: readonly TemplateCompilerCompiledHandoffLocalFamilyProjection[];
}

interface DefinitionProjectionEntry {
  readonly location: TemplateCompilerContextFamilyDefinitionLocation;
  readonly overlay: TemplateCompilerCompiledDefinitionOverlay;
  readonly sourceCompiledTemplates: CompiledTemplateEmission;
  readonly local: TemplateCompilerCompiledHandoffLocalFamilyProjection | null;
}

/** Detach one exact compiled-definition family into the sole build-consumer value. */
export function projectTemplateCompilerCompiledHandoff(
  request: TemplateCompilerCompiledHandoffProjectionRequest,
): TemplateCompilerCompiledHandoffValue {
  return projectCompiledHandoff(request, []);
}

/** Detach one root and its scoped local-definition forest into a single source-owned compiler artifact. */
export function projectTemplateCompilerOccurrenceCompiledHandoff(
  request: TemplateCompilerOccurrenceCompiledHandoffProjectionRequest,
): TemplateCompilerCompiledHandoffValue {
  return projectCompiledHandoff(request, request.locals);
}

function projectCompiledHandoff(
  request: TemplateCompilerCompiledHandoffProjectionRequest,
  locals: readonly TemplateCompilerCompiledHandoffLocalFamilyProjection[],
): TemplateCompilerCompiledHandoffValue {
  const entries = [
    ...projectionEntries(request.definitions, request.sourceCompiledTemplates, null),
    ...locals.flatMap((local) => projectionEntries(local.definitions, local.sourceCompiledTemplates, local)),
  ];
  const definitionIds = new Map(entries.map((entry, index) => [entry.location.context, `definition:${index}`]));
  if (definitionIds.size !== entries.length) {
    throw new Error('Compiled handoff repeats one context across root or local definition families.');
  }
  const definitions = entries.map((entry) => projectDefinition(
    entry.location,
    entry.overlay,
    definitionIds,
    entry.sourceCompiledTemplates,
    request.store,
    request.spreadPlansByInstruction ?? new Map(),
    entry.local,
  ));
  return {
    schemaVersion: TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION,
    address: request.address,
    resourceName: request.definitions.root.baseDefinition!.name,
    source: {
      markup: request.markup,
      authoredSourceRevision: request.authoredSourceRevision,
      sourceMap: request.sourceMap,
      source: request.source,
    },
    rootDefinitionId: definitions[0]!.definitionId,
    definitions,
    spreadClosure: request.spreadClosure,
  };
}

function projectionEntries(
  definitions: TemplateCompilerCompiledDefinitionFamilyValue,
  sourceCompiledTemplates: CompiledTemplateEmission,
  local: TemplateCompilerCompiledHandoffLocalFamilyProjection | null,
): readonly DefinitionProjectionEntry[] {
  const overlays = new Map(definitions.definitions.map((definition) => [definition.context, definition]));
  return orderTemplateCompilerContextFamilyDefinitions(definitions.family).map((location) => {
    const overlay = overlays.get(location.context);
    if (overlay == null) throw new Error('Compiled handoff lost a definition overlay for an ordered context.');
    return { location, overlay, sourceCompiledTemplates, local };
  });
}

function projectDefinition(
  location: TemplateCompilerContextFamilyDefinitionLocation,
  overlay: TemplateCompilerCompiledDefinitionOverlay,
  definitionIds: ReadonlyMap<TemplateCompilerContextFamilyValueContext, string>,
  sourceCompiledTemplates: CompiledTemplateEmission,
  store: KernelStore,
  spreadPlansByInstruction: ReadonlyMap<TemplateInstruction, TemplateCompilerCompiledHandoffSpreadPlan>,
  local: TemplateCompilerCompiledHandoffLocalFamilyProjection | null,
): TemplateCompilerCompiledHandoffDefinition {
  const definitionId = requireMap(definitionIds, location.context, 'definition context');
  const values = overlay.instructions;
  return {
    definitionId,
    owner: projectOwner(location, definitionIds, local),
    sourceCompiledTemplate: projectSourceCompiledTemplate(location, sourceCompiledTemplates, store),
    header: projectHeader(overlay, store),
    tree: projectTree(location.context, store),
    rows: values.rows.map((row, rowIndex) => row.map((value, instructionIndex) =>
      projectInstruction(
        value,
        location.context.rows[rowIndex]!.instructions[instructionIndex]!,
        definitionIds,
        store,
        spreadPlansByInstruction,
      )
    )),
    surrogates: values.surrogates.map((value, instructionIndex) =>
      projectInstruction(
        value,
        location.context.surrogates[instructionIndex]!,
        definitionIds,
        store,
        spreadPlansByInstruction,
      )
    ),
  };
}

function projectSourceCompiledTemplate(
  location: TemplateCompilerContextFamilyDefinitionLocation,
  source: CompiledTemplateEmission,
  store: KernelStore,
): TemplateCompilerCompiledHandoffSourceCompiledTemplate {
  if (location.parentContext == null) {
    return requireSourceCompiledTemplate(
      source,
      source.compiledTemplate.toReference(),
      CompiledTemplateContextRole.Root,
      'root definition',
    );
  }

  const owner = location.context.owner;
  const instruction = owner.instruction;
  if (owner.ownerKind === TemplateCompilerContextFamilyValueOwnerKind.TemplateController) {
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      throw new Error('Template-controller definition lost its final hydrate-template-controller instruction.');
    }
    const matches = source.instructions.filter((candidate): candidate is HydrateTemplateControllerInstruction =>
      candidate instanceof HydrateTemplateControllerInstruction
      && sameSourceNodeReference(candidate.node, instruction.node, store)
      && sameSourceAttributeReference(candidate.attribute, instruction.attribute, store)
    );
    const match = matches[0] ?? null;
    if (matches.length !== 1 || match?.childCompiledTemplate == null) {
      throw new TemplateCompilerSourceCompiledTemplateUnavailable(
        'template-controller-source-compiled-template-unavailable',
        'Template-controller definition has no unique compiler-front-door child template.',
        [instruction.productHandle, ...matches.map((candidate) => candidate.productHandle)],
      );
    }
    return requireSourceCompiledTemplate(
      source,
      match.childCompiledTemplate,
      CompiledTemplateContextRole.TemplateController,
      'template-controller definition',
    );
  }

  if (!(instruction instanceof HydrateElementInstruction) || owner.slotName == null) {
    throw new Error('Projection definition lost its final hydrate-element instruction or slot.');
  }
  const matches = source.instructions.filter((candidate): candidate is HydrateElementInstruction =>
    candidate instanceof HydrateElementInstruction
    && sameSourceNodeReference(candidate.node, instruction.node, store)
  );
  const projections = matches.flatMap((candidate) =>
    candidate.projections.filter((projection) => projection.slotName === owner.slotName)
  );
  if (matches.length !== 1 || projections.length !== 1) {
    throw new TemplateCompilerSourceCompiledTemplateUnavailable(
      'projection-source-compiled-template-unavailable',
      'Projection definition has no unique compiler-front-door host and slot template.',
      [instruction.productHandle, owner.slotName, ...matches.map((candidate) => candidate.productHandle)],
    );
  }
  return requireSourceCompiledTemplate(
    source,
    projections[0]!.compiledTemplate,
    CompiledTemplateContextRole.Projection,
    'projection definition',
  );
}

function sameSourceNodeReference(
  left: HydrateElementInstruction['node'],
  right: HydrateElementInstruction['node'],
  store: KernelStore,
): boolean {
  return left.productHandle === right.productHandle
    || (
      left.nodeKind === right.nodeKind
      && sameSourceAddress(left.addressHandle, right.addressHandle, store)
    );
}

function sameSourceAttributeReference(
  left: HydrateTemplateControllerInstruction['attribute'],
  right: HydrateTemplateControllerInstruction['attribute'],
  store: KernelStore,
): boolean {
  return left.productHandle === right.productHandle
    || (
      left.rawName === right.rawName
      && sameSourceAddress(left.addressHandle, right.addressHandle, store)
    );
}

function sameSourceAddress(
  left: AddressHandle | null,
  right: AddressHandle | null,
  store: KernelStore,
): boolean {
  if (left == null || right == null) return false;
  if (left === right) return true;
  const leftSource = describeAddress(store, left);
  const rightSource = describeAddress(store, right);
  return leftSource != null
    && rightSource != null
    && leftSource.kind !== 'unexpanded-address'
    && rightSource.kind !== 'unexpanded-address'
    && leftSource.path === rightSource.path
    && leftSource.start === rightSource.start
    && leftSource.end === rightSource.end
    && leftSource.role === rightSource.role;
}

function requireSourceCompiledTemplate(
  source: CompiledTemplateEmission,
  reference: CompiledTemplateReference,
  role: CompiledTemplateContextRole,
  label: string,
): TemplateCompilerCompiledHandoffSourceCompiledTemplate {
  const compiledTemplate = source.readCompiledTemplate(reference.productHandle);
  if (
    compiledTemplate == null
    || compiledTemplate.identityHandle !== reference.identityHandle
    || compiledTemplate.context.role !== role
  ) {
    throw new TemplateCompilerSourceCompiledTemplateUnavailable(
      'source-compiled-template-identity-unavailable',
      `Compiled handoff ${label} lost its compiler-front-door template identity or role.`,
      [reference.productHandle, reference.identityHandle, role],
    );
  }
  return {
    productHandle: reference.productHandle,
    identityHandle: reference.identityHandle,
  };
}

function projectOwner(
  location: TemplateCompilerContextFamilyDefinitionLocation,
  definitionIds: ReadonlyMap<TemplateCompilerContextFamilyValueContext, string>,
  local: TemplateCompilerCompiledHandoffLocalFamilyProjection | null,
): TemplateCompilerCompiledHandoffDefinitionOwner {
  if (location.parentContext == null) {
    if (local == null) return { ownerKind: 'root' };
    const definition = local.definitions.root.baseDefinition;
    if (
      definition == null
      || definition.productHandle == null
      || definition.identityHandle == null
      || definition.productHandle !== local.localDefinitionProductHandle
      || definition.identityHandle !== local.localDefinitionIdentityHandle
      || local.parentDefinitions.root.baseDefinition?.productHandle !== local.parentDefinitionProductHandle
    ) {
      throw new Error('Compiled local handoff lost its generated definition identity.');
    }
    return {
      ownerKind: 'local-template',
      parentDefinitionId: requireMap(
        definitionIds,
        local.parentDefinitions.family.root,
        'local parent definition context',
      ),
      declarationOrdinal: local.declarationOrdinal,
      compilerAddedDependencyOrdinal: local.compilerAddedDependencyOrdinal,
      definitionProductHandle: local.localDefinitionProductHandle,
      definitionIdentityHandle: local.localDefinitionIdentityHandle,
    };
  }
  return {
    ownerKind: location.context.owner.ownerKind,
    parentDefinitionId: requireMap(definitionIds, location.parentContext, 'parent definition context'),
    parentRowIndex: location.parentRowIndex!,
    parentInstructionIndex: location.parentInstructionIndex!,
    slotName: location.context.owner.slotName,
  };
}

function projectHeader(
  overlay: TemplateCompilerCompiledDefinitionOverlay,
  store: KernelStore,
): TemplateCompilerCompiledHandoffDefinitionHeader {
  const base = overlay.baseDefinition;
  return {
    headerKind: overlay.headerKind,
    type: overlay.type,
    name: overlay.name.value,
    needsCompile: false,
    target: targetReference(base?.target ?? null, store),
    aliases: base?.aliases.map((alias) => alias.name) ?? [],
    key: base?.key ?? null,
    capture: base == null
      ? { kind: CustomElementCaptureKind.None, predicateTarget: null }
      : { kind: base.capture.kind, predicateTarget: targetReference(base.capture.predicateTarget, store) },
    dependencies: base?.dependencies.map(dependencyReference) ?? [],
    injectableIdentityHandle: base?.injectable ?? null,
    bindables: base?.bindables.map((bindable) => bindableValue(bindable, store)) ?? [],
    containerless: overlay.containerless,
    shadowOptions: overlay.shadowOptions == null ? null : { mode: overlay.shadowOptions.mode },
    hasSlots: overlay.hasSlots,
    enhance: overlay.enhance,
    watches: base?.watches.map((watch) => watchValue(watch, store)) ?? [],
    strict: base?.strict ?? null,
    processContent: targetReference(base?.processContent ?? null, store),
    source: sourceReference(store, base?.sourceAddressHandle ?? overlay.template.sourceAddressHandle),
    fieldProvenance: fieldProvenance(base?.fieldProvenance ?? [], store),
  };
}

function projectTree(
  context: TemplateCompilerContextFamilyValueContext,
  store: KernelStore,
): TemplateCompilerCompiledHandoffTree {
  const nodeIds = new Map(context.nodes.map((node, index) => [node.productHandle, `node:${index}`]));
  const attributeIds = new Map(context.attributes.map((attribute, index) => [attribute.productHandle, `attribute:${index}`]));
  const nodeId = (productHandle: string): string => requireMap(nodeIds, productHandle, 'tree node');
  return {
    compilerCarrierNodeId: nodeId(context.tree.compilerCarrier.productHandle),
    compilerContentNodeId: nodeId(context.tree.compilerContent.productHandle),
    nodes: context.nodes.map((node) => nodeValue(node, nodeIds, attributeIds, store)),
    attributes: context.attributes.map((attribute) => attributeValue(attribute, nodeIds, attributeIds, store)),
    source: sourceReference(store, context.tree.sourceAddressHandle),
    fieldProvenance: fieldProvenance(context.tree.fieldProvenance, store),
  };
}

function nodeValue(
  node: CompilerTransformedTemplateNode,
  nodeIds: ReadonlyMap<string, string>,
  attributeIds: ReadonlyMap<string, string>,
  store: KernelStore,
): TemplateCompilerCompiledHandoffNode {
  const common = {
    nodeId: requireMap(nodeIds, node.productHandle, 'node'),
    source: sourceReference(store, node.sourceAddressHandle),
    fieldProvenance: fieldProvenance(node.fieldProvenance, store),
  };
  if (node instanceof CompilerTransformedTemplateFragment) {
    return { ...common, nodeKind: 'fragment', children: references(node.children, nodeIds, 'child node') };
  }
  if (node instanceof CompilerTransformedTemplateElement) {
    return {
      ...common,
      nodeKind: 'element',
      tagName: node.tagName,
      namespace: node.namespace,
      namespaceUri: node.namespaceUri,
      attributeIds: references(node.attributes, attributeIds, 'attribute'),
      children: references(node.children, nodeIds, 'child node'),
      templateContentNodeId: node.templateContent == null
        ? null
        : requireMap(nodeIds, node.templateContent.productHandle, 'template content'),
    };
  }
  if (node instanceof CompilerTransformedTemplateText) {
    return { ...common, nodeKind: 'text', text: node.text, textKind: node.textKind };
  }
  if (node instanceof CompilerTransformedTemplateComment) {
    return { ...common, nodeKind: 'comment', text: node.text, semanticKind: node.semanticKind };
  }
  throw new Error('Compiled handoff encountered an unknown transformed node kind.');
}

function attributeValue(
  attribute: CompilerTransformedTemplateAttribute,
  nodeIds: ReadonlyMap<string, string>,
  attributeIds: ReadonlyMap<string, string>,
  store: KernelStore,
): TemplateCompilerCompiledHandoffAttribute {
  return {
    attributeId: requireMap(attributeIds, attribute.productHandle, 'attribute'),
    ownerNodeId: requireMap(nodeIds, attribute.owner.productHandle, 'attribute owner'),
    name: attribute.name,
    value: attribute.value,
    namespaceUri: attribute.namespaceUri,
    prefix: attribute.prefix,
    source: sourceReference(store, attribute.sourceAddressHandle),
    fieldProvenance: fieldProvenance(attribute.fieldProvenance, store),
  };
}

function projectInstruction(
  value: TemplateCompilerRuntimeInstructionValue,
  instruction: TemplateInstruction,
  definitionIds: ReadonlyMap<TemplateCompilerContextFamilyValueContext, string>,
  store: KernelStore,
  spreadPlansByInstruction: ReadonlyMap<TemplateInstruction, TemplateCompilerCompiledHandoffSpreadPlan>,
): TemplateCompilerCompiledHandoffInstruction {
  return {
    value: projectTemplateCompilerCompiledHandoffInstructionValue(
      value,
      definitionIds,
      spreadPlansByInstruction,
      instruction,
    ),
    source: sourceReference(store, instruction.sourceAddressHandle),
    fieldProvenance: fieldProvenance(instruction.fieldProvenance, store),
  };
}

export function projectTemplateCompilerCompiledHandoffInstructionValue(
  value: TemplateCompilerRuntimeInstructionValue,
  definitionIds: ReadonlyMap<TemplateCompilerContextFamilyValueContext, string>,
  spreadPlansByInstruction: ReadonlyMap<TemplateInstruction, TemplateCompilerCompiledHandoffSpreadPlan>,
  instruction: TemplateInstruction | null = null,
): TemplateCompilerCompiledHandoffInstructionValue {
  switch (value.type) {
    case TemplateCompilerFrameworkInstructionType.HydrateTemplateController:
      return {
        type: value.type,
        def: { definitionId: requireMap(definitionIds, value.def.definition, 'template-controller definition') },
        res: value.res.name,
        alias: undefined,
        props: value.props.map((prop) => projectTemplateCompilerCompiledHandoffInstructionValue(
          prop,
          definitionIds,
          spreadPlansByInstruction,
        )),
      };
    case TemplateCompilerFrameworkInstructionType.HydrateAttribute:
      return {
        type: value.type,
        res: value.res.name,
        alias: value.alias,
        props: value.props.map((prop) => projectTemplateCompilerCompiledHandoffInstructionValue(
          prop,
          definitionIds,
          spreadPlansByInstruction,
        )),
      };
    case TemplateCompilerFrameworkInstructionType.HydrateElement:
      return {
        type: value.type,
        res: value.res.name,
        props: value.props.map((prop) => projectTemplateCompilerCompiledHandoffInstructionValue(
          prop,
          definitionIds,
          spreadPlansByInstruction,
        )),
        projections: value.projections?.map((projection) => ({
          slotName: projection.slotName,
          definition: {
            definitionId: requireMap(definitionIds, projection.definition.definition, 'projection definition'),
          },
        })) ?? null,
        containerless: value.containerless,
        captures: value.captures,
        data: value.data,
        spreadPlan: instruction == null ? null : spreadPlansByInstruction.get(instruction) ?? null,
      };
    case TemplateCompilerFrameworkInstructionType.HydrateLetElement:
      return {
        type: value.type,
        instructions: value.instructions.map((nested) => projectTemplateCompilerCompiledHandoffInstructionValue(
          nested,
          definitionIds,
          spreadPlansByInstruction,
        )),
        toBindingContext: value.toBindingContext,
      };
    case TemplateCompilerFrameworkInstructionType.IteratorBinding:
    case TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding:
      return {
        type: value.type,
        forOf: value.forOf,
        to: value.to,
        props: value.props.map((prop) => projectTemplateCompilerCompiledHandoffInstructionValue(
          prop,
          definitionIds,
          spreadPlansByInstruction,
        )),
      };
    case TemplateCompilerFrameworkInstructionType.SpreadElementProp:
      return {
        type: value.type,
        instruction: projectTemplateCompilerCompiledHandoffInstructionValue(
          value.instruction,
          definitionIds,
          spreadPlansByInstruction,
        ),
      };
    default:
      return value;
  }
}

function targetReference(
  target: ResourceTargetReference | null,
  store: KernelStore,
): TemplateCompilerCompiledHandoffTargetReference | null {
  return target == null ? null : {
    identityHandle: target.identityHandle,
    moduleKey: target.moduleKey,
    localName: target.localName,
    source: sourceReference(store, target.addressHandle),
    declarationSource: sourceReference(store, target.declarationSourceAddressHandle),
  };
}

function dependencyReference(
  dependency: ResourceDependencyReference,
): TemplateCompilerCompiledHandoffDependencyReference {
  return {
    identityHandle: dependency.identityHandle,
    keyName: dependency.keyName,
    moduleKey: dependency.moduleKey,
    localName: dependency.localName,
    dependencyKind: dependency.dependencyKind,
    registryKind: dependency.registryKind,
    cssModulesInput: dependency.cssModulesInput == null ? null : {
      mappingArguments: dependency.cssModulesInput.mappingArguments.map((argument) => ({
        entries: argument.entries.map((entry) => ({
          className: entry.className,
          mappedClassName: entry.mappedClassName,
        })),
        mayHaveUnknownMappings: argument.mayHaveUnknownMappings,
        sourceModuleKey: argument.sourceModuleKey,
      })),
      mayHaveUnknownArguments: dependency.cssModulesInput.mayHaveUnknownArguments,
      mayHaveUnknownArgumentOrder: dependency.cssModulesInput.mayHaveUnknownArgumentOrder,
    },
  };
}

function bindableValue(
  bindable: BindableDefinition,
  store: KernelStore,
): TemplateCompilerCompiledHandoffBindable {
  return {
    attribute: bindable.attribute,
    callback: bindable.callback,
    mode: bindable.mode,
    name: bindable.name,
    setter: {
      kind: bindable.set.kind,
      target: targetReference(bindable.set.target, store),
      nullable: bindable.set.nullable,
    },
    source: sourceReference(store, bindable.sourceAddressHandle),
    propertyTarget: targetReference(bindable.propertyTarget, store),
    callbackTarget: targetReference(bindable.callbackTarget, store),
    fieldProvenance: fieldProvenance(bindable.fieldProvenance, store),
  };
}

function watchValue(watch: WatchDefinition, store: KernelStore): TemplateCompilerCompiledHandoffWatch {
  return {
    expression: {
      kind: watch.expression.kind,
      propertyKey: watch.expression.propertyKey == null
        ? null
        : watchPropertyKey(watch.expression.propertyKey, store),
      target: targetReference(watch.expression.target, store),
    },
    callback: {
      kind: watch.callback.kind,
      methodName: watch.callback.methodName == null
        ? null
        : watchPropertyKey(watch.callback.methodName, store),
      target: targetReference(watch.callback.target, store),
    },
    flush: watch.flush,
    fieldProvenance: fieldProvenance(watch.fieldProvenance, store),
  };
}

function watchPropertyKey(
  key: WatchPropertyKeyDefinition,
  store: KernelStore,
): TemplateCompilerCompiledHandoffWatchPropertyKey {
  return {
    kind: key.kind,
    text: key.text,
    number: key.number,
    target: targetReference(key.target, store),
  };
}

function fieldProvenance(
  entries: readonly FieldProvenance<string>[],
  store: KernelStore,
): readonly TemplateCompilerCompiledHandoffFieldProvenance[] {
  return entries.map((entry) => {
    const provenance = store.readProvenance(entry.provenanceHandle);
    return {
      field: entry.field,
      provenanceHandle: entry.provenanceHandle,
      evidence: provenance?.evidenceHandles.flatMap((handle) => {
        const evidence = store.readEvidence(handle);
        return evidence == null ? [] : [{
          evidenceKind: evidence.evidenceKind,
          roles: evidence.roles,
          summary: evidence.summary,
          source: sourceReference(store, evidence.addressHandle),
        }];
      }) ?? [],
    };
  });
}

function references(
  values: readonly { readonly productHandle: string }[],
  ids: ReadonlyMap<string, string>,
  label: string,
): readonly string[] {
  return values.map((value) => requireMap(ids, value.productHandle, label));
}

function requireMap<TKey, TValue>(map: ReadonlyMap<TKey, TValue>, key: TKey, label: string): TValue {
  const value = map.get(key);
  if (value == null) throw new Error(`Compiled handoff could not resolve ${label}.`);
  return value;
}

export function sourceReference(store: KernelStore, handle: AddressHandle | null): SemanticSourceReference | null {
  return describeAddress(store, handle);
}
