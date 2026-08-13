import { createHash } from 'node:crypto';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  openSeamBoundaryKindForReason,
  type OpenSeam,
} from '../kernel/open-seam.js';
import type { KernelStore } from '../kernel/store.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
  type AttributeClassification,
  type AttributeSyntax,
} from '../template/attribute-syntax.js';
import {
  BindingCommandLoweringState,
  type BindingCommandLowering,
} from '../template/binding-command-execution.js';
import type { TemplateCompilerIssue } from '../template/compiler-issue.js';
import {
  HydrateElementInstruction,
  TemplateInstructionKind,
  type TemplateInstruction,
} from '../template/instruction-ir.js';
import {
  capturedAttributeSyntaxForDynamicInstruction,
  resourceLocalTemplateInstructions,
} from '../template/runtime-resource-ownership.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import {
  type TemplateExpressionParse,
  type TemplateValueSite,
} from '../template/value-site.js';
import { answer } from './answer-helpers.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticAttributeInterpretationExplanation,
  type SemanticAttributeInterpretationExplanationBlocker,
  type SemanticAttributeInterpretationExplanationConclusion,
  type SemanticAttributeInterpretationExplanationContender,
  type SemanticAttributeInterpretationExplanationEffect,
  type SemanticAttributeInterpretationExplanationEffectKind,
  type SemanticAttributeInterpretationExplanationEvidence,
  type SemanticAttributeInterpretationExplanationIssueEvidence,
  type SemanticAttributeInterpretationExplanationLoweringEvidence,
  type SemanticAttributeInterpretationExplanationNextStep,
  type SemanticAttributeInterpretationExplanationResult,
  type SemanticAttributeInterpretationExplanationSubject,
  type SemanticAttributeInterpretationExplanationUncertainty,
  type SemanticAttributeInterpretationExplanationUncertaintyReason,
  type SemanticAttributeInterpretationExplanationValueSiteEvidence,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceCursorInput,
} from './contracts.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';
import {
  describeAddress,
  semanticExactSourceReference,
  semanticSourceReferenceKey,
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  templateResourceCursorSelections,
  type TemplateResourceCursorSelection,
} from './template-completion.js';

interface AttributeExplanationCandidate {
  readonly selection: TemplateResourceCursorSelection;
  readonly syntax: AttributeSyntax;
  readonly source: SemanticSourceReference;
  readonly nameSource: SemanticSourceReference;
  readonly valueSource: SemanticSourceReference | null;
  readonly matchWidth: number;
}

interface AttributeExplanationFacts {
  readonly explanation: SemanticAttributeInterpretationExplanation;
  readonly coverage: SemanticRuntimeAnswerCoverage;
}

/** Explain how compiler products interpret one exact top-level authored HTML attribute name. */
export function readAttributeInterpretationExplanation(
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
): SemanticRuntimeAnswer<SemanticAttributeInterpretationExplanationResult> {
  const projectKey = emission.project.projectKey;
  const discoveryTruncated = emission.project.sourceDiscovery?.truncated === true;
  const emptyValue = (
    displayText: string,
    contenders: readonly SemanticAttributeInterpretationExplanationContender[] = [],
  ): SemanticAttributeInterpretationExplanationResult => ({
    displayText,
    projectKey,
    explanation: null,
    contenders,
  });
  const absentCoverage = discoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : SemanticRuntimeAnswerCoverage.Complete;
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Attribute interpretation explanation requires a source cursor.',
      emptyValue('No source cursor was supplied.'),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }
  const resolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    emission.project.rootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (resolution.cursor?.offset == null) {
    const summary = resolution.summary ?? 'The supplied attribute cursor could not be resolved.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }

  const candidates = attributeExplanationCandidates(
    emission,
    store,
    resolution.cursor.filePath,
    resolution.cursor.offset,
  );
  const bestWidth = Math.min(...candidates.map((candidate) => candidate.matchWidth));
  const selected = candidates.filter((candidate) => candidate.matchWidth === bestWidth);
  if (selected.length === 0) {
    const summary = 'No top-level authored HTML attribute name was found at the supplied source cursor.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }

  const facts = selected.map((candidate) => attributeExplanationFacts(
    emission,
    store,
    candidate,
    cursor,
    discoveryTruncated,
  ));
  const contenders = facts.map(({ explanation }): SemanticAttributeInterpretationExplanationContender => ({
    subject: explanation.subject,
    conclusionKind: explanation.conclusion.kind,
  }));
  if (facts.length !== 1) {
    const summary = `The supplied source cursor matches ${facts.length} equally specific compiled attribute contexts.`;
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue('Multiple current app analysis contexts represent this authored attribute; no explanation was selected.', contenders),
      {
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
        coverage: combinedCoverage(facts),
      },
    );
  }

  const selectedFacts = facts[0]!;
  const explanation = selectedFacts.explanation;
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    explanation.conclusion.title,
    {
      displayText: [
        explanation.conclusion.title,
        explanation.conclusion.explanation,
        explanation.uncertainty.state === 'closed' ? null : explanation.uncertainty.explanation,
        explanation.conclusion.action,
      ].filter((part): part is string => part != null).join('\n'),
      projectKey,
      explanation,
      contenders,
    },
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage: selectedFacts.coverage,
    },
  );
}

function attributeExplanationCandidates(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  filePath: string,
  offset: number,
): readonly AttributeExplanationCandidate[] {
  const candidates: AttributeExplanationCandidate[] = [];
  for (const selection of templateResourceCursorSelections(store, emission, filePath, offset)) {
    // Deliberately exclude command-owned secondary AttrSyntax products from inline multi-binding values.
    for (const syntax of selection.resource.compilation.attributeSyntax.syntaxes) {
      const attribute = selection.resource.compilation.html.attributes.find((candidate) =>
        candidate.productHandle === syntax.attribute.productHandle
      ) ?? null;
      const nameSource = describeAddress(
        store,
        attribute?.nameAddressHandle ?? syntax.nameSourceAddressHandle,
      );
      const exactNameSource = semanticExactSourceReference(nameSource);
      if (
        exactNameSource?.start == null
        || exactNameSource.end == null
        || !semanticSourceReferenceMatchesFilePath(exactNameSource, filePath)
        || offset < exactNameSource.start
        || offset > exactNameSource.end
      ) {
        continue;
      }
      candidates.push({
        selection,
        syntax,
        source: describeAddress(store, attribute?.sourceAddressHandle ?? syntax.sourceAddressHandle) ?? exactNameSource,
        nameSource: exactNameSource,
        valueSource: describeAddress(store, attribute?.valueAddressHandle ?? null),
        matchWidth: exactNameSource.end - exactNameSource.start,
      });
    }
  }
  return candidates;
}

function attributeExplanationFacts(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  candidate: AttributeExplanationCandidate,
  cursor: SemanticRuntimeSourceCursorInput,
  discoveryTruncated: boolean,
): AttributeExplanationFacts {
  const resource = candidate.selection.resource;
  const syntax = candidate.syntax;
  const classification = resource.compilation.attributeClassification.classifications.find((entry) =>
    entry.syntaxProductHandle === syntax.productHandle
  ) ?? null;
  const valueSites = attributeValueSites(resource, syntax, classification);
  const parses = [
    ...resource.compilation.valueSites.parses,
    ...resource.compilation.bindingCommandLowering.expressionParses,
  ];
  const buildInputs = resource.compilation.bindingCommandLowering.buildInputs.filter((input) =>
    input.syntaxProductHandle === syntax.productHandle
  );
  const lowerings = resource.compilation.bindingCommandLowering.lowerings.filter((lowering) =>
    buildInputs.some((input) => input.productHandle === lowering.inputProductHandle)
  );
  const instructions = attributeInstructions(resource, syntax, lowerings);
  const effects = instructions.map((instruction) => attributeEffect(store, instruction, syntax));
  const issues = attributeIssues(resource, store, candidate.source).map((issue) => issueEvidence(store, issue));
  const seams = attributeOpenSeams(resource, store, candidate.source);
  const evidence = attributeEvidence(
    store,
    syntax,
    classification,
    valueSites,
    parses,
    lowerings,
    instructions,
    effects,
    issues,
    seams,
    candidate.nameSource,
  );
  const uncertainty = attributeUncertainty(
    syntax,
    classification,
    lowerings,
    seams,
    discoveryTruncated,
  );
  const subject = attributeSubject(emission, store, candidate);
  const conclusion = attributeConclusion(subject, classification, lowerings, effects, issues, uncertainty);
  const explanation: SemanticAttributeInterpretationExplanation = {
    subject,
    conclusion,
    evidence,
    uncertainty,
    currentness: {
      authority: 'answer-analysis-basis',
      explanation: 'The answer envelope analysisBasis is the sole freshness and revision authority for this explanation.',
    },
    nextSteps: attributeNextSteps(store, resource, subject, classification, evidence, cursor),
  };
  return {
    explanation,
    coverage: uncertainty.state === 'closed'
      ? SemanticRuntimeAnswerCoverage.Complete
      : uncertainty.state === 'truncated'
        ? SemanticRuntimeAnswerCoverage.Truncated
        : SemanticRuntimeAnswerCoverage.Open,
  };
}

function attributeSubject(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  candidate: AttributeExplanationCandidate,
): SemanticAttributeInterpretationExplanationSubject {
  const compilation = candidate.selection.resource.compilation;
  const templateSource = describeAddress(
    store,
    compilation.definition.template?.addressHandle ?? compilation.definition.sourceAddressHandle,
  );
  return {
    subjectKey: stableExplanationKey('attribute-interpretation', [
      emission.project.projectKey,
      compilation.definition.name,
      candidate.selection.lane,
      candidate.syntax.rawName,
      candidate.syntax.target,
      candidate.syntax.command,
      semanticSourceReferenceKey(candidate.nameSource),
      compilerScopeFingerprint(store, compilation.compilerWorld),
    ]),
    projectKey: emission.project.projectKey,
    definitionName: compilation.definition.name,
    compilationLane: candidate.selection.lane,
    rawName: candidate.syntax.rawName,
    source: candidate.source,
    nameSource: candidate.nameSource,
    valueSource: candidate.valueSource,
    templateSource,
  };
}

function attributeValueSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax,
  classification: AttributeClassification | null,
): readonly TemplateValueSite[] {
  return [
    ...resource.compilation.valueSites.sites,
    ...resource.compilation.bindingCommandLowering.valueSites,
  ].filter((site) =>
    site.syntax?.productHandle === syntax.productHandle
    || (
      classification != null
      && site.classification?.productHandle === classification.productHandle
    )
  );
}

function attributeInstructions(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax,
  lowerings: readonly BindingCommandLowering[],
): readonly TemplateInstruction[] {
  const loweringInstructionHandles = new Set(lowerings.flatMap((lowering) => lowering.instructionProductHandles));
  const instructions = resourceLocalTemplateInstructions(resource).filter((instruction) =>
    loweringInstructionHandles.has(instruction.productHandle)
    || instructionAttributeProductHandle(instruction) === syntax.attribute.productHandle
    || (
      instruction instanceof HydrateElementInstruction
      && instruction.captureSyntaxProductHandles.includes(syntax.productHandle)
    )
    || capturedAttributeSyntaxForDynamicInstruction(resource, instruction)?.productHandle === syntax.productHandle
  );
  return [...new Map(instructions.map((instruction) => [instruction.productHandle, instruction] as const)).values()];
}

function instructionAttributeProductHandle(instruction: TemplateInstruction): ProductHandle | null {
  return 'attribute' in instruction ? instruction.attribute?.productHandle ?? null : null;
}

function attributeEvidence(
  store: KernelStore,
  syntax: AttributeSyntax,
  classification: AttributeClassification | null,
  valueSites: readonly TemplateValueSite[],
  parses: readonly TemplateExpressionParse[],
  lowerings: readonly BindingCommandLowering[],
  instructions: readonly TemplateInstruction[],
  effects: readonly SemanticAttributeInterpretationExplanationEffect[],
  issues: readonly SemanticAttributeInterpretationExplanationIssueEvidence[],
  seams: readonly OpenSeam[],
  nameSource: SemanticSourceReference,
): SemanticAttributeInterpretationExplanationEvidence {
  return {
    syntax: {
      syntaxKind: syntax.syntaxKind,
      target: syntax.target,
      command: syntax.command,
      parts: syntax.parts,
      pattern: syntax.pattern?.pattern ?? null,
      nameSource: describeAddress(store, syntax.nameSourceAddressHandle) ?? nameSource,
      targetSource: describeAddress(store, syntax.targetSourceAddressHandle),
      commandSource: describeAddress(store, syntax.commandSourceAddressHandle),
    },
    classification: classification == null ? null : {
      classificationKind: classification.classificationKind,
      resourceKind: classification.resourceKind,
      resourceName: classification.resource?.name ?? null,
      bindableName: classification.bindable?.definition.name ?? null,
      bindableAttribute: classification.bindable?.definition.attribute ?? null,
      bindingCommandName: classification.bindingCommand?.name ?? null,
      openReason: classification.openReason,
    },
    valueSites: valueSites.map((site): SemanticAttributeInterpretationExplanationValueSiteEvidence => {
      const parse = parses.find((entry) => entry.site.productHandle === site.productHandle) ?? null;
      return {
        siteKind: site.siteKind,
        rawValue: site.rawValue,
        entryFamily: site.entryFamily,
        parseState: parse?.state ?? null,
        resultKind: parse?.resultKind ?? null,
        source: describeAddress(store, site.sourceAddressHandle),
      };
    }),
    lowerings: lowerings.map((lowering): SemanticAttributeInterpretationExplanationLoweringEvidence => ({
      commandName: lowering.command.name,
      state: lowering.state,
      message: lowering.message,
      frameworkErrorCode: lowering.frameworkErrorCode,
      effectIndexes: lowering.instructionProductHandles.flatMap((handle) => {
        const index = instructions.findIndex((instruction) => instruction.productHandle === handle);
        return index < 0 ? [] : [index];
      }),
      source: describeAddress(store, lowering.sourceAddressHandle),
    })),
    effects,
    issues,
    blockers: attributeBlockers(store, syntax, classification, lowerings, seams),
  };
}

function attributeIssues(
  resource: TemplateResourceRuntimeAnalysisEmission,
  store: KernelStore,
  attributeSource: SemanticSourceReference,
): readonly TemplateCompilerIssue[] {
  return [
    ...resource.compilation.attributeClassification.issues,
    ...resource.compilation.bindingCommandLowering.issues,
    ...resource.compilation.compiledTemplate.issues,
  ].filter((issue) =>
    sourceReferenceWithinCarrier(describeAddress(store, issue.sourceAddressHandle), attributeSource)
  );
}

function issueEvidence(
  store: KernelStore,
  issue: TemplateCompilerIssue,
): SemanticAttributeInterpretationExplanationIssueEvidence {
  return {
    phase: issue.phase,
    issueKind: issue.issueKind,
    severity: issue.severity,
    message: issue.message,
    frameworkErrorCode: issue.frameworkErrorCode,
    source: describeAddress(store, issue.sourceAddressHandle),
    relatedSources: issue.relatedInformation
      .map((related) => describeAddress(store, related.sourceAddressHandle))
      .filter((source): source is SemanticSourceReference => source != null),
  };
}

function attributeOpenSeams(
  resource: TemplateResourceRuntimeAnalysisEmission,
  store: KernelStore,
  attributeSource: SemanticSourceReference,
): readonly OpenSeam[] {
  return resource.compilation.compiledTemplate.openSeams.filter((seam) =>
    sourceReferenceWithinCarrier(describeAddress(store, seam.addressHandle), attributeSource)
    || seam.reasonSources.some((reason) =>
      sourceReferenceWithinCarrier(describeAddress(store, reason.addressHandle), attributeSource)
    )
  );
}

function sourceReferenceWithinCarrier(
  source: SemanticSourceReference | null,
  carrier: SemanticSourceReference,
): boolean {
  const exactSource = semanticExactSourceReference(source);
  const exactCarrier = semanticExactSourceReference(carrier);
  return exactSource?.path != null
    && exactSource.start != null
    && exactSource.end != null
    && exactCarrier?.start != null
    && exactCarrier.end != null
    && semanticSourceReferenceMatchesFilePath(exactCarrier, exactSource.path)
    && exactCarrier.start <= exactSource.start
    && exactSource.end <= exactCarrier.end;
}

function attributeBlockers(
  store: KernelStore,
  syntax: AttributeSyntax,
  classification: AttributeClassification | null,
  lowerings: readonly BindingCommandLowering[],
  seams: readonly OpenSeam[],
): readonly SemanticAttributeInterpretationExplanationBlocker[] {
  const blockers: SemanticAttributeInterpretationExplanationBlocker[] = [];
  if (
    syntax.syntaxKind === AttributeSyntaxKind.Open
    || classification == null
    || classification.classificationKind === AttributeClassificationKind.Open
    || classification.openReason != null
  ) {
    blockers.push({
      kind: 'open-classification',
      summary: classification?.openReason ?? 'Aurelia could not close this attribute classification without guessing.',
      reasonKinds: [],
      boundaryKinds: [],
      sources: uniqueSources([describeAddress(store, syntax.nameSourceAddressHandle)]),
    });
  }
  for (const lowering of lowerings) {
    if (lowering.state !== BindingCommandLoweringState.Open && lowering.state !== BindingCommandLoweringState.Partial) {
      continue;
    }
    blockers.push({
      kind: 'open-lowering',
      summary: lowering.message ?? `The ${lowering.command.name} command lowering remains ${lowering.state}.`,
      reasonKinds: [],
      boundaryKinds: [],
      sources: uniqueSources([describeAddress(store, lowering.sourceAddressHandle)]),
    });
  }
  blockers.push(...seams.map((seam): SemanticAttributeInterpretationExplanationBlocker => ({
    kind: 'open-seam',
    summary: seam.summary,
    reasonKinds: seam.reasonKinds,
    boundaryKinds: [...new Set(seam.reasonKinds.map(openSeamBoundaryKindForReason))],
    sources: uniqueSources([
      describeAddress(store, seam.addressHandle),
      ...seam.reasonSources.map((reason) => describeAddress(store, reason.addressHandle)),
    ]),
  })));
  return blockers;
}

function attributeUncertainty(
  syntax: AttributeSyntax,
  classification: AttributeClassification | null,
  lowerings: readonly BindingCommandLowering[],
  seams: readonly OpenSeam[],
  discoveryTruncated: boolean,
): SemanticAttributeInterpretationExplanationUncertainty {
  const reasons: SemanticAttributeInterpretationExplanationUncertaintyReason[] = [];
  if (syntax.syntaxKind === AttributeSyntaxKind.Open) reasons.push('attribute-syntax-open');
  if (
    classification == null
    || classification.classificationKind === AttributeClassificationKind.Open
    || classification.openReason != null
  ) reasons.push('attribute-classification-open');
  if (lowerings.some((lowering) =>
    lowering.state === BindingCommandLoweringState.Open
    || lowering.state === BindingCommandLoweringState.Partial
  )) reasons.push('binding-command-lowering-open');
  if (seams.length > 0) reasons.push('compiler-open-seam');
  if (discoveryTruncated) reasons.push('source-discovery-truncated');
  const uniqueReasons = [...new Set(reasons)];
  if (discoveryTruncated) {
    return {
      state: 'truncated',
      reasons: uniqueReasons,
      explanation: 'Project source discovery was truncated, so this interpretation is limited to the admitted source basis.',
    };
  }
  if (uniqueReasons.length > 0) {
    return {
      state: 'open',
      reasons: uniqueReasons,
      explanation: `This interpretation remains open because ${uniqueReasons.map(uncertaintyReasonText).join('; ')}.`,
    };
  }
  return {
    state: 'closed',
    reasons: [],
    explanation: 'No modeled syntax, classification, lowering, compiler-seam, or discovery uncertainty remains.',
  };
}

function attributeConclusion(
  subject: SemanticAttributeInterpretationExplanationSubject,
  classification: AttributeClassification | null,
  lowerings: readonly BindingCommandLowering[],
  effects: readonly SemanticAttributeInterpretationExplanationEffect[],
  issues: readonly SemanticAttributeInterpretationExplanationIssueEvidence[],
  uncertainty: SemanticAttributeInterpretationExplanationUncertainty,
): SemanticAttributeInterpretationExplanationConclusion {
  const name = subject.rawName;
  const errorIssue = issues.find((issue) => issue.severity === 'error') ?? null;
  const invalidLowering = lowerings.find((lowering) => lowering.state === BindingCommandLoweringState.Invalid) ?? null;
  if (errorIssue != null || invalidLowering != null) {
    const reason = errorIssue?.message ?? invalidLowering?.message ?? 'Aurelia rejected this attribute during compilation.';
    return {
      kind: 'invalid',
      title: `Aurelia rejected ${name}.`,
      explanation: reason,
      action: 'Inspect the exact compiler issue and its authored source before changing this attribute.',
    };
  }
  if (
    classification == null
    || classification.classificationKind === AttributeClassificationKind.Open
    || classification.openReason != null
  ) {
    return {
      kind: 'open',
      title: `Aurelia's interpretation of ${name} remains open.`,
      explanation: classification?.openReason ?? uncertainty.explanation,
      action: 'Inspect the retained blocker or compiler seam before relying on one runtime effect.',
    };
  }
  if (classification.classificationKind === AttributeClassificationKind.Captured) {
    return {
      kind: 'captured',
      title: `Aurelia captures ${name}.`,
      explanation: 'The custom element retains this authored attribute for its capture and forwarding path.',
      action: 'Inspect the custom element capture contract or the emitted forwarded effects when more detail is needed.',
    };
  }
  if (classification.classificationKind === AttributeClassificationKind.CompilerControl) {
    return {
      kind: 'compiler-control',
      title: `Aurelia uses ${name} as compiler control.`,
      explanation: 'This attribute changes template compilation behavior directly rather than representing one runtime binding instruction.',
      action: 'Inspect the classified compiler-control role when changing template structure.',
    };
  }
  if (effects.length > 0) {
    return {
      kind: 'instruction-backed',
      title: `Aurelia gives ${name} ${effects.length === 1 ? 'one runtime effect' : `${effects.length} runtime effects`}.`,
      explanation: effects.map((effect) => effect.summary).join(' '),
      action: 'Inspect the typed effect rows for the exact targets and authored value sources.',
    };
  }
  if (classification.classificationKind === AttributeClassificationKind.Plain) {
    return {
      kind: 'plain-attribute',
      title: `Aurelia classifies ${name} as an ordinary HTML attribute.`,
      explanation: 'No Aurelia-specific runtime effect is asserted for this exact attribute by the returned compiler products.',
      action: 'Use normal HTML or DOM behavior as the authority for this attribute.',
    };
  }
  return {
    kind: 'open',
    title: `Aurelia classified ${name}, but its exact final effect is not proved.`,
    explanation: 'The current typed compiler products do not support a stronger downstream-effect statement without guessing.',
    action: 'Inspect the classification and compiler evidence before relying on one runtime effect.',
  };
}

function attributeEffect(
  store: KernelStore,
  instruction: TemplateInstruction,
  syntax: AttributeSyntax,
): SemanticAttributeInterpretationExplanationEffect {
  return {
    kind: effectKind(instruction.instructionKind),
    instructionKind: instruction.instructionKind,
    summary: effectSummary(instruction, syntax.rawName),
    source: describeAddress(store, instruction.sourceAddressHandle),
  };
}

function effectKind(
  kind: TemplateInstruction['instructionKind'],
): SemanticAttributeInterpretationExplanationEffectKind {
  switch (kind) {
    case TemplateInstructionKind.HydrateElement: return 'hydrate-element';
    case TemplateInstructionKind.HydrateAttribute: return 'hydrate-attribute';
    case TemplateInstructionKind.HydrateTemplateController: return 'control-view';
    case TemplateInstructionKind.PropertyBinding: return 'bind-property';
    case TemplateInstructionKind.Interpolation:
    case TemplateInstructionKind.TextBinding: return 'interpolate';
    case TemplateInstructionKind.ListenerBinding: return 'listen';
    case TemplateInstructionKind.IteratorBinding: return 'iterate';
    case TemplateInstructionKind.RefBinding: return 'assign-reference';
    case TemplateInstructionKind.LetBinding:
    case TemplateInstructionKind.HydrateLetElement: return 'bind-let';
    case TemplateInstructionKind.SetProperty: return 'set-property';
    case TemplateInstructionKind.SetAttribute: return 'set-attribute';
    case TemplateInstructionKind.SetClassAttribute: return 'set-class';
    case TemplateInstructionKind.SetStyleAttribute: return 'set-style';
    case TemplateInstructionKind.StylePropertyBinding: return 'bind-style';
    case TemplateInstructionKind.AttributeBinding:
    case TemplateInstructionKind.MultiAttr: return 'bind-attribute';
    case TemplateInstructionKind.SpreadTransferedBinding:
    case TemplateInstructionKind.SpreadElementPropBinding: return 'spread-bindings';
    case TemplateInstructionKind.SpreadValueBinding: return 'spread-value';
    case TemplateInstructionKind.TranslationBinding:
    case TemplateInstructionKind.TranslationBindBinding:
    case TemplateInstructionKind.TranslationParametersBinding: return 'translate';
    case TemplateInstructionKind.StateBinding: return 'bind-state';
    case TemplateInstructionKind.DispatchBinding: return 'dispatch-state';
  }
}

function effectSummary(instruction: TemplateInstruction, rawName: string): string {
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateElement:
      return `Aurelia retains ${rawName} while hydrating the custom element.`;
    case TemplateInstructionKind.HydrateAttribute:
      return `Aurelia hydrates the ${instruction.resourceName} custom attribute.`;
    case TemplateInstructionKind.HydrateTemplateController:
      return `Aurelia lets ${instruction.controllerName} control a nested view.`;
    case TemplateInstructionKind.PropertyBinding:
      return `Aurelia binds the value to ${instruction.targetProperty}.`;
    case TemplateInstructionKind.Interpolation:
      return `Aurelia interpolates the value${instruction.target == null ? '' : ` into ${instruction.target}`}.`;
    case TemplateInstructionKind.ListenerBinding:
      return `Aurelia listens for ${instruction.eventName}.`;
    case TemplateInstructionKind.IteratorBinding:
      return `Aurelia repeats the controlled view over the authored iterable.`;
    case TemplateInstructionKind.RefBinding:
      return `Aurelia assigns a reference through ${instruction.target}.`;
    case TemplateInstructionKind.LetBinding:
      return `Aurelia publishes the value as ${instruction.target} in template scope.`;
    case TemplateInstructionKind.TextBinding:
      return 'Aurelia updates a text node from the authored interpolation.';
    case TemplateInstructionKind.SetProperty:
      return `Aurelia sets the ${instruction.targetProperty} property.`;
    case TemplateInstructionKind.SetAttribute:
      return `Aurelia sets the ${instruction.targetAttribute} attribute.`;
    case TemplateInstructionKind.SetClassAttribute:
      return 'Aurelia sets the element class value.';
    case TemplateInstructionKind.SetStyleAttribute:
      return 'Aurelia sets the element style value.';
    case TemplateInstructionKind.StylePropertyBinding:
      return `Aurelia binds the ${instruction.targetProperty} style property.`;
    case TemplateInstructionKind.AttributeBinding:
      return `Aurelia binds ${instruction.target} through the ${instruction.attr} attribute lane.`;
    case TemplateInstructionKind.MultiAttr:
      return `Aurelia lowers the inline ${instruction.target} binding.`;
    case TemplateInstructionKind.HydrateLetElement:
      return 'Aurelia hydrates the let scope that owns this binding.';
    case TemplateInstructionKind.SpreadTransferedBinding:
      return 'Aurelia transfers bindings through the spread path.';
    case TemplateInstructionKind.SpreadElementPropBinding:
      return 'Aurelia spreads the binding onto a custom-element property.';
    case TemplateInstructionKind.SpreadValueBinding:
      return `Aurelia spreads the authored value to ${instruction.target}.`;
    case TemplateInstructionKind.TranslationBinding:
    case TemplateInstructionKind.TranslationBindBinding:
    case TemplateInstructionKind.TranslationParametersBinding:
      return `Aurelia applies translation behavior to ${instruction.target}.`;
    case TemplateInstructionKind.StateBinding:
      return `Aurelia binds ${instruction.target} to state${instruction.storeName == null ? '' : ` from ${instruction.storeName}`}.`;
    case TemplateInstructionKind.DispatchBinding:
      return `Aurelia dispatches state work when ${instruction.eventName} fires.`;
  }
}

function attributeNextSteps(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  subject: SemanticAttributeInterpretationExplanationSubject,
  classification: AttributeClassification | null,
  evidence: SemanticAttributeInterpretationExplanationEvidence,
  cursor: SemanticRuntimeSourceCursorInput,
): readonly SemanticAttributeInterpretationExplanationNextStep[] {
  const steps: SemanticAttributeInterpretationExplanationNextStep[] = [];
  const selectedSource = selectedClassificationSource(store, resource, classification);
  if (selectedSource != null) {
    steps.push({
      kind: 'inspect-source',
      label: selectedSource.label,
      source: selectedSource.source,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  const issueSource = evidence.issues.find((issue) => issue.source != null)?.source ?? null;
  const blockerSource = evidence.blockers.flatMap((blocker) => blocker.sources)[0] ?? null;
  if (issueSource != null || blockerSource != null) {
    steps.push({
      kind: 'inspect-source',
      label: 'Inspect the exact compiler issue or blocker source.',
      source: issueSource ?? blockerSource,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  steps.push({
    kind: 'requery',
    label: 'Refresh this explanation against the current compiler products.',
    source: subject.nameSource,
    relatedQueryKind: SemanticAppQueryKind.AttributeInterpretationExplanation,
    targetQuery: {
      kind: SemanticAppQueryKind.AttributeInterpretationExplanation,
      cursor,
    },
  });
  return steps.slice(0, 3);
}

function selectedClassificationSource(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  classification: AttributeClassification | null,
): { readonly label: string; readonly source: SemanticSourceReference } | null {
  const bindableSource = describeAddress(
    store,
    classification?.bindable?.definition.sourceAddressHandle ?? null,
  );
  if (bindableSource != null) {
    return {
      label: `Inspect the selected ${classification!.bindable!.definition.name} bindable declaration.`,
      source: bindableSource,
    };
  }
  const resourceSource = describeAddress(store, classification?.resource?.sourceAddressHandle ?? null);
  if (resourceSource != null) {
    return {
      label: `Inspect the selected ${classification!.resource!.name} resource declaration.`,
      source: resourceSource,
    };
  }
  const commandProductHandle = classification?.bindingCommand?.productHandle ?? null;
  const command = commandProductHandle == null
    ? null
    : resource.compilation.compilerWorld.bindingCommands.find((candidate) =>
      candidate.executable.productHandle === commandProductHandle
    )?.executable ?? null;
  const commandSource = describeAddress(store, command?.sourceAddressHandle ?? null);
  return commandSource == null || command == null
    ? null
    : {
        label: `Inspect the selected ${command.name} binding-command declaration.`,
        source: commandSource,
      };
}

function compilerScopeFingerprint(
  store: KernelStore,
  compilerWorld: TemplateResourceRuntimeAnalysisEmission['compilation']['compilerWorld'],
): readonly unknown[] {
  const resourceFingerprint = (candidate: {
    readonly resourceKind: unknown;
    readonly name: string;
    readonly aliases: readonly string[];
    readonly sourceAddressHandle: Parameters<typeof describeAddress>[1];
  }): readonly unknown[] => [
    candidate.resourceKind,
    candidate.name,
    [...candidate.aliases].sort(),
    semanticSourceReferenceKey(describeAddress(store, candidate.sourceAddressHandle)),
  ];
  const scope = compilerWorld.resourceScope;
  return [
    compilerWorld.world.worldKind,
    semanticSourceReferenceKey(describeAddress(store, compilerWorld.world.sourceAddressHandle)),
    semanticSourceReferenceKey(describeAddress(store, scope.sourceAddressHandle)),
    scope.lookups.map((lookup) => [
      lookup.lookupKey,
      lookup.lane,
      resourceFingerprint(lookup.winner),
      semanticSourceReferenceKey(describeAddress(store, lookup.sourceAddressHandle)),
    ]).sort(compareFingerprintRows),
    scope.blockedLookups.map((lookup) => [
      lookup.lookupKey,
      lookup.lane,
      semanticSourceReferenceKey(describeAddress(store, lookup.sourceAddressHandle)),
    ]).sort(compareFingerprintRows),
    scope.exclusions.map((exclusion) => [
      exclusion.reason,
      [...exclusion.lookupKeys].sort(),
      exclusion.winnerLane,
      exclusion.loserLane,
      resourceFingerprint(exclusion.winner),
      resourceFingerprint(exclusion.loser),
    ]).sort(compareFingerprintRows),
    compilerWorld.attributePatterns.map((pattern) => [
      pattern.executable.executionKind,
      pattern.executable.patterns.map((entry) => [entry.pattern, entry.symbols]).sort(compareFingerprintRows),
      semanticSourceReferenceKey(describeAddress(store, pattern.executable.sourceAddressHandle)),
    ]).sort(compareFingerprintRows),
    compilerWorld.bindingCommands.map((command) => [
      command.executable.name,
      [...command.executable.aliases].sort(),
      command.executable.key,
      command.executable.executionKind,
      semanticSourceReferenceKey(describeAddress(store, command.executable.sourceAddressHandle)),
    ]).sort(compareFingerprintRows),
  ];
}

function compareFingerprintRows(left: readonly unknown[], right: readonly unknown[]): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function uncertaintyReasonText(reason: SemanticAttributeInterpretationExplanationUncertaintyReason): string {
  switch (reason) {
    case 'attribute-syntax-open': return 'the attribute parser retained open syntax';
    case 'attribute-classification-open': return 'resource, bindable, or command classification did not close';
    case 'binding-command-lowering-open': return 'binding-command lowering remains partial or open';
    case 'compiler-open-seam': return 'an exact source-backed compiler seam remains open';
    case 'source-discovery-truncated': return 'project source discovery was truncated';
  }
}

function uniqueSources(
  sources: readonly (SemanticSourceReference | null)[],
): readonly SemanticSourceReference[] {
  return [...new Map(sources
    .filter((source): source is SemanticSourceReference => source != null)
    .map((source) => [semanticSourceReferenceKey(source), source] as const)).values()];
}

function stableExplanationKey(namespace: string, values: readonly unknown[]): string {
  return `${namespace}:${createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 24)}`;
}

function combinedCoverage(facts: readonly AttributeExplanationFacts[]): SemanticRuntimeAnswerCoverage {
  if (facts.some((fact) => fact.coverage === SemanticRuntimeAnswerCoverage.Truncated)) {
    return SemanticRuntimeAnswerCoverage.Truncated;
  }
  return facts.some((fact) => fact.coverage === SemanticRuntimeAnswerCoverage.Open)
    ? SemanticRuntimeAnswerCoverage.Open
    : SemanticRuntimeAnswerCoverage.Complete;
}
