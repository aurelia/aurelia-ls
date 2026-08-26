import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  TemplateCompilationContextKind,
  type TemplateCompilationContextReference,
} from './compilation-unit.js';
import {
  type CompiledTemplateReference,
  TemplateRenderTargetKind,
} from './compiled-template.js';
import type {
  HtmlElement,
  HtmlText,
} from './html-ir.js';
import type {
  HydrateElementInstruction,
  HydrateElementProjectionDefinition,
  HydrateTemplateControllerInstruction,
  TemplateInstruction,
} from './instruction-ir.js';
import { HydrateElementProjectionContributorDisposition } from './instruction-ir.js';

/** Semantic role of one compiler context inside a template-family target plan. */
export const enum TemplateCompilerTargetContextRole {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

export const enum TemplateCompilerTargetContextState {
  Complete = 'complete',
  Open = 'open',
}

export const enum TemplateCompilerTargetRowPosture {
  /** One exact logical target and one closed instruction row. */
  Complete = 'complete',
  /** Target existence is known while one or more row instructions remain open. */
  Open = 'open',
}

/** Product/identity that caused and owns one compiler target context. */
export class TemplateCompilerTargetContextOwner {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export const enum TemplateCompilerTargetContextStructuralAuthorityKind {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

export class TemplateCompilerRootContextStructuralAuthority {
  readonly authorityKind = TemplateCompilerTargetContextStructuralAuthorityKind.Root;
}

export class TemplateCompilerTemplateControllerContextStructuralAuthority {
  readonly authorityKind = TemplateCompilerTargetContextStructuralAuthorityKind.TemplateController;

  constructor(readonly instruction: HydrateTemplateControllerInstruction) {}
}

export class TemplateCompilerProjectionContextStructuralAuthority {
  readonly authorityKind = TemplateCompilerTargetContextStructuralAuthorityKind.Projection;

  constructor(
    readonly instruction: HydrateElementInstruction,
    readonly projection: HydrateElementProjectionDefinition,
  ) {}
}

export type TemplateCompilerTargetContextStructuralAuthority =
  | TemplateCompilerRootContextStructuralAuthority
  | TemplateCompilerTemplateControllerContextStructuralAuthority
  | TemplateCompilerProjectionContextStructuralAuthority;

/** Acyclic reference to one run-local compiler target context. */
export class TemplateCompilerTargetContextReference {
  constructor(
    readonly localKey: string,
    readonly contextKind: TemplateCompilationContextKind,
    readonly role: TemplateCompilerTargetContextRole,
    readonly owner: TemplateCompilerTargetContextOwner,
    readonly compiledTemplate: CompiledTemplateReference,
  ) {}
}

/** Ordered point after which an executable/compiler effect leaves target order conditional. */
export class TemplateCompilerTargetContextFrontier {
  constructor(
    readonly localKey: string,
    readonly projectedTargetOrdinal: number,
    readonly summary: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly openSeamHandles: readonly OpenSeamHandle[],
  ) {}
}

/** One compiler-side row projection with explicit exact/open/aggregate posture. */
export class TemplateCompilerTargetRowPlan {
  constructor(
    readonly localKey: string,
    /** Stable handle-local suffix used when publishing the durable target row. */
    readonly publicationLocalKey: string,
    readonly context: TemplateCompilerTargetContextReference,
    readonly ordinal: number,
    /** Exact only when the owning context is complete; otherwise the current compatibility projection ordinal. */
    readonly projectedTargetOrdinal: number,
    readonly projectedTargetCount: number,
    readonly posture: TemplateCompilerTargetRowPosture,
    readonly openSeamHandles: readonly OpenSeamHandle[],
    readonly targetKind: TemplateRenderTargetKind,
    /** Authored target lineage retained until transformed occurrence realization joins this row. */
    readonly node: HtmlElement | HtmlText,
    readonly instructions: readonly TemplateInstruction[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Mutable row owner for one root, template-controller, or projection compiler context. */
export class TemplateCompilerTargetContextPlan {
  private readonly rows: TemplateCompilerTargetRowPlan[] = [];
  private readonly ownedContexts: TemplateCompilerTargetContextPlan[] = [];
  private readonly frontiers: TemplateCompilerTargetContextFrontier[] = [];
  private readonly compilerReachableNodeProductHandles: ProductHandle[] = [];
  private readonly compilerReachableNodeOrdinals = new Map<ProductHandle, number>();
  private sealed = false;
  private nextTargetOrdinal = 0;
  private firstConditionalTargetOrdinal: number | null = null;

  constructor(
    readonly localKey: string,
    readonly contextKind: TemplateCompilationContextKind,
    readonly role: TemplateCompilerTargetContextRole,
    readonly owner: TemplateCompilerTargetContextOwner,
    readonly compiledTemplate: CompiledTemplateReference,
    /** Context whose row/instruction owns this generated definition; not the private JIT context-parent pointer. */
    readonly ownerContext: TemplateCompilerTargetContextReference | null,
    readonly root: TemplateCompilerTargetContextReference,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly slotName: string | null = null,
    /** Exact semantic owner retained for structural execution; no flattened contributor copy is authoritative. */
    readonly structuralAuthority: TemplateCompilerTargetContextStructuralAuthority,
  ) {}

  readRows(): readonly TemplateCompilerTargetRowPlan[] {
    return this.rows;
  }

  readOwnedContexts(): readonly TemplateCompilerTargetContextPlan[] {
    return this.ownedContexts;
  }

  readFrontiers(): readonly TemplateCompilerTargetContextFrontier[] {
    return this.frontiers;
  }

  readCompilerReachableNodeProductHandles(): readonly ProductHandle[] {
    return this.compilerReachableNodeProductHandles;
  }

  compilerReachableNodeOrdinal(productHandle: ProductHandle): number | null {
    return this.compilerReachableNodeOrdinals.get(productHandle) ?? null;
  }

  get state(): TemplateCompilerTargetContextState {
    return this.frontiers.length > 0
      || this.rows.some((row) => row.posture !== TemplateCompilerTargetRowPosture.Complete)
      ? TemplateCompilerTargetContextState.Open
      : TemplateCompilerTargetContextState.Complete;
  }

  get projectedTargetCount(): number {
    return this.nextTargetOrdinal;
  }

  /** First projected target whose physical order is conditional, or null while the complete prefix remains unbounded. */
  get exactGeometryPrefixEnd(): number | null {
    return this.firstConditionalTargetOrdinal;
  }

  toReference(): TemplateCompilerTargetContextReference {
    return new TemplateCompilerTargetContextReference(
      this.localKey,
      this.contextKind,
      this.role,
      this.owner,
      this.compiledTemplate,
    );
  }

  appendRow(
    local: string,
    node: HtmlElement | HtmlText,
    instructions: readonly TemplateInstruction[],
    targetKind: TemplateRenderTargetKind = TemplateRenderTargetKind.MarkerTarget,
    posture: TemplateCompilerTargetRowPosture = TemplateCompilerTargetRowPosture.Complete,
    projectedTargetCount = 1,
    openSeamHandles: readonly OpenSeamHandle[] = [],
    sourceAddressHandle: AddressHandle | null = node.sourceAddressHandle,
  ): TemplateCompilerTargetRowPlan | null {
    this.requireMutable();
    if (instructions.length === 0 && posture === TemplateCompilerTargetRowPosture.Complete) return null;
    if (!Number.isSafeInteger(projectedTargetCount) || projectedTargetCount < 1) {
      throw new Error(`Compiler target row '${local}' has invalid projected target count ${projectedTargetCount}.`);
    }
    const ordinal = this.rows.length;
    if (posture === TemplateCompilerTargetRowPosture.Open) {
      this.recordConditionalTargetOrdinal(this.nextTargetOrdinal);
    }
    const row = new TemplateCompilerTargetRowPlan(
      `${this.localKey}:row:${ordinal}:${local}`,
      `${ordinal}:${local}`,
      this.toReference(),
      ordinal,
      this.nextTargetOrdinal,
      projectedTargetCount,
      posture,
      openSeamHandles,
      targetKind,
      node,
      instructions,
      sourceAddressHandle,
    );
    this.rows.push(row);
    this.nextTargetOrdinal += projectedTargetCount;
    return row;
  }

  recordFrontier(
    local: string,
    summary: string,
    sourceAddressHandle: AddressHandle | null,
    openSeamHandles: readonly OpenSeamHandle[],
  ): TemplateCompilerTargetContextFrontier {
    this.requireMutable();
    if (openSeamHandles.length === 0) {
      throw new Error(`Compiler target frontier '${local}' must retain at least one open seam.`);
    }
    const frontier = new TemplateCompilerTargetContextFrontier(
      `${this.localKey}:frontier:${this.frontiers.length}:${local}`,
      this.nextTargetOrdinal,
      summary,
      sourceAddressHandle,
      openSeamHandles,
    );
    this.frontiers.push(frontier);
    this.recordConditionalTargetOrdinal(frontier.projectedTargetOrdinal);
    return frontier;
  }

  recordCompilerReachableNode(productHandle: ProductHandle): void {
    this.requireMutable();
    if (this.compilerReachableNodeOrdinals.has(productHandle)) return;
    this.compilerReachableNodeOrdinals.set(productHandle, this.compilerReachableNodeProductHandles.length);
    this.compilerReachableNodeProductHandles.push(productHandle);
  }

  admitOwnedContext(child: TemplateCompilerTargetContextPlan): void {
    this.requireMutable();
    if (child.ownerContext?.localKey !== this.localKey) {
      throw new Error(`Compiler target context '${child.localKey}' does not name its admitting owner context.`);
    }
    this.ownedContexts.push(child);
  }

  seal(): void {
    this.sealed = true;
  }

  private requireMutable(): void {
    if (this.sealed) throw new Error(`Compiler target context '${this.localKey}' is sealed.`);
  }

  private recordConditionalTargetOrdinal(projectedTargetOrdinal: number): void {
    this.firstConditionalTargetOrdinal = this.firstConditionalTargetOrdinal == null
      ? projectedTargetOrdinal
      : Math.min(this.firstConditionalTargetOrdinal, projectedTargetOrdinal);
  }
}

/** Current run-local target-row topology for one compilation unit; compiler seams still determine closure. */
export class TemplateCompilerTargetPlan {
  readonly root: TemplateCompilerTargetContextPlan;
  private readonly contexts: TemplateCompilerTargetContextPlan[];
  private readonly contextsByLocalKey = new Map<string, TemplateCompilerTargetContextPlan>();
  private sealed = false;

  constructor(
    readonly localKey: string,
    rootContext: TemplateCompilationContextReference,
    rootCompiledTemplate: CompiledTemplateReference,
  ) {
    const rootOwner = new TemplateCompilerTargetContextOwner(
      rootContext.productHandle,
      rootContext.identityHandle,
    );
    const rootLocalKey = `${localKey}:context:root`;
    const rootReference = new TemplateCompilerTargetContextReference(
      rootLocalKey,
      TemplateCompilationContextKind.Root,
      TemplateCompilerTargetContextRole.Root,
      rootOwner,
      rootCompiledTemplate,
    );
    this.root = new TemplateCompilerTargetContextPlan(
      rootLocalKey,
      TemplateCompilationContextKind.Root,
      TemplateCompilerTargetContextRole.Root,
      rootOwner,
      rootCompiledTemplate,
      null,
      rootReference,
      rootContext.sourceAddressHandle,
      null,
      new TemplateCompilerRootContextStructuralAuthority(),
    );
    this.contexts = [this.root];
    this.contextsByLocalKey.set(this.root.localKey, this.root);
  }

  readContexts(): readonly TemplateCompilerTargetContextPlan[] {
    return this.contexts;
  }

  contextForLocalKey(localKey: string): TemplateCompilerTargetContextPlan | null {
    return this.contextsByLocalKey.get(localKey) ?? null;
  }

  get isSealed(): boolean {
    return this.sealed;
  }

  createTemplateControllerContext(
    ownerContext: TemplateCompilerTargetContextPlan,
    instruction: HydrateTemplateControllerInstruction,
  ): TemplateCompilerTargetContextPlan {
    if (instruction.childCompiledTemplate == null) {
      throw new Error(`Template-controller instruction '${instruction.productHandle}' has no child compiled-template allocation.`);
    }
    return this.createChild(
      ownerContext,
      `${ownerContext.localKey}:template-controller:${instruction.productHandle}`,
      TemplateCompilerTargetContextRole.TemplateController,
      new TemplateCompilerTargetContextOwner(
        instruction.productHandle,
        instruction.identityHandle,
      ),
      instruction.childCompiledTemplate,
      instruction.sourceAddressHandle,
      null,
      new TemplateCompilerTemplateControllerContextStructuralAuthority(instruction),
    );
  }

  createProjectionContext(
    ownerContext: TemplateCompilerTargetContextPlan,
    instruction: HydrateElementInstruction,
    projection: HydrateElementProjectionDefinition,
  ): TemplateCompilerTargetContextPlan {
    return this.createChild(
      ownerContext,
      `${ownerContext.localKey}:projection:${instruction.productHandle}:${projection.compiledTemplate.productHandle}`,
      TemplateCompilerTargetContextRole.Projection,
      new TemplateCompilerTargetContextOwner(
        instruction.productHandle,
        instruction.identityHandle,
      ),
      projection.compiledTemplate,
      projection.sourceAddressHandle ?? instruction.sourceAddressHandle,
      projection.slotName,
      new TemplateCompilerProjectionContextStructuralAuthority(instruction, projection),
    );
  }

  seal(): void {
    this.assertCoherent();
    for (const context of this.contexts) context.seal();
    this.sealed = true;
  }

  assertCoherent(): void {
    if (this.root.ownerContext !== null || this.root.root.localKey !== this.root.localKey) {
      throw new Error('Root compiler target context must own itself without an owner-context link.');
    }
    if (this.contextsByLocalKey.size !== this.contexts.length) {
      throw new Error('Compiler target plan contains duplicate context keys.');
    }
    const visited = new Set<TemplateCompilerTargetContextPlan>();
    const compiledTemplateProducts = new Set<ProductHandle>();
    const reachableNodeOwners = new Map<ProductHandle, string>();
    const visit = (context: TemplateCompilerTargetContextPlan): void => {
      if (visited.has(context)) {
        throw new Error(`Compiler target context '${context.localKey}' is owned more than once.`);
      }
      visited.add(context);
      if (compiledTemplateProducts.has(context.compiledTemplate.productHandle)) {
        throw new Error(`Compiler target context '${context.localKey}' reuses a compiled-template product.`);
      }
      compiledTemplateProducts.add(context.compiledTemplate.productHandle);
      for (const productHandle of context.readCompilerReachableNodeProductHandles()) {
        const priorOwner = reachableNodeOwners.get(productHandle);
        if (priorOwner != null) {
          throw new Error(
            `Compiler-reachable node '${productHandle}' belongs to both '${priorOwner}' and '${context.localKey}'.`,
          );
        }
        reachableNodeOwners.set(productHandle, context.localKey);
      }
      if (
        context.readCompilerReachableNodeProductHandles().some((productHandle, ordinal) =>
          context.compilerReachableNodeOrdinal(productHandle) !== ordinal
        )
      ) {
        throw new Error(`Compiler target context '${context.localKey}' has incoherent reachable-node ordinals.`);
      }
      if (!contextStructuralAuthorityIsCoherent(context)) {
        throw new Error(`Compiler target context '${context.localKey}' has incoherent structural authority.`);
      }
      if (context.ownerContext != null) {
        const ownerContext = this.contextsByLocalKey.get(context.ownerContext.localKey) ?? null;
        const authorityInstruction = context.structuralAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
          ? context.structuralAuthority.instruction
          : context.structuralAuthority instanceof TemplateCompilerProjectionContextStructuralAuthority
            ? context.structuralAuthority.instruction
            : null;
        const ownerOccurrences = ownerContext?.readRows().reduce((count, row) =>
          count + row.instructions.filter((instruction) => instruction === authorityInstruction).length,
        0) ?? 0;
        if (authorityInstruction == null || ownerOccurrences !== 1) {
          throw new Error(`Compiler target context '${context.localKey}' has no unique owner-row instruction edge.`);
        }
      }
      let expectedTargetOrdinal = 0;
      context.readRows().forEach((row, ordinal) => {
        const postureCoherent = rowPostureIsCoherent(row);
        if (
          row.context.localKey !== context.localKey
          || row.ordinal !== ordinal
          || row.projectedTargetOrdinal !== expectedTargetOrdinal
          || row.projectedTargetCount < 1
          || !postureCoherent
        ) {
          throw new Error(`Compiler target row '${row.localKey}' has incoherent context ownership.`);
        }
        expectedTargetOrdinal += row.projectedTargetCount;
      });
      if (context.projectedTargetCount !== expectedTargetOrdinal) {
        throw new Error(`Compiler target context '${context.localKey}' has incoherent projected target cardinality.`);
      }
      for (const frontier of context.readFrontiers()) {
        if (
          frontier.projectedTargetOrdinal < 0
          || frontier.projectedTargetOrdinal > context.projectedTargetCount
          || frontier.openSeamHandles.length === 0
        ) {
          throw new Error(`Compiler target frontier '${frontier.localKey}' is incoherent.`);
        }
      }
      let expectedPrefixEnd: number | null = null;
      for (const row of context.readRows()) {
        if (row.posture !== TemplateCompilerTargetRowPosture.Open) continue;
        expectedPrefixEnd = expectedPrefixEnd == null
          ? row.projectedTargetOrdinal
          : Math.min(expectedPrefixEnd, row.projectedTargetOrdinal);
      }
      for (const frontier of context.readFrontiers()) {
        expectedPrefixEnd = expectedPrefixEnd == null
          ? frontier.projectedTargetOrdinal
          : Math.min(expectedPrefixEnd, frontier.projectedTargetOrdinal);
      }
      if (context.exactGeometryPrefixEnd !== expectedPrefixEnd) {
        throw new Error(`Compiler target context '${context.localKey}' has incoherent exact-geometry prefix state.`);
      }
      for (const child of context.readOwnedContexts()) {
        if (
          child.ownerContext?.localKey !== context.localKey
          || child.ownerContext.compiledTemplate.productHandle !== context.compiledTemplate.productHandle
          || child.root.localKey !== this.root.localKey
          || this.contextsByLocalKey.get(child.localKey) !== child
        ) {
          throw new Error(`Compiler target context '${child.localKey}' has incoherent ownership.`);
        }
        visit(child);
      }
    };
    visit(this.root);
    if (visited.size !== this.contexts.length) {
      throw new Error('Compiler target plan contains an unowned context.');
    }
  }

  private createChild(
    ownerContext: TemplateCompilerTargetContextPlan,
    localKey: string,
    role: TemplateCompilerTargetContextRole,
    owner: TemplateCompilerTargetContextOwner,
    compiledTemplate: CompiledTemplateReference,
    sourceAddressHandle: AddressHandle | null,
    slotName: string | null,
    structuralAuthority: TemplateCompilerTargetContextStructuralAuthority,
  ): TemplateCompilerTargetContextPlan {
    if (this.sealed) throw new Error(`Compiler target plan '${this.localKey}' is sealed.`);
    if (!this.contexts.includes(ownerContext)) {
      throw new Error(`Compiler target context '${ownerContext.localKey}' belongs to another plan.`);
    }
    if (this.contextsByLocalKey.has(localKey)) {
      throw new Error(`Compiler target context key '${localKey}' is not unique.`);
    }
    const child = new TemplateCompilerTargetContextPlan(
      localKey,
      TemplateCompilationContextKind.SyntheticView,
      role,
      owner,
      compiledTemplate,
      ownerContext.toReference(),
      this.root.toReference(),
      sourceAddressHandle,
      slotName,
      structuralAuthority,
    );
    ownerContext.admitOwnedContext(child);
    this.contexts.push(child);
    this.contextsByLocalKey.set(localKey, child);
    return child;
  }
}

function rowPostureIsCoherent(row: TemplateCompilerTargetRowPlan): boolean {
  switch (row.posture) {
    case TemplateCompilerTargetRowPosture.Complete:
      return row.projectedTargetCount === 1
        && row.instructions.length > 0
        && row.openSeamHandles.length === 0;
    case TemplateCompilerTargetRowPosture.Open:
      return row.projectedTargetCount >= 1 && row.openSeamHandles.length > 0;
  }
}

function contextStructuralAuthorityIsCoherent(context: TemplateCompilerTargetContextPlan): boolean {
  const authority = context.structuralAuthority;
  switch (context.role) {
    case TemplateCompilerTargetContextRole.Root:
      return authority instanceof TemplateCompilerRootContextStructuralAuthority
        && context.ownerContext === null
        && context.slotName === null;
    case TemplateCompilerTargetContextRole.TemplateController:
      return authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
        && authority.instruction.productHandle === context.owner.productHandle
        && authority.instruction.identityHandle === context.owner.identityHandle
        && authority.instruction.node.productHandle != null
        && authority.instruction.childCompiledTemplate?.productHandle === context.compiledTemplate.productHandle
        && context.slotName === null;
    case TemplateCompilerTargetContextRole.Projection:
      return authority instanceof TemplateCompilerProjectionContextStructuralAuthority
        && authority.instruction.productHandle === context.owner.productHandle
        && authority.instruction.identityHandle === context.owner.identityHandle
        && authority.instruction.node.productHandle != null
        && authority.projection.compiledTemplate.productHandle === context.compiledTemplate.productHandle
        && authority.projection.slotName === context.slotName
        && authority.instruction.projections.includes(authority.projection)
        && authority.projection.contributors.length > 0
        && authority.projection.contributors.every((contributor) =>
          contributor.node.productHandle != null
          && contributor.slotName === authority.projection.slotName
          && contributor.disposition !== HydrateElementProjectionContributorDisposition.DiscardedWhitespace
        );
  }
}
