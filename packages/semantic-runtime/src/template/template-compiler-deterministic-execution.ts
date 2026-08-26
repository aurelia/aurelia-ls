import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import { AttributeClassificationKind } from './attribute-syntax.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import {
  TemplateCompilerProjectionContextStructuralAuthority,
  TemplateCompilerTargetRowPosture,
  TemplateCompilerTemplateControllerContextStructuralAuthority,
  type TemplateCompilerTargetContextPlan,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import {
  CompiledTemplateState,
  TemplateRenderTargetKind,
} from './compiled-template.js';
import {
  HtmlText,
  htmlElementAttributeOwnersByAttributeProduct,
  type HtmlElementAttributeOwner,
} from './html-ir.js';
import {
  HydrateElementInstruction,
  HydrateElementProjectionContributorDisposition,
  HydrateTemplateControllerInstruction,
  SpreadTransferedBindingInstruction,
  TextBindingInstruction,
  type HydrateElementProjectionDefinition,
} from './instruction-ir.js';
import { runtimeAttributeName, runtimeElementResourceName } from './runtime-dom-name.js';
import { isTemplateSpecialAttributeName } from './special-attribute-source.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import { TemplateCompilerStructuralExecutionSession } from './template-compiler-structural-execution.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import {
  templateCompilerHookExecutionAdmission,
  TemplateCompilerHookExecutionAdmissionKind,
} from './compiler-hook-world.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import { TemplateValueSiteKind } from './value-site.js';

export const enum TemplateCompilerDeterministicExecutionState {
  /** Every supported structural operation over already-normalized compiler products was realized exactly. */
  Exact = 'exact',
  /** A known authority boundary prevents exact structural execution without guessing. */
  Open = 'open',
  /** Normalized compiler products contain a reached framework refusal. */
  Refused = 'refused',
  /** Hook provider resolution or member invocation is proven to complete abruptly before structural replay. */
  Abrupt = 'abrupt',
}

export const enum TemplateCompilerDeterministicExecutionReasonKind {
  BrowserCorrespondenceOpen = 'browser-correspondence-open',
  BrowserContextMembershipOpen = 'browser-context-membership-open',
  BrowserTargetOrderOpen = 'browser-target-order-open',
  CompilerEffectOpen = 'compiler-effect-open',
  CompilerHookMembershipOpen = 'compiler-hook-membership-open',
  CompilerHookProviderOpen = 'compiler-hook-provider-open',
  CompilerHookProviderAbrupt = 'compiler-hook-provider-abrupt',
  CompilerHookCallableOpen = 'compiler-hook-callable-open',
  CompilerHookCallableAbrupt = 'compiler-hook-callable-abrupt',
  CompilerRefused = 'compiler-refused',
  DebugProfileOpen = 'debug-profile-open',
  ForeignCompilation = 'foreign-compilation',
  LocalTemplateOpen = 'local-template-open',
  NonSingularOrigin = 'non-singular-origin',
  SurrogateExecutionOpen = 'surrogate-execution-open',
  UnsupportedCarrierAttribute = 'unsupported-carrier-attribute',
  UnsupportedContext = 'unsupported-context',
  UnsupportedRow = 'unsupported-row',
}

export class TemplateCompilerDeterministicExecutionReason {
  constructor(
    readonly reasonKind: TemplateCompilerDeterministicExecutionReasonKind,
    readonly summary: string,
    readonly productHandles: readonly ProductHandle[] = [],
  ) {}
}

export interface TemplateCompilerDeterministicExecutionRequest {
  readonly browserTemplate: BrowserEffectiveTemplateEmission;
  /** One indivisible normalized compiler front door; its phase emissions must never be mixed across compilations. */
  readonly compilation: TemplateResourceCompilationEmission;
}

/**
 * Product-free outcome of deterministic structural execution over already-normalized semantic compiler products.
 *
 * `Exact` certifies only the supported built-in structural corridor: browser-input dispositions, context transfers,
 * text expansion, and target geometry. It does not independently replay instruction lowering, compiler extensions,
 * hooks/effects, local family construction, surrogate compilation, or every JIT stage that produced the normalized
 * input products. In particular, Exact is not proof that the source compiler world contained no unmodeled hook/effect.
 */
export class TemplateCompilerDeterministicExecutionResult {
  constructor(
    readonly state: TemplateCompilerDeterministicExecutionState,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly structuralExecution: TemplateCompilerStructuralExecutionSession | null,
    readonly reasons: readonly TemplateCompilerDeterministicExecutionReason[],
  ) {}
}

class AttributeConsumptionPlan {
  readonly causeHandles: ClaimEndpointHandle[] = [];

  constructor(
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly owner: TemplateCompilerElementOccurrence,
    readonly authoredProductHandle: ProductHandle,
  ) {}

  addCause(cause: ClaimEndpointHandle): void {
    if (!this.causeHandles.includes(cause)) this.causeHandles.push(cause);
  }
}

class TemplateControllerChain {
  constructor(
    readonly source: TemplateCompilerElementOccurrence,
    readonly contexts: readonly TemplateCompilerTargetContextPlan[],
    readonly rows: readonly TemplateCompilerTargetRowPlan[],
  ) {}
}

class DeterministicExecutionFrame {
  private readonly nodesByAuthoredProduct = new Map<ProductHandle, TemplateCompilerNodeOccurrence[]>();
  private readonly attributesByAuthoredProduct = new Map<ProductHandle, TemplateCompilerAttributeOccurrence[]>();
  private readonly attributeOwnersByProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
  private readonly contextsByReachableNode = new Map<ProductHandle, TemplateCompilerTargetContextPlan[]>();
  private readonly textParsesByNode = new Map<ProductHandle, TemplateValueSiteEmission['parses'][number]>();
  private readonly projectionSlotAttributes = new Set<ProductHandle>();
  private readonly attributePlansByOwner = new Map<ProductHandle, AttributeConsumptionPlan[]>();
  private readonly attributePlansByProduct = new Map<ProductHandle, AttributeConsumptionPlan>();
  private readonly consumedAttributeProducts = new Set<ProductHandle>();
  private readonly executedContexts = new Set<TemplateCompilerTargetContextPlan>();
  private readonly expandedTextNodes = new Set<ProductHandle>();

  readonly forest: TemplateCompilerOccurrenceForest;

  constructor(readonly input: TemplateCompilerDeterministicExecutionRequest) {
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.browserTemplate);
    this.attributeOwnersByProduct = htmlElementAttributeOwnersByAttributeProduct(
      input.compilation.html.nodes,
      input.compilation.html.attributes,
    );
    for (const node of this.forest.readNodes()) {
      const authored = this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
      if (authored != null) appendMap(this.nodesByAuthoredProduct, authored, node);
    }
    for (const attribute of this.forest.readAttributes()) {
      const authored = this.forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle ?? null;
      if (authored != null) appendMap(this.attributesByAuthoredProduct, authored, attribute);
    }
    for (const context of input.compilation.compiledTemplate.targetPlan.readContexts()) {
      for (const productHandle of context.readCompilerReachableNodeProductHandles()) {
        appendMap(this.contextsByReachableNode, productHandle, context);
      }
    }
    const parsesBySite = new Map(input.compilation.valueSites.parses.map((parse) => [parse.site.productHandle, parse]));
    for (const site of input.compilation.valueSites.sites) {
      if (site.siteKind !== TemplateValueSiteKind.TextInterpolation || site.node.productHandle == null) continue;
      const parse = parsesBySite.get(site.productHandle) ?? null;
      if (parse != null) this.textParsesByNode.set(site.node.productHandle, parse);
    }
    this.indexProjectionSlotAttributes();
  }

  preflight(): readonly TemplateCompilerDeterministicExecutionReason[] {
    const reasons: TemplateCompilerDeterministicExecutionReason[] = [];
    const compiled = this.input.compilation.compiledTemplate;
    const browserSource = this.input.browserTemplate.tree.templateSource;
    const compilationSource = this.input.compilation.unit.templateSource;
    if (
      compiled.compiledTemplate.htmlDocumentProductHandle !== this.input.compilation.html.document.productHandle
      || browserSource.productHandle !== compilationSource.productHandle
      || browserSource.identityHandle !== compilationSource.identityHandle
      || browserSource.templateAddressHandle !== compilationSource.templateAddressHandle
      || browserSource.sourceAddressHandle !== compilationSource.sourceAddressHandle
    ) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.ForeignCompilation,
        'Browser structure, authored HTML, and compiled-template products do not belong to one compilation.',
      ));
    }
    if (this.input.compilation.compilerWorld.templateCompiler.debug) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.DebugProfileOpen,
        'The exact subset currently owns the default compiler mutation profile only; debug attribute retention stays open.',
      ));
    }
    const compilerHookReasons = this.preflightCompilerHooks();
    reasons.push(...compilerHookReasons);
    if (compilerHookReasons.length > 0) {
      return uniqueReasons(reasons);
    }
    if (this.input.browserTemplate.openSeams.length > 0) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.BrowserCorrespondenceOpen,
        `Browser-effective structure contains unresolved authored/browser correspondence: ${this.input.browserTemplate.openSeams
          .map((seam) => seam.summary)
          .join(' | ')}`,
      ));
    } else {
      reasons.push(...this.preflightBrowserContextAuthority());
    }
    if (compiled.issues.length > 0 || compiled.compiledTemplate.state === CompiledTemplateState.Invalid) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.CompilerRefused,
        'The normalized compiler handoff contains a reached compiler refusal.',
        compiled.issues.map((issue) => issue.productHandle),
      ));
    }
    if (
      compiled.openSeams.length > 0
      || compiled.compiledTemplate.state === CompiledTemplateState.Open
      || compiled.compiledTemplate.state === CompiledTemplateState.Partial
    ) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.CompilerEffectOpen,
        'The normalized compiler handoff retains executable or structural open seams.',
      ));
    }
    if ((compiled.compiledTemplate.surrogateSequence?.instructions.length ?? 0) > 0) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.SurrogateExecutionOpen,
        'The normalized definition contains surrogate instructions, but this structural driver does not replay the surrogate stage.',
        compiled.compiledTemplate.surrogateSequence!.instructions.flatMap((instruction) =>
          instruction.productHandle == null ? [] : [instruction.productHandle]
        ),
      ));
    }
    if (this.input.compilation.attributeClassification.classifications.some((classification) =>
      classification.classificationKind === AttributeClassificationKind.Open
    )) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.CompilerEffectOpen,
        'At least one attribute classification remains open.',
      ));
    }
    if (this.hasLocalTemplateSyntax()) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.LocalTemplateOpen,
        'Local-template family extraction is outside this single-plan execution subset.',
      ));
    }
    for (const context of compiled.targetPlan.readContexts()) {
      if (
        context.readFrontiers().length > 0
        || context.readRows().some((row) =>
          row.posture !== TemplateCompilerTargetRowPosture.Complete
          || row.openSeamHandles.length > 0
          || row.projectedTargetCount !== 1
          || row.targetKind === TemplateRenderTargetKind.Open
          || row.targetKind === TemplateRenderTargetKind.Surrogate
        )
      ) {
        reasons.push(reason(
          TemplateCompilerDeterministicExecutionReasonKind.UnsupportedRow,
          `Compiler target context '${context.localKey}' is not an exact single-target context.`,
        ));
      }
    }
    reasons.push(...this.preflightRows());
    reasons.push(...this.prepareAttributePlans());
    return uniqueReasons(reasons);
  }

  private preflightCompilerHooks(): readonly TemplateCompilerDeterministicExecutionReason[] {
    const hooks = this.input.compilation.compilerWorld.compilerHooks;
    const admission = templateCompilerHookExecutionAdmission(hooks);
    switch (admission.admissionKind) {
      case TemplateCompilerHookExecutionAdmissionKind.ExactNoEffect:
        return [];
      case TemplateCompilerHookExecutionAdmissionKind.MembershipOpen:
        return [reason(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookMembershipOpen,
          'TemplateCompilerHooks membership is open before compiler structural traversal.',
          [hooks.productHandle],
        )];
      case TemplateCompilerHookExecutionAdmissionKind.ProviderAbrupt:
        return [reason(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookProviderAbrupt,
          'TemplateCompilerHooks provider-array resolution is proven to complete abruptly before any hook invocation.',
          [hooks.productHandle],
        )];
      case TemplateCompilerHookExecutionAdmissionKind.ProviderOpen:
        return [reason(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookProviderOpen,
          'TemplateCompilerHooks provider-array resolution remains open before any hook invocation.',
          [hooks.productHandle],
        )];
      case TemplateCompilerHookExecutionAdmissionKind.CallableAbrupt:
        return [reason(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookCallableAbrupt,
          'The first reached TemplateCompilerHooks callable boundary is proven to complete abruptly.',
          [hooks.productHandle],
        )];
      case TemplateCompilerHookExecutionAdmissionKind.CallableOpen:
        return [reason(
          TemplateCompilerDeterministicExecutionReasonKind.CompilerHookCallableOpen,
          'The first reached TemplateCompilerHooks callable boundary has not been executed by structural replay.',
          [hooks.productHandle],
        )];
    }
  }

  execute(): TemplateCompilerDeterministicExecutionResult {
    const reasons = this.preflight();
    if (reasons.length > 0) {
      return new TemplateCompilerDeterministicExecutionResult(
        reasons.some(isAbruptExecutionReason)
          ? TemplateCompilerDeterministicExecutionState.Abrupt
          : reasons.some((candidate) =>
              candidate.reasonKind === TemplateCompilerDeterministicExecutionReasonKind.CompilerRefused
            )
            ? TemplateCompilerDeterministicExecutionState.Refused
            : TemplateCompilerDeterministicExecutionState.Open,
        this.forest,
        null,
        reasons,
      );
    }

    const session = TemplateCompilerStructuralExecutionSession.create(
      this.forest,
      this.input.compilation.compiledTemplate.targetPlan,
    );
    this.executeContext(this.input.compilation.compiledTemplate.targetPlan.root, session);
    session.assertCoherent();
    return new TemplateCompilerDeterministicExecutionResult(
      TemplateCompilerDeterministicExecutionState.Exact,
      this.forest,
      session,
      [],
    );
  }

  private preflightRows(): readonly TemplateCompilerDeterministicExecutionReason[] {
    const reasons: TemplateCompilerDeterministicExecutionReason[] = [];
    for (const context of this.input.compilation.compiledTemplate.targetPlan.readContexts()) {
      const textRowsByNode = rowsByTextNode(context);
      for (const row of context.readRows()) {
        if (this.exactNode(row.node.productHandle) == null) {
          reasons.push(reason(
            TemplateCompilerDeterministicExecutionReasonKind.NonSingularOrigin,
            `Compiler row '${row.localKey}' has no singular browser occurrence.`,
            [row.node.productHandle],
          ));
        }
        const controller = singleTemplateControllerInstruction(row);
        if (controller != null && this.ownedTemplateControllerContext(context, controller) == null) {
          reasons.push(reason(
            TemplateCompilerDeterministicExecutionReasonKind.UnsupportedContext,
            `Template-controller row '${row.localKey}' has no exact child context.`,
            [controller.productHandle],
          ));
        }
        for (const instruction of row.instructions) {
          if (!(instruction instanceof HydrateElementInstruction)) continue;
          reasons.push(...this.preflightHydrateElement(context, instruction));
        }
      }
      for (const [nodeProductHandle, rows] of textRowsByNode) {
        const parse = this.textParsesByNode.get(nodeProductHandle) ?? null;
        if (
          parse?.resultKind !== ExpressionParseResultKind.InterpolationSuccess
          || parse.result.kind !== ExpressionParseResultKind.InterpolationSuccess
          || parse.result.ast.parts.length !== rows.length + 1
          || parse.result.ast.expressions.length !== rows.length
          || rows.some((row, index) => {
            const instruction = row.instructions.length === 1 ? row.instructions[0] : null;
            return !(instruction instanceof TextBindingInstruction)
              || instruction.expressionChainIndex !== index
              || row.targetKind !== TemplateRenderTargetKind.MarkerTarget;
          })
        ) {
          reasons.push(reason(
            TemplateCompilerDeterministicExecutionReasonKind.UnsupportedRow,
            `Text target '${nodeProductHandle}' has no exact closed interpolation expansion.`,
            [nodeProductHandle],
          ));
        }
      }
    }
    return reasons;
  }

  private preflightBrowserContextAuthority(): readonly TemplateCompilerDeterministicExecutionReason[] {
    const projection = this.projectBrowserContextMembership();
    const reasons: TemplateCompilerDeterministicExecutionReason[] = [];
    const membershipHandles = new Set<ProductHandle>(projection.excess);
    const membershipSummaries: string[] = [];
    if (projection.excess.length > 0) {
      membershipSummaries.push(
        'Selected browser-effective compiler content contains compiler-traversable authored members absent from the normalized target plan.',
      );
    }
    for (const context of this.input.compilation.compiledTemplate.targetPlan.readContexts()) {
      const expected = context.readCompilerReachableNodeProductHandles();
      const actual = projection.byContext.get(context) ?? [];
      const expectedSet = new Set(expected);
      const actualSet = new Set(actual);
      if (
        actual.length !== expected.length
        || expected.some((productHandle) => !actualSet.has(productHandle))
        || actual.some((productHandle) => !expectedSet.has(productHandle))
      ) {
        expected.forEach((productHandle) => membershipHandles.add(productHandle));
        actual.forEach((productHandle) => membershipHandles.add(productHandle));
        membershipSummaries.push(
          `Compiler target context '${context.localKey}' claims different authored membership from the selected browser-effective compiler input.`,
        );
        continue;
      }
      if (expected.some((productHandle, index) => actual[index] !== productHandle)) {
        reasons.push(reason(
          TemplateCompilerDeterministicExecutionReasonKind.BrowserTargetOrderOpen,
          `Compiler target context '${context.localKey}' row/membership order differs from browser-effective preorder.`,
          expected,
        ));
      }
    }
    if (membershipSummaries.length > 0) {
      reasons.unshift(reason(
        TemplateCompilerDeterministicExecutionReasonKind.BrowserContextMembershipOpen,
        membershipSummaries.join(' '),
        [...membershipHandles],
      ));
    }
    return reasons;
  }

  private projectBrowserContextMembership(): {
    readonly byContext: ReadonlyMap<TemplateCompilerTargetContextPlan, readonly ProductHandle[]>;
    readonly excess: readonly ProductHandle[];
  } {
    const targetPlan = this.input.compilation.compiledTemplate.targetPlan;
    const byContext = new Map<TemplateCompilerTargetContextPlan, ProductHandle[]>();
    const seenByContext = new Map<TemplateCompilerTargetContextPlan, Set<ProductHandle>>();
    const excess: ProductHandle[] = [];
    const discarded = new Set<TemplateCompilerNodeOccurrence>();
    const unwrappedContexts = new Map<TemplateCompilerNodeOccurrence, TemplateCompilerTargetContextPlan>();
    const templateControllerContentContexts = new Map<
      TemplateCompilerElementOccurrence,
      TemplateCompilerTargetContextPlan
    >();
    for (const context of targetPlan.readContexts()) {
      for (const row of context.readRows()) {
        for (const instruction of row.instructions) {
          if (!(instruction instanceof HydrateElementInstruction)) continue;
          for (const contributor of instruction.discardedProjectionContributors) {
            if (contributor.node.productHandle != null) {
              const input = this.exactNode(contributor.node.productHandle);
              if (input != null) discarded.add(input);
            }
          }
          for (const reference of instruction.auSlotProcessContent?.removedChildNodes ?? []) {
            if (reference.productHandle != null) {
              const input = this.exactNode(reference.productHandle);
              if (input != null) discarded.add(input);
            }
          }
        }
      }
      const authority = context.structuralAuthority;
      if (authority instanceof TemplateCompilerProjectionContextStructuralAuthority) {
        for (const contributor of authority.projection.contributors) {
          if (
            contributor.disposition === HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
            && contributor.node.productHandle != null
          ) {
            const input = this.exactNode(contributor.node.productHandle);
            if (input != null) unwrappedContexts.set(input, context);
          }
        }
      } else if (
        authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
        && this.isSourceBearingTemplateControllerContext(context)
        && authority.instruction.node.productHandle != null
      ) {
        const input = this.exactNode(authority.instruction.node.productHandle);
        if (input instanceof TemplateCompilerElementOccurrence && input.templateContent != null) {
          templateControllerContentContexts.set(input, context);
        }
      }
    }
    const append = (
      context: TemplateCompilerTargetContextPlan,
      productHandle: ProductHandle,
    ): void => {
      const seen = seenByContext.get(context) ?? new Set<ProductHandle>();
      if (seen.has(productHandle)) return;
      seen.add(productHandle);
      seenByContext.set(context, seen);
      appendMap(byContext, context, productHandle);
    };
    const visit = (
      node: TemplateCompilerNodeOccurrence,
      inheritedContext: TemplateCompilerTargetContextPlan,
    ): void => {
      if (discarded.has(node)) return;
      const authoredProductHandle = node instanceof TemplateCompilerElementOccurrence
        || node instanceof TemplateCompilerTextOccurrence
        ? this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null
        : null;
      const admittedContexts = authoredProductHandle == null
        ? []
        : this.contextsByReachableNode.get(authoredProductHandle) ?? [];
      const context = admittedContexts.length === 1 ? admittedContexts[0]! : inheritedContext;
      if (authoredProductHandle != null) {
        if (admittedContexts.length === 1) append(context, authoredProductHandle);
        else if (admittedContexts.length === 0 && !unwrappedContexts.has(node)) excess.push(authoredProductHandle);
        else if (admittedContexts.length > 1) excess.push(authoredProductHandle);
      }
      for (const child of node.readChildren()) visit(child, context);
      if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) {
        const contentContext = unwrappedContexts.get(node)
          ?? templateControllerContentContexts.get(node)
          ?? null;
        if (contentContext != null) {
          for (const child of node.templateContent.readChildren()) visit(child, contentContext);
        }
      }
    };
    const root = targetPlan.root;
    visit(this.forest.compilerCarrier, root);
    for (const child of this.forest.compilerContent.readChildren()) visit(child, root);
    return { byContext, excess: [...new Set(excess)] };
  }

  private preflightHydrateElement(
    context: TemplateCompilerTargetContextPlan,
    instruction: HydrateElementInstruction,
  ): readonly TemplateCompilerDeterministicExecutionReason[] {
    const reasons: TemplateCompilerDeterministicExecutionReason[] = [];
    const references = [
      ...instruction.auSlotProcessContent?.removedChildNodes ?? [],
      ...instruction.discardedProjectionContributors.map((contributor) => contributor.node),
      ...instruction.projections.flatMap((projection) =>
        projection.contributors.map((contributor) => contributor.node)
      ),
    ];
    for (const reference of references) {
      if (reference.productHandle == null || this.exactNode(reference.productHandle) == null) {
        reasons.push(reason(
          TemplateCompilerDeterministicExecutionReasonKind.NonSingularOrigin,
          `Hydrate-element instruction '${instruction.productHandle}' has a non-singular structural input.`,
          [instruction.productHandle],
        ));
      }
    }
    for (const projection of instruction.projections) {
      if (this.ownedProjectionContext(context, instruction, projection) == null) {
        reasons.push(reason(
          TemplateCompilerDeterministicExecutionReasonKind.UnsupportedContext,
          `Projection '${projection.slotName}' has no exact child context.`,
          [instruction.productHandle],
        ));
      }
      for (const contributor of projection.contributors) {
        const slotProduct = contributor.slotAttribute?.productHandle ?? null;
        if (slotProduct != null && this.exactAttribute(slotProduct) == null) {
          reasons.push(reason(
            TemplateCompilerDeterministicExecutionReasonKind.NonSingularOrigin,
            `Projection slot attribute '${slotProduct}' has no singular browser occurrence.`,
            [slotProduct],
          ));
        }
      }
    }
    return reasons;
  }

  private prepareAttributePlans(): readonly TemplateCompilerDeterministicExecutionReason[] {
    if (this.attributePlansByProduct.size > 0) return [];
    const reasons: TemplateCompilerDeterministicExecutionReason[] = [];
    for (const site of this.input.compilation.valueSites.sites) {
      const attributeProductHandle = site.attribute?.productHandle ?? null;
      if (attributeProductHandle == null || this.projectionSlotAttributes.has(attributeProductHandle)) continue;
      this.admitAttributePlan(
        attributeProductHandle,
        site.classification?.productHandle ?? site.productHandle,
        reasons,
      );
    }
    for (const instruction of this.input.compilation.compiledTemplate.instructions) {
      if (!(instruction instanceof SpreadTransferedBindingInstruction)) continue;
      const attributeProductHandle = instruction.attribute.productHandle;
      if (attributeProductHandle != null) {
        this.admitAttributePlan(attributeProductHandle, instruction.productHandle, reasons);
      }
    }
    for (const [attributeProductHandle, owner] of this.attributeOwnersByProduct) {
      const attribute = this.input.compilation.html.attributes.find((candidate) =>
        candidate.productHandle === attributeProductHandle
      ) ?? null;
      if (
        attribute == null
        || isLetOwner(owner)
        || this.projectionSlotAttributes.has(attributeProductHandle)
        || !isTemplateSpecialAttributeName(runtimeAttributeName(attribute.rawName, owner.namespace))
      ) continue;
      this.admitAttributePlan(attributeProductHandle, attributeProductHandle, reasons);
    }
    return reasons;
  }

  private admitAttributePlan(
    authoredProductHandle: ProductHandle,
    causeHandle: ClaimEndpointHandle,
    reasons: TemplateCompilerDeterministicExecutionReason[],
  ): void {
    const owner = this.attributeOwnersByProduct.get(authoredProductHandle) ?? null;
    if (owner == null || isLetOwner(owner)) return;
    const occurrence = this.exactAttribute(authoredProductHandle);
    if (occurrence == null || !(occurrence.owner instanceof TemplateCompilerElementOccurrence)) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.NonSingularOrigin,
        `Compiler-consumed attribute '${authoredProductHandle}' has no singular live browser occurrence.`,
        [authoredProductHandle],
      ));
      return;
    }
    if (occurrence.owner === this.forest.compilerCarrier) {
      reasons.push(reason(
        TemplateCompilerDeterministicExecutionReasonKind.UnsupportedCarrierAttribute,
        `Compiler-consumed surrogate attribute '${authoredProductHandle}' is outside target-context content.`,
        [authoredProductHandle],
      ));
      return;
    }
    if (this.executionContextForOwner(owner.element.productHandle) == null) {
      // Eager authored products inside inert or process-consumed content are not reached by the JIT walk.
      return;
    }
    const plan = this.attributePlansByProduct.get(authoredProductHandle)
      ?? new AttributeConsumptionPlan(occurrence, occurrence.owner, authoredProductHandle);
    plan.addCause(causeHandle);
    if (!this.attributePlansByProduct.has(authoredProductHandle)) {
      this.attributePlansByProduct.set(authoredProductHandle, plan);
      appendMap(this.attributePlansByOwner, owner.element.productHandle, plan);
    }
  }

  private executeContext(
    context: TemplateCompilerTargetContextPlan,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    if (this.executedContexts.has(context)) return;
    this.executedContexts.add(context);
    for (const row of context.readRows()) {
      if (session.readTargetGeometry(row) != null) continue;
      if (row.node instanceof HtmlText) {
        this.executeText(context, row.node, session);
        continue;
      }
      const controller = singleTemplateControllerInstruction(row);
      if (controller != null) {
        this.consumeOwnerAttributes(context, row.node.productHandle, session);
        this.executeTemplateController(context, row, controller, session);
        continue;
      }
      const elementInstruction = row.instructions.find((instruction): instruction is HydrateElementInstruction =>
        instruction instanceof HydrateElementInstruction
      ) ?? null;
      if (elementInstruction?.auSlotProcessContent != null) {
        this.consumeKnownAuSlotChildren(context, elementInstruction, session);
      }
      this.consumeOwnerAttributes(context, row.node.productHandle, session);
      if (elementInstruction != null) {
        this.executeProjections(context, elementInstruction, session);
      }
      this.realizeRow(row, session);
    }
    for (const productHandle of context.readCompilerReachableNodeProductHandles()) {
      this.consumeOwnerAttributes(context, productHandle, session);
    }
  }

  private executeTemplateController(
    ownerContext: TemplateCompilerTargetContextPlan,
    outerRow: TemplateCompilerTargetRowPlan,
    outerInstruction: HydrateTemplateControllerInstruction,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    const source = this.exactNode(outerRow.node.productHandle);
    if (!(source instanceof TemplateCompilerElementOccurrence)) {
      throw new Error(`Template-controller row '${outerRow.localKey}' lost its exact element occurrence.`);
    }
    const firstContext = this.ownedTemplateControllerContext(ownerContext, outerInstruction);
    if (firstContext == null) {
      throw new Error(`Template-controller row '${outerRow.localKey}' lost its child context.`);
    }
    const chain = this.templateControllerChain(source, firstContext);
    const leaf = chain.contexts.at(-1)!;
    for (const context of chain.contexts) {
      if (context === leaf && source.templateContent != null) continue;
      session.createGeneratedContextStructure(context);
    }
    session.realizeRenderLocationTarget(outerRow, source);
    for (const row of chain.rows) session.appendRenderLocationTarget(row);
    const leafAuthority = leaf.structuralAuthority;
    if (!(leafAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)) {
      throw new Error(`Template-controller leaf '${leaf.localKey}' lost its structural authority.`);
    }
    if (source.templateContent != null) {
      session.adoptInputContextStructure(
        leaf,
        source,
        source.templateContent,
        [leafAuthority.instruction.productHandle],
      );
    } else {
      session.moveNodeIntoContext(source, leaf, 0, [leafAuthority.instruction.productHandle]);
    }
    this.executeContext(leaf, session);
  }

  private templateControllerChain(
    source: TemplateCompilerElementOccurrence,
    firstContext: TemplateCompilerTargetContextPlan,
  ): TemplateControllerChain {
    const contexts: TemplateCompilerTargetContextPlan[] = [];
    const rows: TemplateCompilerTargetRowPlan[] = [];
    let context = firstContext;
    while (true) {
      contexts.push(context);
      const link = context.readRows().length === 1 ? context.readRows()[0]! : null;
      const instruction = link == null ? null : singleTemplateControllerInstruction(link);
      const child = instruction == null
        || instruction.node.productHandle !== this.forest.exactAuthoredNodeOrigin(source)?.authored.productHandle
        ? null
        : this.ownedTemplateControllerContext(context, instruction);
      if (link == null || instruction == null || child == null) break;
      rows.push(link);
      context = child;
    }
    return new TemplateControllerChain(source, contexts, rows);
  }

  private executeProjections(
    ownerContext: TemplateCompilerTargetContextPlan,
    instruction: HydrateElementInstruction,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    for (const contributor of instruction.discardedProjectionContributors) {
      if (contributor.node.productHandle == null) continue;
      const node = this.exactNode(contributor.node.productHandle);
      if (node == null) throw new Error('Discarded projection contributor lost its exact browser occurrence.');
      session.consumeNodeForContext(node, ownerContext, [instruction.productHandle]);
    }
    for (const projection of instruction.projections) {
      const context = this.ownedProjectionContext(ownerContext, instruction, projection);
      if (context == null) throw new Error(`Projection '${projection.slotName}' lost its child context.`);
      session.createGeneratedContextStructure(context);
      let ordinal = 0;
      for (const contributor of projection.contributors) {
        if (contributor.node.productHandle == null) continue;
        const node = this.exactNode(contributor.node.productHandle);
        if (node == null) throw new Error('Projection contributor lost its exact browser occurrence.');
        switch (contributor.disposition) {
          case HydrateElementProjectionContributorDisposition.RetainedNode: {
            const slotProduct = contributor.slotAttribute?.productHandle ?? null;
            if (slotProduct != null) {
              const attribute = this.exactAttribute(slotProduct);
              if (attribute == null) throw new Error('Projection slot attribute lost its exact browser occurrence.');
              session.consumeAttributeForContext(attribute, ownerContext, [instruction.productHandle]);
              this.consumedAttributeProducts.add(slotProduct);
            }
            session.moveNodeIntoContext(node, context, ordinal++, [instruction.productHandle]);
            break;
          }
          case HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent: {
            if (!(node instanceof TemplateCompilerElementOccurrence) || node.templateContent == null) {
              throw new Error('Unwrapped projection contributor is not an exact template occurrence.');
            }
            const children = [...node.templateContent.readChildren()];
            session.consumeNodeForContext(node, context, [instruction.productHandle]);
            for (const child of children) {
              session.moveNodeIntoContext(child, context, ordinal++, [instruction.productHandle]);
            }
            break;
          }
          case HydrateElementProjectionContributorDisposition.DiscardedWhitespace:
            throw new Error('Discarded projection contributor appeared in a retained projection definition.');
        }
      }
      this.executeContext(context, session);
    }
  }

  private consumeKnownAuSlotChildren(
    context: TemplateCompilerTargetContextPlan,
    instruction: HydrateElementInstruction,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    for (const reference of instruction.auSlotProcessContent?.removedChildNodes ?? []) {
      if (reference.productHandle == null) continue;
      const node = this.exactNode(reference.productHandle);
      if (node == null) throw new Error('Known AuSlot removal lost its exact browser occurrence.');
      session.consumeNodeForContext(node, context, [instruction.productHandle]);
    }
  }

  private executeText(
    context: TemplateCompilerTargetContextPlan,
    node: HtmlText,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    if (this.expandedTextNodes.has(node.productHandle)) return;
    this.expandedTextNodes.add(node.productHandle);
    const rows = context.readRows().filter((row) => row.node.productHandle === node.productHandle);
    const input = this.exactNode(node.productHandle);
    const parse = this.textParsesByNode.get(node.productHandle) ?? null;
    if (
      !(input instanceof TemplateCompilerTextOccurrence)
      || input.inputReference == null
      || parse?.result.kind !== ExpressionParseResultKind.InterpolationSuccess
    ) {
      throw new Error(`Text input '${node.productHandle}' lost its exact expansion authority.`);
    }
    const interpolation = parse.result;
    const causes = rows.flatMap((row) => row.instructions.map((instruction) => instruction.productHandle));
    const outputs: TemplateCompilerTextOccurrence[] = [];
    let staticOrdinal = 0;
    const appendStatic = (text: string): void => {
      if (text.length === 0) return;
      outputs.push(this.forest.createGeneratedText(
        session.createGeneration(
          context,
          `text-expansion:${node.productHandle}`,
          TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment,
          causes,
          staticOrdinal++,
        ),
        text,
        input.inputReference,
      ));
    };
    appendStatic(interpolation.ast.parts[0] ?? '');
    rows.forEach((row, index) => {
      const instruction = row.instructions[0] as TextBindingInstruction;
      outputs.push(this.forest.createGeneratedText(
        session.createGeneration(
          context,
          row.localKey,
          TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder,
          [instruction.productHandle],
          0,
        ),
        ' ',
        input.inputReference,
      ));
      appendStatic(interpolation.ast.parts[index + 1] ?? '');
    });
    session.expandTextInput(input, context, outputs, causes);
    let outputIndex = 0;
    for (const row of rows) {
      while (outputs[outputIndex]?.generation?.role !== TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder) {
        outputIndex++;
      }
      session.realizeMarkerTarget(row, outputs[outputIndex]!);
      outputIndex++;
    }
  }

  private consumeOwnerAttributes(
    context: TemplateCompilerTargetContextPlan,
    ownerProductHandle: ProductHandle,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    const plans = [...this.attributePlansByOwner.get(ownerProductHandle) ?? []].sort((left, right) =>
      requiredSeededAttributeOrdinal(this.forest, left.attribute)
      - requiredSeededAttributeOrdinal(this.forest, right.attribute)
    );
    for (const plan of plans) {
      if (this.consumedAttributeProducts.has(plan.authoredProductHandle)) continue;
      session.consumeAttributeForContext(plan.attribute, context, plan.causeHandles);
      this.consumedAttributeProducts.add(plan.authoredProductHandle);
    }
  }

  private realizeRow(
    row: TemplateCompilerTargetRowPlan,
    session: TemplateCompilerStructuralExecutionSession,
  ): void {
    const occurrence = this.exactNode(row.node.productHandle);
    if (row.targetKind === TemplateRenderTargetKind.MarkerTarget) {
      if (
        !(occurrence instanceof TemplateCompilerElementOccurrence)
        && !(occurrence instanceof TemplateCompilerTextOccurrence)
      ) throw new Error(`Marker row '${row.localKey}' lost its exact target.`);
      session.realizeMarkerTarget(row, occurrence);
      return;
    }
    if (row.targetKind === TemplateRenderTargetKind.RenderLocation) {
      if (!(occurrence instanceof TemplateCompilerElementOccurrence)) {
        throw new Error(`Render-location row '${row.localKey}' lost its exact element target.`);
      }
      session.realizeRenderLocationTarget(row, occurrence);
      return;
    }
    throw new Error(`Compiler row '${row.localKey}' is outside the exact structural target subset.`);
  }

  private indexProjectionSlotAttributes(): void {
    for (const context of this.input.compilation.compiledTemplate.targetPlan.readContexts()) {
      for (const row of context.readRows()) {
        for (const instruction of row.instructions) {
          if (!(instruction instanceof HydrateElementInstruction)) continue;
          for (const projection of instruction.projections) {
            for (const contributor of projection.contributors) {
              const productHandle = contributor.slotAttribute?.productHandle ?? null;
              if (productHandle != null) this.projectionSlotAttributes.add(productHandle);
            }
          }
        }
      }
    }
  }

  private executionContextForOwner(productHandle: ProductHandle): TemplateCompilerTargetContextPlan | null {
    for (const context of this.input.compilation.compiledTemplate.targetPlan.readContexts()) {
      for (const row of context.readRows()) {
        const instruction = singleTemplateControllerInstruction(row);
        if (instruction?.node.productHandle === productHandle) return context;
      }
    }
    const contexts = this.contextsByReachableNode.get(productHandle) ?? [];
    return contexts.length === 1 ? contexts[0]! : null;
  }

  private exactNode(authoredProductHandle: ProductHandle): TemplateCompilerNodeOccurrence | null {
    const occurrences = this.nodesByAuthoredProduct.get(authoredProductHandle) ?? [];
    return occurrences.length === 1 ? occurrences[0]! : null;
  }

  private exactAttribute(authoredProductHandle: ProductHandle): TemplateCompilerAttributeOccurrence | null {
    const occurrences = this.attributesByAuthoredProduct.get(authoredProductHandle) ?? [];
    return occurrences.length === 1 ? occurrences[0]! : null;
  }

  private ownedTemplateControllerContext(
    context: TemplateCompilerTargetContextPlan,
    instruction: HydrateTemplateControllerInstruction,
  ): TemplateCompilerTargetContextPlan | null {
    const matches = context.readOwnedContexts().filter((candidate) =>
      candidate.structuralAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
      && candidate.structuralAuthority.instruction === instruction
    );
    return matches.length === 1 ? matches[0]! : null;
  }

  private isSourceBearingTemplateControllerContext(
    context: TemplateCompilerTargetContextPlan,
  ): boolean {
    const authority = context.structuralAuthority;
    if (!(authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)) return false;
    return !context.readOwnedContexts().some((child) =>
      child.structuralAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority
      && child.structuralAuthority.instruction.node.productHandle === authority.instruction.node.productHandle
    );
  }

  private ownedProjectionContext(
    context: TemplateCompilerTargetContextPlan,
    instruction: HydrateElementInstruction,
    projection: HydrateElementProjectionDefinition,
  ): TemplateCompilerTargetContextPlan | null {
    const matches = context.readOwnedContexts().filter((candidate) =>
      candidate.structuralAuthority instanceof TemplateCompilerProjectionContextStructuralAuthority
      && candidate.structuralAuthority.instruction === instruction
      && candidate.structuralAuthority.projection === projection
    );
    return matches.length === 1 ? matches[0]! : null;
  }

  private hasLocalTemplateSyntax(): boolean {
    const isLocalTemplate = (node: TemplateCompilerNodeOccurrence): boolean =>
      node instanceof TemplateCompilerElementOccurrence
      && node.readAttributes().some((attribute) => attribute.name.toLowerCase() === 'as-custom-element');
    if (isLocalTemplate(this.forest.compilerCarrier)) return true;
    const pending = [...this.forest.compilerContent.readChildren()];
    while (pending.length > 0) {
      const node = pending.shift()!;
      if (isLocalTemplate(node)) return true;
      // Template content is a separate forest edge, matching DOM querySelectorAll's inert boundary.
      pending.unshift(...node.readChildren());
    }
    return false;
  }
}

/**
 * Realize the exact supported built-in structural subset without publishing or freezing transformed products.
 *
 * This consumes normalized compiler rows and instructions as authority; it does not claim to have independently
 * replayed the complete JIT producer path, or proved hook/effect absence, in the world that created them.
 */
export function executeDeterministicTemplateCompiler(
  input: TemplateCompilerDeterministicExecutionRequest,
): TemplateCompilerDeterministicExecutionResult {
  return new DeterministicExecutionFrame(input).execute();
}

function rowsByTextNode(
  context: TemplateCompilerTargetContextPlan,
): ReadonlyMap<ProductHandle, readonly TemplateCompilerTargetRowPlan[]> {
  const rows = new Map<ProductHandle, TemplateCompilerTargetRowPlan[]>();
  for (const row of context.readRows()) {
    if (row.node instanceof HtmlText) appendMap(rows, row.node.productHandle, row);
  }
  return rows;
}

function singleTemplateControllerInstruction(
  row: TemplateCompilerTargetRowPlan,
): HydrateTemplateControllerInstruction | null {
  const instruction = row.instructions.length === 1 ? row.instructions[0] : null;
  return instruction instanceof HydrateTemplateControllerInstruction ? instruction : null;
}

function isLetOwner(owner: HtmlElementAttributeOwner): boolean {
  return runtimeElementResourceName(owner.tagName, owner.namespace) === 'let';
}

function reason(
  reasonKind: TemplateCompilerDeterministicExecutionReasonKind,
  summary: string,
  productHandles: readonly ProductHandle[] = [],
): TemplateCompilerDeterministicExecutionReason {
  return new TemplateCompilerDeterministicExecutionReason(reasonKind, summary, productHandles);
}

function isAbruptExecutionReason(
  candidate: TemplateCompilerDeterministicExecutionReason,
): boolean {
  return candidate.reasonKind === TemplateCompilerDeterministicExecutionReasonKind.CompilerHookProviderAbrupt
    || candidate.reasonKind === TemplateCompilerDeterministicExecutionReasonKind.CompilerHookCallableAbrupt;
}

function uniqueReasons(
  reasons: readonly TemplateCompilerDeterministicExecutionReason[],
): readonly TemplateCompilerDeterministicExecutionReason[] {
  const seen = new Set<string>();
  return reasons.filter((candidate) => {
    const key = JSON.stringify([candidate.reasonKind, candidate.summary, candidate.productHandles]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const values = map.get(key);
  if (values == null) map.set(key, [value]);
  else values.push(value);
}

function requiredSeededAttributeOrdinal(
  forest: TemplateCompilerOccurrenceForest,
  attribute: TemplateCompilerAttributeOccurrence,
): number {
  const ordinal = forest.seededAttributePlacement(attribute)?.ordinal ?? null;
  if (ordinal == null) {
    throw new Error(`Compiler-consumed attribute '${attribute.occurrenceKey}' lost its seeded owner order.`);
  }
  return ordinal;
}
