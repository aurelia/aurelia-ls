import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelHandleFactory } from '../kernel/handles.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AttributeClassificationDecision,
  type AttributeClassificationDecisionOwner,
  decideAttributeClassification,
} from './attribute-classification-decision.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import {
  AttributeSyntaxSiteParseInput,
  type AttributeSyntaxSiteParseResult,
  parseAttributeSyntaxSite,
} from './attribute-syntax-parsing.js';
import {
  selectTemplateAttributeValueSite,
  TemplateAttributeEmptyValueBindingPolicy,
  type TemplateAttributeValueSiteSelection,
} from './attribute-value-site-selection.js';
import type { BindingCommandSyntax } from './binding-command-execution.js';
import {
  BindingCommandInstructionAllocation,
  BindingCommandLoweringState,
} from './binding-command-execution.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import {
  HtmlAttributeReference,
  HtmlIrNodeKind,
  HtmlNodeReference,
  type HtmlAttribute,
  type HtmlElement,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import {
  isTemplateSpecialAttributeName,
} from './special-attribute-source.js';
import type {
  TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerReachedAttributeScalarReceipt,
  TemplateCompilerSiteExecutionDriverReference,
  TemplateCompilerExecutionSession,
} from './template-compiler-execution.js';
import {
  executeTemplateCompilerLiveBindingCommand,
  TemplateCompilerLiveBindingCommandRequest,
  TemplateCompilerLiveBindingCommandState,
  type TemplateCompilerLiveBindingCommandHandleFactory,
  type TemplateCompilerLiveBindingCommandResult,
  type TemplateCompilerLiveExpressionHandleRequest,
  type TemplateCompilerLiveInstructionHandleRequest,
} from './template-compiler-live-binding-command.js';
import {
  executeTemplateCompilerLiveMultiBinding,
  TemplateCompilerLiveMultiBindingCompletion,
  type TemplateCompilerLiveMultiBindingHandleAuthority,
  TemplateCompilerLiveMultiBindingRequest,
  type TemplateCompilerLiveMultiBindingResult,
} from './template-compiler-live-multi-binding.js';
import type { ParsedMultiBindingSegment } from './multi-binding-segments.js';
import {
  TemplateCompilerLiveAttributeDisposition,
  TemplateCompilerLiveAttributeOwnerProgression,
  type TemplateCompilerLiveAttributeOwnerSite,
} from './template-compiler-live-attribute-owner.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceGeneration,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  type TemplateCompilerPreWalkRemainderAuthority,
} from './template-compiler-prewalk-remainder.js';
import { TemplateCompilerReachedSiteSemanticResolver } from './template-compiler-reached-site-semantics.js';
import type { TemplateCompilerBrowserOriginRoute } from './template-compiler-authored-origin-index.js';
import type { TemplateCompilerNormalizedSite } from './template-compiler-normalized-site-index.js';
import {
  expressionParseStateForResult,
  TemplateExpressionParseState,
  TemplateValueSiteKind,
} from './value-site.js';

export const enum TemplateCompilerLiveAttributeSourceKind {
  AuthoredExact = 'authored-exact',
  AuthoredDerived = 'authored-derived',
  AuthoredNonSingular = 'authored-non-singular',
  BrowserOnly = 'browser-only',
  Open = 'open',
}

export const enum TemplateCompilerLiveAttributeCompletion {
  Complete = 'complete',
  Invalid = 'invalid',
  Open = 'open',
}

export const enum TemplateCompilerLiveAttributeTargetLane {
  None = 'none',
  Plain = 'plain',
  ElementBindable = 'element-bindable',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  Capture = 'capture',
}

export const enum TemplateCompilerLiveAttributeStructuralEffectKind {
  AsElementLookup = 'as-element-lookup',
  UsageContainerless = 'usage-containerless',
}

export const enum TemplateCompilerLiveAttributeOpenReasonKind {
  SourceAuthorityOpen = 'source-authority-open',
  SyntaxOpen = 'syntax-open',
  ClassificationOpen = 'classification-open',
  ClassificationInvalid = 'classification-invalid',
  ValueParseOpen = 'value-parse-open',
  ValueParseInvalid = 'value-parse-invalid',
  CommandOpen = 'command-open',
  CommandInvalid = 'command-invalid',
  MultiBindingOpen = 'multi-binding-open',
  MultiBindingInvalid = 'multi-binding-invalid',
  CompilerReadOpen = 'compiler-read-open',
}

export class TemplateCompilerLiveAttributeOpenReason {
  constructor(
    readonly reasonKind: TemplateCompilerLiveAttributeOpenReasonKind,
    readonly summary: string,
  ) {}
}

/** Authored/browser relation for one reached scalar; generation remains an independent axis. */
export class TemplateCompilerLiveAttributeSource {
  constructor(
    readonly sourceKind: TemplateCompilerLiveAttributeSourceKind,
    readonly originState: TemplateCompilerPreWalkBrowserOriginState,
    readonly route: TemplateCompilerBrowserOriginRoute | null,
    readonly authoredElement: HtmlElement | null,
    readonly authoredAttribute: HtmlAttribute | null,
    readonly authoredPrecedent: TemplateCompilerNormalizedSite | null,
    readonly generation: TemplateCompilerOccurrenceGeneration | null,
    readonly openReason: string | null,
  ) {}

  get hasExactAuthoredScalar(): boolean {
    return this.sourceKind === TemplateCompilerLiveAttributeSourceKind.AuthoredExact;
  }
}

/** Product-free syntax carrier shared by classification and built-in command execution. */
export class TemplateCompilerLiveAttributeSyntax implements BindingCommandSyntax {
  constructor(
    readonly parse: AttributeSyntaxSiteParseResult,
    readonly syntaxKind: AttributeSyntaxKind,
    readonly rawName: string,
    readonly runtimeRawName: string,
    readonly rawValue: string,
    readonly target: string,
    readonly targetSourceAddressHandle: BindingCommandSyntax['targetSourceAddressHandle'],
    readonly command: string | null,
    readonly commandSourceAddressHandle: BindingCommandSyntax['commandSourceAddressHandle'],
    readonly parts: readonly string[],
    readonly patternParts: BindingCommandSyntax['patternParts'],
    readonly sourceAddressHandle: BindingCommandSyntax['sourceAddressHandle'],
  ) {}
}

/** One direct value parse staged without publishing a value-site or expression-parse product. */
export class TemplateCompilerLiveAttributeValueParse {
  constructor(
    readonly expressionProductHandle: ProductHandle,
    readonly selection: TemplateAttributeValueSiteSelection,
    readonly read: TemplateCompilerObservedValue<ExpressionParseResult>,
  ) {}

  get state(): TemplateExpressionParseState {
    return expressionParseStateForResult(this.read.value);
  }
}

export class TemplateCompilerLiveAttributeSiteFrame {
  constructor(
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly liveSite: TemplateCompilerLiveAttributeOwnerSite,
    readonly scalar: TemplateCompilerReachedAttributeScalarReceipt,
    readonly source: TemplateCompilerLiveAttributeSource,
  ) {}
}

export class TemplateCompilerLiveAttributeContribution {
  constructor(
    readonly frame: TemplateCompilerLiveAttributeSiteFrame,
    readonly syntax: TemplateCompilerLiveAttributeSyntax | null,
    readonly classification: AttributeClassificationDecision,
    readonly valueSelection: TemplateAttributeValueSiteSelection | null,
    readonly valueParse: TemplateCompilerLiveAttributeValueParse | null,
    readonly command: TemplateCompilerLiveBindingCommandResult | null,
    readonly instructions: readonly TemplateInstruction[],
    readonly targetLane: TemplateCompilerLiveAttributeTargetLane,
    readonly structuralEffects: readonly TemplateCompilerLiveAttributeStructuralEffectKind[],
    readonly disposition: TemplateCompilerLiveAttributeDisposition,
    readonly completion: TemplateCompilerLiveAttributeCompletion,
    readonly reason: TemplateCompilerLiveAttributeOpenReason | null,
    readonly multiBinding: TemplateCompilerLiveMultiBindingResult | null = null,
  ) {}
}

export class TemplateCompilerLiveAttributeOwnerResult {
  readonly templateControllers: readonly TemplateCompilerLiveAttributeContribution[];
  readonly customAttributes: readonly TemplateCompilerLiveAttributeContribution[];
  readonly elementBindables: readonly TemplateCompilerLiveAttributeContribution[];
  readonly plain: readonly TemplateCompilerLiveAttributeContribution[];
  readonly captures: readonly TemplateCompilerLiveAttributeContribution[];
  readonly structuralEffects: readonly TemplateCompilerLiveAttributeStructuralEffectKind[];

  constructor(
    readonly element: TemplateCompilerElementOccurrence,
    readonly lookupName: string,
    readonly debugRead: TemplateCompilerObservedValue<boolean>,
    readonly progression: TemplateCompilerLiveAttributeOwnerProgression,
    readonly contributions: readonly TemplateCompilerLiveAttributeContribution[],
    readonly completion: TemplateCompilerLiveAttributeCompletion,
    readonly terminalContribution: TemplateCompilerLiveAttributeContribution | null,
    readonly reason: TemplateCompilerLiveAttributeOpenReason | null,
  ) {
    this.templateControllers = contributions.filter((entry) =>
      entry.targetLane === TemplateCompilerLiveAttributeTargetLane.TemplateController
    );
    this.customAttributes = contributions.filter((entry) =>
      entry.targetLane === TemplateCompilerLiveAttributeTargetLane.CustomAttribute
    );
    this.elementBindables = contributions.filter((entry) =>
      entry.targetLane === TemplateCompilerLiveAttributeTargetLane.ElementBindable
    );
    this.plain = contributions.filter((entry) =>
      entry.targetLane === TemplateCompilerLiveAttributeTargetLane.Plain
    );
    this.captures = contributions.filter((entry) =>
      entry.targetLane === TemplateCompilerLiveAttributeTargetLane.Capture
    );
    this.structuralEffects = contributions.flatMap((entry) => entry.structuralEffects);
  }

  compilerReads(): readonly TemplateCompilerReadObservation[] {
    return compilerReadsFor(this.debugRead, this.contributions);
  }

  compilerReadsAreClosedAndCurrent(): boolean {
    return this.compilerReads().every((read) =>
      read.closure.state === TemplateCompilerScopeClosureState.Closed
      && read.validate().isCurrent
    );
  }
}

export interface TemplateCompilerLiveAttributeOwnerAssemblyRequest {
  readonly localKey: string;
  readonly execution: TemplateCompilerExecutionSession;
  readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure;
  readonly siteDriver?: TemplateCompilerSiteExecutionDriverReference | null;
  readonly compilerReads: TemplateCompilerReadView;
  readonly preWalk?: TemplateCompilerPreWalkRemainderAuthority | null;
  readonly element: TemplateCompilerElementOccurrence;
  readonly lookupName: string;
  readonly handles: KernelHandleFactory;
}

/** Execute live attribute parsing/classification/value/command decisions in browser NamedNodeMap order. */
export function assembleTemplateCompilerLiveAttributeOwner(
  request: TemplateCompilerLiveAttributeOwnerAssemblyRequest,
): TemplateCompilerLiveAttributeOwnerResult {
  return new TemplateCompilerLiveAttributeOwnerAssembly(request).execute();
}

class TemplateCompilerLiveAttributeOwnerAssembly {
  private readonly semantics: TemplateCompilerReachedSiteSemanticResolver;
  private readonly debugRead: TemplateCompilerObservedValue<boolean>;
  private readonly progression: TemplateCompilerLiveAttributeOwnerProgression;
  private readonly handles: LiveAttributeAssemblyHandleAuthority;
  private readonly authoredElement: HtmlElement | null;
  private readonly authoredAttributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  private readonly contributions: TemplateCompilerLiveAttributeContribution[] = [];

  constructor(private readonly request: TemplateCompilerLiveAttributeOwnerAssemblyRequest) {
    const index = request.preWalk?.index ?? null;
    this.semantics = new TemplateCompilerReachedSiteSemanticResolver({
      execution: request.execution,
      bootstrapClosure: request.bootstrapClosure,
      compilerReads: request.compilerReads,
      preWalk: request.preWalk ?? null,
      index,
    });
    if (request.siteDriver != null) this.semantics.useSiteDriver(request.siteDriver);
    this.debugRead = request.compilerReads.readCompilerDebug();
    this.progression = new TemplateCompilerLiveAttributeOwnerProgression(
      request.execution.forest,
      request.element,
      request.siteDriver?.expectedForestMutationRevision ?? request.bootstrapClosure.forestMutationRevision,
    );
    this.handles = new LiveAttributeAssemblyHandleAuthority(request.handles, request.localKey);
    this.authoredElement = this.resolveAuthoredElement();
    this.authoredAttributesByProduct = new Map(
      (request.preWalk?.binding.compilation.html.attributes ?? []).map((attribute) => [
        attribute.productHandle,
        attribute,
      ]),
    );
  }

  execute(): TemplateCompilerLiveAttributeOwnerResult {
    let terminal: TemplateCompilerLiveAttributeContribution | null = null;
    for (const attribute of this.request.element.readAttributes()) {
      const liveSite = this.progression.begin(attribute);
      const scalar = this.semantics.captureReachedAttributeScalar(
        this.request.element,
        attribute,
        liveSite.originalForestOrdinal,
      );
      const frame = new TemplateCompilerLiveAttributeSiteFrame(
        attribute,
        liveSite,
        scalar,
        this.sourceFor(attribute, scalar),
      );
      const contribution = this.executeSite(frame);
      this.progression.complete(liveSite, contribution.disposition);
      this.contributions.push(contribution);
      if (contribution.completion !== TemplateCompilerLiveAttributeCompletion.Complete) {
        terminal = contribution;
        break;
      }
    }
    this.progression.finish();
    const readsAreExact = compilerReadsFor(this.debugRead, this.contributions).every((read) =>
      read.closure.state === TemplateCompilerScopeClosureState.Closed
      && read.validate().isCurrent
    );
    const completion = terminal?.completion
      ?? (readsAreExact
        ? TemplateCompilerLiveAttributeCompletion.Complete
        : TemplateCompilerLiveAttributeCompletion.Open);
    const reason = terminal?.reason
      ?? (readsAreExact
        ? null
        : new TemplateCompilerLiveAttributeOpenReason(
          TemplateCompilerLiveAttributeOpenReasonKind.CompilerReadOpen,
          'One or more compiler-service reads are open or no longer current.',
        ));
    return new TemplateCompilerLiveAttributeOwnerResult(
      this.request.element,
      this.request.lookupName,
      this.debugRead,
      this.progression,
      this.contributions,
      completion,
      terminal,
      reason,
    );
  }

  private executeSite(frame: TemplateCompilerLiveAttributeSiteFrame): TemplateCompilerLiveAttributeContribution {
    if (frame.source.sourceKind === TemplateCompilerLiveAttributeSourceKind.Open) {
      return this.openContribution(
        frame,
        TemplateCompilerLiveAttributeOpenReasonKind.SourceAuthorityOpen,
        frame.source.openReason ?? 'Reached attribute source authority remains open.',
      );
    }
    if (isTemplateSpecialAttributeName(frame.scalar.qualifiedName)) {
      const effect = frame.scalar.qualifiedName === 'containerless'
        ? TemplateCompilerLiveAttributeStructuralEffectKind.UsageContainerless
        : TemplateCompilerLiveAttributeStructuralEffectKind.AsElementLookup;
      return this.completeContribution(
        frame,
        null,
        new AttributeClassificationDecision(AttributeClassificationKind.CompilerControl, null, null, null, null),
        null,
        null,
        null,
        [],
        TemplateCompilerLiveAttributeTargetLane.None,
        [effect],
        true,
      );
    }

    const parse = parseAttributeSyntaxSite(
      this.request.compilerReads,
      AttributeSyntaxSiteParseInput.runtime(frame.scalar.qualifiedName, frame.scalar.currentValue),
    );
    const syntax = this.syntaxFor(frame, parse);
    if (syntax.syntaxKind === AttributeSyntaxKind.Open) {
      return this.openContribution(
        frame,
        TemplateCompilerLiveAttributeOpenReasonKind.SyntaxOpen,
        'Reached attribute parser execution remained open.',
        syntax,
      );
    }
    const classification = decideAttributeClassification(
      syntax,
      new LiveAttributeClassificationOwner(frame.liveSite.ownerView, this.request.lookupName),
      this.request.compilerReads,
    );
    if (classification.issue != null) {
      return this.invalidContribution(
        frame,
        syntax,
        classification,
        TemplateCompilerLiveAttributeOpenReasonKind.ClassificationInvalid,
        classification.issue.message,
      );
    }
    if (classification.classificationKind === AttributeClassificationKind.Open) {
      return this.openContribution(
        frame,
        TemplateCompilerLiveAttributeOpenReasonKind.ClassificationOpen,
        classification.openReason ?? 'Reached attribute classification remained open.',
        syntax,
        classification,
      );
    }

    const definition = classification.resolvedDefinition;
    const valueSelection = selectTemplateAttributeValueSite({
      classificationKind: classification.classificationKind,
      resourceKind: classification.resourceKind,
      definition: definition instanceof CustomAttributeDefinition ? definition : null,
      rawValue: syntax.rawValue,
      target: syntax.target,
      hasBindingCommand: classification.bindingCommand != null,
      emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.NoBinding,
    });
    if (valueSelection?.siteKind === TemplateValueSiteKind.MultiBindingValue) {
      if (!(definition instanceof CustomAttributeDefinition)) {
        return this.openContribution(
          frame,
          TemplateCompilerLiveAttributeOpenReasonKind.ClassificationOpen,
          'Reached multi-binding selection has no exact custom-attribute definition.',
          syntax,
          classification,
          valueSelection,
        );
      }
      const multiBinding = executeTemplateCompilerLiveMultiBinding(new TemplateCompilerLiveMultiBindingRequest(
        this.request.compilerReads,
        frame.liveSite.ownerView,
        this.nodeReference(frame.source),
        this.attributeReference(frame),
        definition,
        valueSelection.rawValue,
        this.handles.multiBindingSite(frame),
      ));
      if (multiBinding.completion === TemplateCompilerLiveMultiBindingCompletion.Invalid) {
        return this.invalidContribution(
          frame,
          syntax,
          classification,
          TemplateCompilerLiveAttributeOpenReasonKind.MultiBindingInvalid,
          multiBinding.reason?.summary ?? 'Reached inline multi-binding was invalid.',
          valueSelection,
          null,
          null,
          multiBinding.instructions,
          multiBinding,
        );
      }
      if (multiBinding.completion === TemplateCompilerLiveMultiBindingCompletion.Open) {
        return this.openContribution(
          frame,
          TemplateCompilerLiveAttributeOpenReasonKind.MultiBindingOpen,
          multiBinding.reason?.summary ?? 'Reached inline multi-binding remained open.',
          syntax,
          classification,
          valueSelection,
          null,
          null,
          multiBinding.instructions,
          multiBinding,
        );
      }
      return this.completeContribution(
        frame,
        syntax,
        classification,
        valueSelection,
        null,
        null,
        multiBinding.instructions,
        targetLaneFor(classification, syntax),
        [],
        true,
        multiBinding,
      );
    }

    const command = classification.bindingCommand == null
      ? null
      : executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
        this.request.compilerReads,
        frame.liveSite.ownerView,
        this.nodeReference(frame.source),
        this.attributeReference(frame),
        syntax,
        syntax.command ?? classification.bindingCommand.name,
        this.handles.commandSite(frame),
        classification.bindable?.definition ?? null,
        null,
        classification.reads.bindingCommand ?? undefined,
      ));
    if (command?.state === TemplateCompilerLiveBindingCommandState.Open) {
      return this.openContribution(
        frame,
        TemplateCompilerLiveAttributeOpenReasonKind.CommandOpen,
        command.message,
        syntax,
        classification,
        valueSelection,
        null,
        command,
        command.instructions,
      );
    }

    const valueParse = valueSelection?.entryFamily == null || !compilerExecutesDirectValueParse(valueSelection)
      ? null
      : new TemplateCompilerLiveAttributeValueParse(
        this.handles.valueExpression(frame, valueSelection),
        valueSelection,
        this.request.compilerReads.readParsedExpression(
          valueSelection.rawValue,
          valueSelection.entryFamily,
        ),
      );
    const parseCompletion = completionForParses([
      ...(valueParse == null ? [] : [valueParse.read.value]),
      ...(command?.expressionParses.map((entry) => entry.result) ?? []),
    ]);
    if (command?.outcome.state === BindingCommandLoweringState.Invalid
      || parseCompletion === TemplateCompilerLiveAttributeCompletion.Invalid) {
      return this.invalidContribution(
        frame,
        syntax,
        classification,
        command?.outcome.state === BindingCommandLoweringState.Invalid
          ? TemplateCompilerLiveAttributeOpenReasonKind.CommandInvalid
          : TemplateCompilerLiveAttributeOpenReasonKind.ValueParseInvalid,
        command?.abruptFailure?.message
          ?? command?.outcome.message
          ?? 'Reached attribute expression parsing was invalid.',
        valueSelection,
        valueParse,
        command,
        command?.instructions ?? [],
      );
    }
    if (
      command?.outcome.state === BindingCommandLoweringState.Partial
      || command?.outcome.state === BindingCommandLoweringState.Open
      || parseCompletion === TemplateCompilerLiveAttributeCompletion.Open
    ) {
      return this.openContribution(
        frame,
        TemplateCompilerLiveAttributeOpenReasonKind.ValueParseOpen,
        command?.outcome.message ?? 'Reached attribute expression parsing remained open.',
        syntax,
        classification,
        valueSelection,
        valueParse,
        command,
        command?.instructions ?? [],
      );
    }

    return this.completeContribution(
      frame,
      syntax,
      classification,
      valueSelection,
      valueParse,
      command,
      command?.instructions ?? [],
      targetLaneFor(classification, syntax),
      [],
      consumesAttribute(classification, valueSelection),
    );
  }

  private sourceFor(
    attribute: TemplateCompilerAttributeOccurrence,
    scalar: TemplateCompilerReachedAttributeScalarReceipt,
  ): TemplateCompilerLiveAttributeSource {
    const state = this.semantics.originState(attribute);
    const route = this.semantics.originRoute(attribute);
    if (!scalar.isExact()) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.Open,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        `Reached scalar history is '${scalar.state}'.`,
      );
    }
    if (state === TemplateCompilerPreWalkBrowserOriginState.Absent) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.BrowserOnly,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        null,
      );
    }
    if (state === TemplateCompilerPreWalkBrowserOriginState.Unknown && scalar.generation != null) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.BrowserOnly,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        null,
      );
    }
    if (state === TemplateCompilerPreWalkBrowserOriginState.NonSingular) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        null,
      );
    }
    if (state !== TemplateCompilerPreWalkBrowserOriginState.Singular || route?.exactOrigin == null) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.Open,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        `Authored/browser origin state is '${state}'.`,
      );
    }
    const authoredAttribute = this.authoredAttributesByProduct.get(route.exactOrigin.authored.productHandle) ?? null;
    if (authoredAttribute == null) {
      return new TemplateCompilerLiveAttributeSource(
        TemplateCompilerLiveAttributeSourceKind.Open,
        state,
        route,
        this.authoredElement,
        null,
        null,
        scalar.generation,
        'Singular browser origin has no authored attribute product in the current compilation.',
      );
    }
    const precedent = this.semantics.singularAttributeBundle(attribute);
    const exact = scalar.inputReference?.name === scalar.qualifiedName
      && scalar.qualifiedName === precedent?.syntax.runtimeRawName
      && scalar.currentValue === authoredAttribute.rawValue;
    return new TemplateCompilerLiveAttributeSource(
      exact
        ? TemplateCompilerLiveAttributeSourceKind.AuthoredExact
        : TemplateCompilerLiveAttributeSourceKind.AuthoredDerived,
      state,
      route,
      this.authoredElement,
      authoredAttribute,
      precedent,
      scalar.generation,
      null,
    );
  }

  private syntaxFor(
    frame: TemplateCompilerLiveAttributeSiteFrame,
    parse: AttributeSyntaxSiteParseResult,
  ): TemplateCompilerLiveAttributeSyntax {
    const execution = parse.parse.execution;
    const authored = frame.source.authoredPrecedent?.syntax ?? null;
    const nameSemanticsMatch = authored != null
      && authored.runtimeRawName === parse.input.runtimeRawName
      && authored.target === execution.target
      && authored.command === execution.command
      && equalStrings(authored.parts, execution.parts);
    return new TemplateCompilerLiveAttributeSyntax(
      parse,
      execution.syntaxKind,
      parse.input.rawName,
      parse.input.runtimeRawName,
      execution.rawValue,
      execution.target,
      nameSemanticsMatch ? authored.targetSourceAddressHandle : null,
      execution.command,
      nameSemanticsMatch ? authored.commandSourceAddressHandle : null,
      execution.parts,
      nameSemanticsMatch ? authored.patternParts : [],
      frame.source.hasExactAuthoredScalar ? authored?.sourceAddressHandle ?? null : null,
    );
  }

  private resolveAuthoredElement(): HtmlElement | null {
    const route = this.semantics.originRoute(this.request.element);
    return route?.exactOrigin == null
      ? null
      : this.semantics.index?.elementForProduct(route.exactOrigin.authored.productHandle) ?? null;
  }

  private nodeReference(source: TemplateCompilerLiveAttributeSource): HtmlNodeReference {
    return source.authoredElement?.toReference()
      ?? new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
  }

  private attributeReference(frame: TemplateCompilerLiveAttributeSiteFrame): HtmlAttributeReference {
    return frame.source.authoredAttribute?.toReference()
      ?? new HtmlAttributeReference(null, null, frame.scalar.qualifiedName);
  }

  private completeContribution(
    frame: TemplateCompilerLiveAttributeSiteFrame,
    syntax: TemplateCompilerLiveAttributeSyntax | null,
    classification: AttributeClassificationDecision,
    valueSelection: TemplateAttributeValueSiteSelection | null,
    valueParse: TemplateCompilerLiveAttributeValueParse | null,
    command: TemplateCompilerLiveBindingCommandResult | null,
    instructions: readonly TemplateInstruction[],
    targetLane: TemplateCompilerLiveAttributeTargetLane,
    structuralEffects: readonly TemplateCompilerLiveAttributeStructuralEffectKind[],
    consumed: boolean,
    multiBinding: TemplateCompilerLiveMultiBindingResult | null = null,
  ): TemplateCompilerLiveAttributeContribution {
    return new TemplateCompilerLiveAttributeContribution(
      frame,
      syntax,
      classification,
      valueSelection,
      valueParse,
      command,
      instructions,
      targetLane,
      structuralEffects,
      !this.debugRead.value && consumed
        ? TemplateCompilerLiveAttributeDisposition.Removed
        : TemplateCompilerLiveAttributeDisposition.Retained,
      TemplateCompilerLiveAttributeCompletion.Complete,
      null,
      multiBinding,
    );
  }

  private invalidContribution(
    frame: TemplateCompilerLiveAttributeSiteFrame,
    syntax: TemplateCompilerLiveAttributeSyntax,
    classification: AttributeClassificationDecision,
    reasonKind: TemplateCompilerLiveAttributeOpenReasonKind,
    summary: string,
    valueSelection: TemplateAttributeValueSiteSelection | null = null,
    valueParse: TemplateCompilerLiveAttributeValueParse | null = null,
    command: TemplateCompilerLiveBindingCommandResult | null = null,
    instructions: readonly TemplateInstruction[] = [],
    multiBinding: TemplateCompilerLiveMultiBindingResult | null = null,
  ): TemplateCompilerLiveAttributeContribution {
    return new TemplateCompilerLiveAttributeContribution(
      frame,
      syntax,
      classification,
      valueSelection,
      valueParse,
      command,
      instructions,
      targetLaneFor(classification, syntax),
      [],
      TemplateCompilerLiveAttributeDisposition.Open,
      TemplateCompilerLiveAttributeCompletion.Invalid,
      new TemplateCompilerLiveAttributeOpenReason(reasonKind, summary),
      multiBinding,
    );
  }

  private openContribution(
    frame: TemplateCompilerLiveAttributeSiteFrame,
    reasonKind: TemplateCompilerLiveAttributeOpenReasonKind,
    summary: string,
    syntax: TemplateCompilerLiveAttributeSyntax | null = null,
    classification = new AttributeClassificationDecision(
      AttributeClassificationKind.Open,
      null,
      null,
      null,
      null,
    ),
    valueSelection: TemplateAttributeValueSiteSelection | null = null,
    valueParse: TemplateCompilerLiveAttributeValueParse | null = null,
    command: TemplateCompilerLiveBindingCommandResult | null = null,
    instructions: readonly TemplateInstruction[] = [],
    multiBinding: TemplateCompilerLiveMultiBindingResult | null = null,
  ): TemplateCompilerLiveAttributeContribution {
    return new TemplateCompilerLiveAttributeContribution(
      frame,
      syntax,
      classification,
      valueSelection,
      valueParse,
      command,
      instructions,
      syntax == null ? TemplateCompilerLiveAttributeTargetLane.None : targetLaneFor(classification, syntax),
      [],
      TemplateCompilerLiveAttributeDisposition.Open,
      TemplateCompilerLiveAttributeCompletion.Open,
      new TemplateCompilerLiveAttributeOpenReason(reasonKind, summary),
      multiBinding,
    );
  }
}

class LiveAttributeClassificationOwner implements AttributeClassificationDecisionOwner {
  constructor(
    private readonly owner: TemplateCompilerLiveAttributeOwnerSite['ownerView'],
    readonly lookupName: string,
  ) {}

  get tagName(): string {
    return this.owner.tagName;
  }

  get namespace(): TemplateCompilerLiveAttributeOwnerSite['ownerView']['namespace'] {
    return this.owner.namespace;
  }

  get attributeStateKey(): string {
    return this.owner.attributeStateKey;
  }

  hasAttribute(name: string): boolean {
    return this.owner.hasAttribute(name);
  }

  getAttribute(name: string): string | null {
    return this.owner.getAttribute(name);
  }
}

class LiveAttributeAssemblyHandleAuthority {
  constructor(
    private readonly handles: KernelHandleFactory,
    private readonly localKey: string,
  ) {}

  valueExpression(
    frame: TemplateCompilerLiveAttributeSiteFrame,
    selection: TemplateAttributeValueSiteSelection,
  ): ProductHandle {
    return this.handles.product(`${this.siteKey(frame)}:value:${selection.siteKind}`);
  }

  commandSite(frame: TemplateCompilerLiveAttributeSiteFrame): TemplateCompilerLiveBindingCommandHandleFactory {
    return new LiveBindingCommandHandleAuthority(this.handles, this.siteKey(frame));
  }

  multiBindingSite(frame: TemplateCompilerLiveAttributeSiteFrame): TemplateCompilerLiveMultiBindingHandleAuthority {
    return new LiveMultiBindingHandleAuthority(this.handles, this.siteKey(frame));
  }

  private siteKey(frame: TemplateCompilerLiveAttributeSiteFrame): string {
    return `${this.localKey}:attribute:${frame.liveSite.originalForestOrdinal}:${frame.attribute.occurrenceKey}`;
  }
}

class LiveBindingCommandHandleAuthority implements TemplateCompilerLiveBindingCommandHandleFactory {
  constructor(
    private readonly handles: KernelHandleFactory,
    private readonly siteKey: string,
  ) {}

  instruction(request: TemplateCompilerLiveInstructionHandleRequest): BindingCommandInstructionAllocation {
    const key = `${this.siteKey}:instruction:${request.ordinal}:${request.local}`;
    return new BindingCommandInstructionAllocation(
      this.handles.product(key),
      this.handles.identity(key),
    );
  }

  expression(request: TemplateCompilerLiveExpressionHandleRequest): ProductHandle {
    return this.handles.product(`${this.siteKey}:expression:${request.ordinal}:${request.entryFamily}`);
  }
}

class LiveMultiBindingHandleAuthority implements TemplateCompilerLiveMultiBindingHandleAuthority {
  constructor(
    private readonly handles: KernelHandleFactory,
    private readonly siteKey: string,
  ) {}

  segment(segment: ParsedMultiBindingSegment): TemplateCompilerLiveBindingCommandHandleFactory {
    return new LiveBindingCommandHandleAuthority(
      this.handles,
      `${this.siteKey}:multi-binding:${segment.segmentIndex}`,
    );
  }
}

function targetLaneFor(
  classification: AttributeClassificationDecision,
  syntax: TemplateCompilerLiveAttributeSyntax,
): TemplateCompilerLiveAttributeTargetLane {
  switch (classification.classificationKind) {
    case AttributeClassificationKind.CompilerControl:
    case AttributeClassificationKind.Open:
    case AttributeClassificationKind.Ref:
      return TemplateCompilerLiveAttributeTargetLane.None;
    case AttributeClassificationKind.Plain:
    case AttributeClassificationKind.BindingCommand:
      return TemplateCompilerLiveAttributeTargetLane.Plain;
    case AttributeClassificationKind.Bindable:
      return TemplateCompilerLiveAttributeTargetLane.ElementBindable;
    case AttributeClassificationKind.CustomAttribute:
      return TemplateCompilerLiveAttributeTargetLane.CustomAttribute;
    case AttributeClassificationKind.TemplateController:
      return TemplateCompilerLiveAttributeTargetLane.TemplateController;
    case AttributeClassificationKind.Captured:
      return TemplateCompilerLiveAttributeTargetLane.Capture;
    case AttributeClassificationKind.Spread:
      return syntax.target === '...$attrs'
        ? TemplateCompilerLiveAttributeTargetLane.Plain
        : classification.resourceKind === ResourceDefinitionKind.CustomElement
          ? TemplateCompilerLiveAttributeTargetLane.ElementBindable
          : TemplateCompilerLiveAttributeTargetLane.Plain;
  }
}

function consumesAttribute(
  classification: AttributeClassificationDecision,
  valueSelection: TemplateAttributeValueSiteSelection | null,
): boolean {
  switch (classification.classificationKind) {
    case AttributeClassificationKind.Plain:
      return valueSelection != null;
    case AttributeClassificationKind.Open:
    case AttributeClassificationKind.Ref:
      return false;
    case AttributeClassificationKind.Bindable:
    case AttributeClassificationKind.CustomAttribute:
    case AttributeClassificationKind.TemplateController:
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.Captured:
    case AttributeClassificationKind.CompilerControl:
    case AttributeClassificationKind.Spread:
      return true;
  }
}

function compilerExecutesDirectValueParse(selection: TemplateAttributeValueSiteSelection): boolean {
  switch (selection.siteKind) {
    case TemplateValueSiteKind.CapturedValue:
    case TemplateValueSiteKind.SpreadValue:
      return false;
    case TemplateValueSiteKind.TextInterpolation:
    case TemplateValueSiteKind.PlainAttributeValue:
    case TemplateValueSiteKind.BindingCommandValue:
    case TemplateValueSiteKind.MultiBindingValue:
      return false;
    case TemplateValueSiteKind.PlainAttributeInterpolation:
    case TemplateValueSiteKind.BindableValue:
    case TemplateValueSiteKind.CustomAttributeValue:
    case TemplateValueSiteKind.TemplateControllerValue:
      return true;
  }
}

function completionForParses(
  results: readonly ExpressionParseResult[],
): TemplateCompilerLiveAttributeCompletion {
  const states = results.map(expressionParseStateForResult);
  if (states.includes(TemplateExpressionParseState.Error)) {
    return TemplateCompilerLiveAttributeCompletion.Invalid;
  }
  if (states.includes(TemplateExpressionParseState.Companion)) {
    return TemplateCompilerLiveAttributeCompletion.Open;
  }
  return TemplateCompilerLiveAttributeCompletion.Complete;
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compilerReadsFor(
  debugRead: TemplateCompilerObservedValue<boolean>,
  contributions: readonly TemplateCompilerLiveAttributeContribution[],
): readonly TemplateCompilerReadObservation[] {
  const reads: TemplateCompilerReadObservation[] = [debugRead.observation];
  for (const contribution of contributions) {
    retainRead(reads, contribution.syntax?.parse.read.observation ?? null);
    retainRead(reads, contribution.classification.reads.bindingCommand?.observation ?? null);
    retainRead(reads, contribution.classification.reads.element?.observation ?? null);
    retainRead(reads, contribution.classification.reads.attribute?.observation ?? null);
    for (const bindables of contribution.classification.reads.bindables) {
      retainRead(reads, bindables.observation);
    }
    retainRead(reads, contribution.classification.reads.capturePredicate?.observation ?? null);
    retainRead(reads, contribution.valueParse?.read.observation ?? null);
    for (const read of contribution.command?.compilerReads ?? []) retainRead(reads, read);
    for (const read of contribution.multiBinding?.compilerReads() ?? []) retainRead(reads, read);
  }
  return reads;
}

function retainRead(
  reads: TemplateCompilerReadObservation[],
  read: TemplateCompilerReadObservation | null,
): void {
  if (read != null && !reads.includes(read)) reads.push(read);
}
