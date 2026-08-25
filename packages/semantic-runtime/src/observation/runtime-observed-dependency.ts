import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';

export const enum RuntimeObservedDependencyKind {
  TemplateExpressionRead = 'template-expression-read',
  TemplateCollectionRead = 'template-collection-read',
  ProxyPropertyRead = 'proxy-property-read',
  ProxyCollectionRead = 'proxy-collection-read',
  ObservablePropertyRead = 'observable-property-read',
  DeepPropertyRead = 'deep-property-read',
  DeepCollectionRead = 'deep-collection-read',
}

export const enum RuntimeObservedMemberSourceState {
  Source = 'source',
  TemporaryValue = 'temporary-value',
  RuntimeScopeName = 'runtime-scope-name',
  ScopeOpen = 'scope-open',
  Open = 'open',
}

/**
 * Provenance of `observedMemberSourceAddressHandle`. State says whether a source route is closed;
 * route says whose declaration the address names. Owner-value routes are navigation aids, not proof
 * of the observed member's declaration.
 */
export const enum RuntimeObservedMemberSourceRoute {
  MemberDeclaration = 'member-declaration',
  OwnerValue = 'owner-value',
}

/**
 * One observed read paired with the exact runtime-expression access that induced it.
 *
 * Owner products compose this occurrence instead of copying subsets of its facts. This keeps
 * authored access, dependency-member, declaration-route, and scope-state loci independently
 * available to binding, watcher, source-effect, and computed-observer consumers.
 */
export class RuntimeObservedDependencyOccurrence {
  constructor(
    readonly accessUseProductHandle: ProductHandle,
    readonly dependencyKind: RuntimeObservedDependencyKind,
    readonly expressionKind: string,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly memberName: string | null,
    readonly keyExpression: string | null,
    readonly methodName: string | null,
    readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    readonly observedMemberSourceAddressHandle: AddressHandle | null,
    readonly observedMemberSourceState: RuntimeObservedMemberSourceState,
    readonly observedMemberSourceRoute: RuntimeObservedMemberSourceRoute | null,
    /** Canonical source file owning the raw dependency spans, when the collector can name one. */
    readonly sourceFileAddressHandle: AddressHandle | null,
    /** Scope ancestor spent by the dependency lookup after parser lowering. */
    readonly scopeLookupAncestor: number | null,
    readonly spanStart: number | null,
    readonly spanEnd: number | null,
    /** Authored token for the value carrier; it can differ from the inducing access operation. */
    readonly memberNameSpanStart: number | null,
    readonly memberNameSpanEnd: number | null,
    /** Exact authored or generated source of the inducing access use. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
