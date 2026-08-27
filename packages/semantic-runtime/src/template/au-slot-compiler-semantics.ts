import type { BuiltInResource } from '../resources/built-in-resources.js';
import { RuntimeHtmlAuSlotResource } from '../resources/built-in-resources.js';
import { AuSlotStaticAttributeName } from './au-slot-source.js';

/** Runtime projection-carrier attribute inspected by `AuSlot.processContent`. */
export const AU_SLOT_PROJECTION_ATTRIBUTE_NAME = 'au-slot' as const;

/** Framework fallback used only when the outlet has no static `name` attribute. */
export const AU_SLOT_DEFAULT_NAME = 'default' as const;

/** Representation-neutral attribute snapshot at the exact process-content boundary. */
export class AuSlotCompilerAttributeSnapshot<TAttribute> {
  constructor(
    readonly attribute: TAttribute,
    readonly qualifiedName: string,
    readonly value: string,
    readonly namespaceUri: string | null,
  ) {}
}

/** One ordered direct child; null attributes distinguish non-elements from elements with no attributes. */
export class AuSlotCompilerChildSnapshot<TNode, TAttribute> {
  constructor(
    readonly node: TNode,
    readonly elementAttributes: readonly AuSlotCompilerAttributeSnapshot<TAttribute>[] | null,
  ) {}
}

/** Exact element view consumed by the framework-owned AuSlot process-content semantics. */
export class AuSlotCompilerProcessContentInput<TNode, TAttribute> {
  constructor(
    readonly hostAttributes: readonly AuSlotCompilerAttributeSnapshot<TAttribute>[],
    readonly directChildren: readonly AuSlotCompilerChildSnapshot<TNode, TAttribute>[],
  ) {}
}

/** Known result of AuSlot's process-content hook before ordinary compiler attribute traversal. */
export class AuSlotCompilerProcessContentPlan<TNode, TAttribute> {
  constructor(
    readonly builtInResource: RuntimeHtmlAuSlotResource,
    readonly name: string,
    readonly nameAttribute: AuSlotCompilerAttributeSnapshot<TAttribute> | null,
    readonly removedChildren: readonly TNode[],
  ) {}
}

/** Recognize the canonical framework catalog header, not a user resource with matching names. */
export function isRuntimeHtmlAuSlotBuiltInResource(
  resource: BuiltInResource | null,
): resource is RuntimeHtmlAuSlotResource {
  return resource instanceof RuntimeHtmlAuSlotResource;
}

/**
 * Plan the byte-for-byte built-in hook result over an authored or live occurrence snapshot.
 *
 * The caller owns representation access. This owner alone selects the static outlet name and the ordered direct
 * element children removed for carrying `[au-slot]` inside an `<au-slot>` fallback.
 */
export function planAuSlotCompilerProcessContent<TNode, TAttribute>(
  resource: BuiltInResource | null,
  input: AuSlotCompilerProcessContentInput<TNode, TAttribute>,
): AuSlotCompilerProcessContentPlan<TNode, TAttribute> | null {
  if (!isRuntimeHtmlAuSlotBuiltInResource(resource)) return null;
  const nameAttribute = input.hostAttributes.find((attribute) =>
    isUnqualifiedAttribute(attribute, AuSlotStaticAttributeName.Name)
  ) ?? null;
  const removedChildren = input.directChildren.flatMap((child) =>
    child.elementAttributes?.some((attribute) =>
      isUnqualifiedAttribute(attribute, AU_SLOT_PROJECTION_ATTRIBUTE_NAME)
    )
      ? [child.node]
      : []
  );
  return new AuSlotCompilerProcessContentPlan(
    resource,
    nameAttribute?.value ?? AU_SLOT_DEFAULT_NAME,
    nameAttribute,
    removedChildren,
  );
}

function isUnqualifiedAttribute<TAttribute>(
  attribute: AuSlotCompilerAttributeSnapshot<TAttribute>,
  name: string,
): boolean {
  return attribute.qualifiedName === name;
}
