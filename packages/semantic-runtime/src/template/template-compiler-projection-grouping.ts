import type { AddressHandle } from '../kernel/handles.js';
import { HydrateElementProjectionContributorDisposition } from './instruction-ir.js';

/** Representation-neutral direct-child snapshot at the projection grouping boundary. */
export class TemplateCompilerProjectionChildSnapshot<TNode, TAttribute> {
  constructor(
    readonly node: TNode,
    readonly slotAttribute: TAttribute | null,
    /** Exact DOM `getAttribute('au-slot')` result; null means absent and an empty string selects default. */
    readonly slotName: string | null,
    readonly slotAttributeSourceAddressHandle: AddressHandle | null,
    readonly slotNameSourceAddressHandle: AddressHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly isWhitespaceText: boolean,
    readonly isHtmlTemplate: boolean,
    /** Live attribute count after the exact selected `[au-slot]` attribute is conceptually removed. */
    readonly remainingAttributeCountAfterSlotRemoval: number,
  ) {
    if (
      (slotAttribute == null) !== (slotName == null)
      || (slotAttribute == null && (
        slotAttributeSourceAddressHandle != null
        || slotNameSourceAddressHandle != null
      ))
      || (isWhitespaceText && isHtmlTemplate)
      || !Number.isSafeInteger(remainingAttributeCountAfterSlotRemoval)
      || remainingAttributeCountAfterSlotRemoval < 0
    ) {
      throw new Error('Projection child snapshot lost slot, node-kind, or residual-attribute authority.');
    }
  }

  get hasExplicitSlot(): boolean {
    return this.slotName != null;
  }
}

/** One direct child assigned an exact projection extraction outcome. */
export class TemplateCompilerProjectionContributorPlan<TNode, TAttribute> {
  constructor(
    readonly child: TemplateCompilerProjectionChildSnapshot<TNode, TAttribute>,
    readonly slotName: string,
    readonly disposition: HydrateElementProjectionContributorDisposition,
  ) {
    if (slotName.length === 0) {
      throw new Error('Projection contributor requires one non-empty effective slot name.');
    }
  }

  get node(): TNode {
    return this.child.node;
  }

  get slotAttribute(): TAttribute | null {
    return this.child.slotAttribute;
  }

  get slotNameSourceAddressHandle(): AddressHandle | null {
    return this.child.slotNameSourceAddressHandle;
  }
}

/** One same-slot contributor group in first-slot-encounter order. */
export class TemplateCompilerProjectionGroupPlan<TNode, TAttribute> {
  readonly contributors: readonly TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[];
  readonly discardedContributors: readonly TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[];

  constructor(
    readonly slotName: string,
    readonly members: readonly TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    this.contributors = members.filter((member) =>
      member.disposition !== HydrateElementProjectionContributorDisposition.DiscardedWhitespace
    );
    this.discardedContributors = members.filter((member) =>
      member.disposition === HydrateElementProjectionContributorDisposition.DiscardedWhitespace
    );
    if (
      slotName.length === 0
      || members.length === 0
      || members.some((member) => member.slotName !== slotName)
    ) {
      throw new Error(`Projection group '${slotName}' lost member or slot-name authority.`);
    }
  }

  get createsDefinition(): boolean {
    return this.contributors.length > 0;
  }
}

/** Exact product-free grouping plus the residual child sequence left on an explicit-shadow host. */
export class TemplateCompilerProjectionGroupingPlan<TNode, TAttribute> {
  constructor(
    readonly groups: readonly TemplateCompilerProjectionGroupPlan<TNode, TAttribute>[],
    readonly extractedContributors: readonly TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[],
    readonly residualChildren: readonly TemplateCompilerProjectionChildSnapshot<TNode, TAttribute>[],
  ) {
    const grouped = groups.flatMap((group) => group.members);
    const groupedSet = new Set(grouped);
    const extractedSet = new Set(extractedContributors);
    if (
      new Set(groups.map((group) => group.slotName)).size !== groups.length
      || grouped.length !== extractedContributors.length
      || groupedSet.size !== grouped.length
      || extractedSet.size !== extractedContributors.length
      || extractedContributors.some((contributor) => !groupedSet.has(contributor))
    ) {
      throw new Error('Projection grouping plan lost group, extraction, or residual-child coverage.');
    }
  }

  get definitionGroups(): readonly TemplateCompilerProjectionGroupPlan<TNode, TAttribute>[] {
    return this.groups.filter((group) => group.createsDefinition);
  }

  get discardedContributors(): readonly TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[] {
    return this.extractedContributors.filter((contributor) =>
      contributor.disposition === HydrateElementProjectionContributorDisposition.DiscardedWhitespace
    );
  }
}

/** Representation-neutral custom-element projection input in exact post-process direct-child order. */
export class TemplateCompilerProjectionGroupingInput<TNode, TAttribute> {
  constructor(
    readonly host: TNode,
    readonly hostSourceAddressHandle: AddressHandle | null,
    /** Current RC2 extraction switch; intentionally narrower than the runtime shadow-host requirement. */
    readonly hasExplicitShadowOptions: boolean,
    readonly children: readonly TemplateCompilerProjectionChildSnapshot<TNode, TAttribute>[],
  ) {}
}

/** Group exact post-process direct children without allocating products, contexts, instructions, or mutations. */
export function groupTemplateCompilerProjectionChildren<TNode, TAttribute>(
  input: TemplateCompilerProjectionGroupingInput<TNode, TAttribute>,
): TemplateCompilerProjectionGroupingPlan<TNode, TAttribute> {
  const groups = new Map<string, {
    readonly members: TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[];
    readonly sourceAddressHandle: AddressHandle | null;
  }>();
  const extractedContributors: TemplateCompilerProjectionContributorPlan<TNode, TAttribute>[] = [];
  const residualChildren: TemplateCompilerProjectionChildSnapshot<TNode, TAttribute>[] = [];

  for (const child of input.children) {
    if (!child.hasExplicitSlot && input.hasExplicitShadowOptions) {
      residualChildren.push(child);
      continue;
    }
    const slotName = child.slotName || 'default';
    const disposition = child.isWhitespaceText
      ? HydrateElementProjectionContributorDisposition.DiscardedWhitespace
      : child.isHtmlTemplate && child.remainingAttributeCountAfterSlotRemoval === 0
        ? HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
        : HydrateElementProjectionContributorDisposition.RetainedNode;
    const contributor = new TemplateCompilerProjectionContributorPlan(child, slotName, disposition);
    extractedContributors.push(contributor);
    const existing = groups.get(slotName);
    if (existing == null) {
      groups.set(slotName, {
        members: [contributor],
        sourceAddressHandle: child.sourceAddressHandle
          ?? child.slotAttributeSourceAddressHandle
          ?? input.hostSourceAddressHandle,
      });
    } else {
      existing.members.push(contributor);
    }
  }

  return new TemplateCompilerProjectionGroupingPlan(
    [...groups.entries()].map(([slotName, group]) => new TemplateCompilerProjectionGroupPlan(
      slotName,
      group.members,
      group.sourceAddressHandle,
    )),
    extractedContributors,
    residualChildren,
  );
}
