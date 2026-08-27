import { type SemanticClaim } from '../kernel/claim.js';
import {
  SourceSpanRole,
  type SourceSpanAddress,
} from '../kernel/address.js';
import {
  type OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  MaterializationRecord,
} from '../kernel/materialization.js';
import {
  KernelStoreBatch,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  type KernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetails,
} from '../kernel/publication.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type {
  BindingIdentifierOrPattern,
  ExpressionType,
} from '../expression/ast.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  ExpressionParseResult,
  IteratorParseResult,
} from '../expression/parse-result-algebra.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import { visitExpressionAstNodes } from '../expression/parse-result-inspection.js';
import { admitRepeatObjectBindingPattern } from '../expression/repeat-object-binding-pattern.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import {
  type AttributeClassification,
  AttributeClassificationKind,
  type AttributePatternExecutionResult,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type {
  BindingCommandBuildContext,
} from './binding-command-execution.js';
import {
  BindingCommandBuildInfo,
  type BindingCommandBuildInput,
  BindingCommandBuildResult,
  type BindingCommandExecutable,
  BindingCommandExecutionKind,
  BindingCommandInstructionAllocation,
  BindingCommandIteratorParse,
  type BindingCommandLowering,
  BindingCommandLoweringState,
  BindingCommandTailSyntax,
  MultiBindingLowering,
  type MultiBindingSegment,
} from './binding-command-execution.js';
import {
  BindingCommandProductPublisher,
  BindingCommandLoweringPublisher,
  type BindingCommandLoweringSourceSet,
  type CommandAttributeClassification,
  type PublishedBindingCommandBuild,
  type PublishedBindingCommandLowering,
  type PublishedMultiBindingExpressionParse,
} from './binding-command-lowering-publication.js';
import {
  type TemplateCompilerIssue,
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
} from './compiler-issue.js';
import {
  TemplateCompilerIssuePublisher,
  type TemplateCompilerIssuePublication,
} from './compiler-issue-publication.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import {
  type BuiltInBindingCommand,
} from './built-in-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilerReadView } from './compiler-read-view.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import {
  TemplateCompilerAttributeOwnerProgression,
  TemplateCompilerAttributeOwnerProgressionDisposition,
  TemplateCompilerAttributeOwnerProgressionOpenReason,
  TemplateCompilerAttributeOwnerProgressionOpenReasonKind,
  TemplateCompilerAttributeOwnerProgressionState,
  type TemplateCompilerAttributeOwnerProgressionSite,
} from './attribute-owner-progression.js';
import type {
  TemplateAttributeBindablesInfo,
} from './compiler-world.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  type TemplateExpressionParse,
  TemplateExpressionParseState,
  type TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import {
  TemplateValueSitePublicationRequest,
  TemplateValueSitePublisher,
} from './value-site-publication.js';
import {
  runtimeExpressionParseContextForSourceSpanAddress,
  sourceAddressForRuntimeExpressionSpan,
} from './runtime-expression-source-address.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  type HtmlAttribute,
  type HtmlElementAttributeOwner,
  htmlElementAttributeOwnersByAttributeProduct,
} from './html-ir.js';
import {
  type ParsedMultiBindingSegment,
  parseInlineMultiBindingSegments,
} from './multi-binding-segments.js';
import type {
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  type TemplateInstructionKind,
  type TemplateInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
export interface BindingCommandLoweringRequest {
  /** Store-local key for this binding-command lowering pass. */
  readonly localKey: string;
  /** Compiler unit that owns the HTML, syntax, classification, and parser publications. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Parsed HTML products whose command-bearing attributes are being lowered. */
  readonly html: HtmlParseEmission;
  /** Runtime AttrSyntax products produced from the HTML attributes. */
  readonly attributeSyntax: AttributeSyntaxParseEmission;
  /** Attribute classifications that selected binding commands. */
  readonly attributeClassification: AttributeClassificationEmission;
  /** Value-site products that identify command-owned values before command-specific parsing. */
  readonly valueSites: TemplateValueSiteEmission;
  /** Compiler world that supplies binding-command resolver, expression parser, attribute parser, and mapper services. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
  /** Required run-scoped compiler lookup surface. */
  readonly compilerReads: TemplateCompilerReadView;
}

export class BindingCommandLoweringEmission {
  constructor(
    readonly buildInputs: readonly BindingCommandBuildInput[],
    readonly lowerings: readonly BindingCommandLowering[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly attributeSyntaxes: readonly AttributeSyntax[],
    readonly multiBindingSegments: readonly MultiBindingSegment[],
    readonly multiBindingLowerings: readonly MultiBindingLowering[],
    readonly instructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
    readonly openSeams: readonly OpenSeam[],
    readonly attributeOwnerProgression: TemplateCompilerAttributeOwnerProgression,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

interface BindingCommandLoweringIndexes {
  readonly syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  readonly ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
}

class BindingCommandLoweringFrame {
  private readonly records: KernelStoreRecord[];
  private readonly buildInputs: BindingCommandBuildInput[] = [];
  private readonly lowerings: BindingCommandLowering[] = [];
  private readonly issues: TemplateCompilerIssue[] = [];
  private readonly attributeSyntaxes: AttributeSyntax[] = [];
  private readonly multiBindingSegments: MultiBindingSegment[] = [];
  private readonly multiBindingLowerings: MultiBindingLowering[] = [];
  private readonly instructions: TemplateInstruction[] = [];
  private readonly valueSites: TemplateValueSite[] = [];
  private readonly expressionParses: TemplateExpressionParse[] = [];
  private readonly claims: SemanticClaim[] = [];
  private readonly openSeams: OpenSeam[] = [];

  constructor(sourceRecords: readonly KernelStoreRecord[]) {
    this.records = [...sourceRecords];
  }

  recordCommandClassification(result: BindingCommandClassificationLoweringResult): void {
    this.records.push(...result.records);
    this.claims.push(...result.claims);
    this.openSeams.push(...result.openSeams);
    this.buildInputs.push(result.buildInput);
    this.lowerings.push(result.lowering);
    this.issues.push(...result.issues);
    this.instructions.push(...result.instructions);
    this.valueSites.push(...result.valueSites);
    this.expressionParses.push(...result.expressionParses);
  }

  recordMultiBindingSite(result: MultiBindingLoweringResult): void {
    this.records.push(...result.records);
    this.claims.push(...result.claims);
    this.openSeams.push(...result.openSeams);
    this.buildInputs.push(...result.buildInputs);
    this.lowerings.push(...result.commandLowerings);
    this.issues.push(...result.issues);
    this.attributeSyntaxes.push(...result.attributeSyntaxes);
    this.multiBindingSegments.push(...result.segments);
    this.multiBindingLowerings.push(result.lowering);
    this.instructions.push(...result.instructions);
    this.valueSites.push(...result.valueSites);
    this.expressionParses.push(...result.expressionParses);
  }

  recordMaterialization(record: MaterializationRecord): void {
    this.records.push(
      ...this.claims.filter((claim) => !this.records.includes(claim)),
      record,
    );
  }

  materializedProductHandles(): readonly ProductHandle[] {
    return [
      ...this.buildInputs.map((buildInput) => buildInput.productHandle),
      ...this.lowerings.map((lowering) => lowering.productHandle),
      ...this.issues.map((issue) => issue.productHandle),
      ...this.attributeSyntaxes.map((syntax) => syntax.productHandle),
      ...this.multiBindingSegments.map((segment) => segment.productHandle),
      ...this.multiBindingLowerings.map((lowering) => lowering.productHandle),
      ...this.instructions.map((instruction) => instruction.productHandle),
      ...this.valueSites.map((site) => site.productHandle),
      ...this.expressionParses.map((parse) => parse.productHandle),
    ];
  }

  claimHandles(): readonly ClaimHandle[] {
    return this.claims.map((claim) => claim.handle);
  }

  openSeamHandles(): readonly OpenSeam['handle'][] {
    return this.openSeams.map((seam) => seam.handle);
  }

  toEmission(attributeOwnerProgression: TemplateCompilerAttributeOwnerProgression): BindingCommandLoweringEmission {
    return new BindingCommandLoweringEmission(
      this.buildInputs,
      this.lowerings,
      this.issues,
      this.attributeSyntaxes,
      this.multiBindingSegments,
      this.multiBindingLowerings,
      this.instructions,
      this.valueSites,
      this.expressionParses,
      this.openSeams,
      attributeOwnerProgression,
      this.records,
    );
  }
}

class CommandHandlerMatch {
  constructor(
    readonly executable: BindingCommandExecutable,
    readonly handler: BuiltInBindingCommand | null,
  ) {}
}

class OpenLoweringResult {
  constructor(
    readonly result: BindingCommandBuildResult,
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

class BindingCommandClassificationLoweringResult {
  constructor(
    readonly buildInput: BindingCommandBuildInput,
    readonly lowering: BindingCommandLowering,
    readonly issues: readonly TemplateCompilerIssue[],
    readonly instructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

class MultiBindingLoweringResult {
  constructor(
    readonly lowering: MultiBindingLowering,
    readonly segments: readonly MultiBindingSegment[],
    readonly commandLowerings: readonly BindingCommandLowering[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly buildInputs: readonly BindingCommandBuildInput[],
    readonly attributeSyntaxes: readonly AttributeSyntax[],
    readonly instructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

class MultiBindingSegmentLoweringResult {
  constructor(
    readonly segment: MultiBindingSegment,
    readonly commandLowerings: readonly BindingCommandLowering[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly buildInputs: readonly BindingCommandBuildInput[],
    readonly attributeSyntaxes: readonly AttributeSyntax[],
    readonly instructions: readonly TemplateInstruction[],
    readonly directInstructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

class ClosedMultiBindingSite {
  constructor(
    readonly attribute: HtmlAttribute,
    readonly owner: HtmlElementAttributeOwner,
    readonly mapperOwner: TemplateAttributeMapperNode,
    readonly classification: AttributeClassification,
    readonly definition: CustomAttributeDefinition,
    readonly parsedSegments: readonly ParsedMultiBindingSegment[],
    readonly bindables: TemplateAttributeBindablesInfo,
  ) {}
}

class MultiBindingSiteSegmentBatch {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
    readonly openSeams: readonly OpenSeam[],
    readonly buildInputs: readonly BindingCommandBuildInput[],
    readonly commandLowerings: readonly BindingCommandLowering[],
    readonly issues: readonly TemplateCompilerIssue[],
    readonly attributeSyntaxes: readonly AttributeSyntax[],
    readonly segments: readonly MultiBindingSegment[],
    readonly instructions: readonly TemplateInstruction[],
    readonly directInstructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
  ) {}
}

class MaterializedMultiBindingSegment {
  constructor(
    readonly segment: MultiBindingSegment,
    readonly syntax: AttributeSyntax,
    readonly bindable: TemplateBindableReference | null,
    readonly commandMatch: CommandHandlerMatch | null,
    readonly targetSourceAddressHandle: AddressHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly sourceAddressRecord: SourceSpanAddress | null,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class MultiBindingSegmentSelection {
  constructor(
    readonly bindable: TemplateBindableReference | null,
    readonly commandMatch: CommandHandlerMatch | null,
    readonly commandReference: MultiBindingSegment['command'],
  ) {}
}

class MultiBindingSegmentLoweringFrame {
  private readonly commandLowerings: BindingCommandLowering[] = [];
  private readonly issues: TemplateCompilerIssue[] = [];
  private readonly buildInputs: BindingCommandBuildInput[] = [];
  private readonly attributeSyntaxes: AttributeSyntax[] = [];
  private readonly instructions: TemplateInstruction[] = [];
  private readonly directInstructions: TemplateInstruction[] = [];
  private readonly valueSites: TemplateValueSite[] = [];
  private readonly expressionParses: TemplateExpressionParse[] = [];
  private readonly records: KernelStoreRecord[] = [];
  private readonly claims: SemanticClaim[] = [];
  private readonly openSeams: OpenSeam[] = [];

  constructor(readonly segment: MultiBindingSegment) {}

  recordSegment(materialized: MaterializedMultiBindingSegment): void {
    this.records.push(...materialized.records);
    this.claims.push(...materialized.claims);
    this.attributeSyntaxes.push(materialized.syntax);
  }

  recordOpenSeam(openSeam: OpenSeam): void {
    this.records.push(openSeam);
    this.openSeams.push(openSeam);
  }

  recordExpressionPublication(publication: PublishedMultiBindingExpressionParse): void {
    this.records.push(...publication.records);
    this.claims.push(...publication.claims);
    this.valueSites.push(publication.site);
    this.expressionParses.push(publication.parse);
  }

  recordDirectInstruction(instruction: TemplateInstruction): void {
    this.directInstructions.push(instruction);
    this.instructions.push(instruction);
  }

  recordBuildInput(publication: PublishedBindingCommandBuild): void {
    this.buildInputs.push(publication.input);
    this.claims.push(...publication.claims);
    this.records.push(...publication.records);
  }

  recordCommandExecution(result: OpenLoweringResult): void {
    this.records.push(...result.openSeams);
    this.openSeams.push(...result.openSeams);
    this.instructions.push(...result.result.instructions);
    if (result instanceof ExecutedLoweringResult) {
      this.records.push(...result.context.records);
      this.claims.push(...result.context.claims);
      this.valueSites.push(...result.context.sites);
      this.expressionParses.push(...result.context.parses);
    }
  }

  recordCommandLowering(publication: PublishedBindingCommandLowering): void {
    this.records.push(...publication.records);
    this.claims.push(...publication.claims);
    this.commandLowerings.push(publication.lowering);
  }

  recordCommandIssue(publication: TemplateCompilerIssuePublication | null): void {
    if (publication == null) {
      return;
    }
    this.records.push(...publication.records);
    this.issues.push(publication.issue);
  }

  toResult(): MultiBindingSegmentLoweringResult {
    return new MultiBindingSegmentLoweringResult(
      this.segment,
      this.commandLowerings,
      this.issues,
      this.buildInputs,
      this.attributeSyntaxes,
      this.instructions,
      this.directInstructions,
      this.valueSites,
      this.expressionParses,
      this.records,
      this.claims,
      this.openSeams,
    );
  }
}

class CommandParsePublication {
  constructor(
    readonly site: TemplateValueSite,
    readonly parse: TemplateExpressionParse,
    readonly result: ExpressionParseResult,
  ) {}
}

class CommandLoweringExecutionContext implements BindingCommandBuildContext {
  readonly records: KernelStoreRecord[] = [];
  readonly claims: SemanticClaim[] = [];
  readonly sites: TemplateValueSite[] = [];
  readonly parses: TemplateExpressionParse[] = [];
  private readonly valueSitePublisher: TemplateValueSitePublisher;
  private instructionIndex = 0;
  private expressionIndex = 0;

  constructor(
    readonly store: KernelStoreReadView,
    readonly local: string,
    readonly source: BindingCommandLoweringSourceSet,
    readonly compilerWorld: TemplateCompilerWorldEmission,
    readonly compilerReads: TemplateCompilerReadView,
    readonly owner: TemplateAttributeMapperNode,
    readonly syntax: AttributeSyntax,
    readonly classification: AttributeClassification,
    readonly command: BindingCommandExecutable,
    readonly commandReference: BindingCommandLowering['command'],
    readonly bindable: TemplateBindableReference | null,
    readonly expressionParseContext: ExpressionParseContext | null = null,
  ) {
    this.valueSitePublisher = new TemplateValueSitePublisher(store);
  }

  allocateInstruction(
    _kind: TemplateInstructionKind,
    _info: BindingCommandBuildInfo,
    local: string,
  ): BindingCommandInstructionAllocation {
    const key = `${this.local}:instruction:${this.instructionIndex++}:${local}`;
    return new BindingCommandInstructionAllocation(
      this.store.handles.product(key),
      this.store.handles.identity(key),
    );
  }

  parsePropertyExpression(
    expression: string,
    info: BindingCommandBuildInfo,
    sourceSpan: SourceSpan | null,
  ): ProductHandle | null {
    return this.parseExpression(expression, 'IsProperty', info, sourceSpan).parse.productHandle;
  }

  parseFunctionExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): ProductHandle | null {
    return this.parseExpression(expression, 'IsFunction', info, null).parse.productHandle;
  }

  parseIteratorExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): BindingCommandIteratorParse {
    const publication = this.parseExpression(expression, 'IsIterator', info, null);
    const result = publication.result as IteratorParseResult;
    return new BindingCommandIteratorParse(
      publication.parse.productHandle,
      iteratorLocalNames(result),
      iteratorObjectBindingSourceKeys(result),
      iteratorRawTailText(result),
      iteratorTailSpan(result),
    );
  }

  parseAttributeSyntax(
    rawName: string,
    rawValue: string,
    _info: BindingCommandBuildInfo,
  ): BindingCommandTailSyntax | null {
    return BindingCommandTailSyntaxFromExecution(parseAttributeSyntaxInWorld(
      this.compilerReads,
      rawName,
      rawValue,
    ).execution);
  }

  mapAttribute(
    _node: HtmlNodeReference,
    attr: string,
  ): string | null {
    return this.compilerReads.mapAttribute(this.owner, attr);
  }

  isTwoWay(
    _node: HtmlNodeReference,
    attr: string,
  ): boolean | null {
    return this.compilerReads.isTwoWay(this.owner, attr);
  }

  private parseExpression(
    expression: string,
    entryFamily: ExpressionType,
    info: BindingCommandBuildInfo,
    sourceSpan: SourceSpan | null,
  ): CommandParsePublication {
    const index = this.expressionIndex++;
    const siteLocal = `${this.local}:value-site:${index}`;
    const parseLocal = `${this.local}:expression-parse:${index}`;
    const expressionSource = sourceSpan == null
      ? { handle: info.expressionSourceAddressHandle, records: [] }
      : sourceAddressForRuntimeExpressionSpan(
          this.store,
          `${parseLocal}:source`,
          info.expressionSourceAddressHandle,
          sourceSpan,
          SourceSpanRole.Value,
        );
    const publication = this.valueSitePublisher.publish(new TemplateValueSitePublicationRequest(
      siteLocal,
      parseLocal,
      this.compilerReads,
      this.source.provenanceHandle,
      TemplateValueSiteKind.BindingCommandValue,
      expression,
      entryFamily,
      info.node,
      info.attribute,
      this.syntax,
      this.classification,
      this.commandReference,
      this.bindable,
      expressionSource.handle,
      this.classification.identityHandle,
      `${this.command.name}:${entryFamily}`,
      info.buildInputProductHandle,
      (result) => `${this.command.name}:${result.kind}`,
      sourceSpan == null ? this.expressionParseContext : { baseSpan: sourceSpan },
    ));
    if (publication.parse == null || publication.result == null) {
      throw new Error('Binding command expression parsing must publish an expression parse.');
    }
    this.claims.push(...publication.claims);
    this.records.push(...expressionSource.records, ...publication.records);
    const { site, parse, result } = publication;
    this.sites.push(site);
    this.parses.push(parse);
    return new CommandParsePublication(site, parse, result);
  }
}

/** Lowers command-bearing attribute classifications through runtime-shaped binding-command models. */
export class BindingCommandLoweringMaterializer {
  private readonly publisher: BindingCommandLoweringPublisher;
  private readonly commandPublisher: BindingCommandProductPublisher;
  private readonly issuePublisher: TemplateCompilerIssuePublisher;

  constructor(
    /** Hot analysis store that receives binding-command lowering records. */
    readonly store: KernelPublicationContext,
  ) {
    this.publisher = new BindingCommandLoweringPublisher(store);
    this.commandPublisher = new BindingCommandProductPublisher(store);
    this.issuePublisher = new TemplateCompilerIssuePublisher(store);
  }

  lower(input: BindingCommandLoweringRequest): BindingCommandLoweringEmission {
    const emission = this.recordsForLowering(input);
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `binding-command-lowering:${input.localKey}`),
      [
        ...publishProductDetails(TemplateProductDetails.BindingCommandBuildInput, emission.buildInputs),
        ...publishProductDetails(TemplateProductDetails.BindingCommandLowering, emission.lowerings),
        ...publishProductDetails(TemplateProductDetails.CompilerIssue, emission.issues),
        ...publishProductDetails(TemplateProductDetails.AttributeSyntax, emission.attributeSyntaxes),
        ...publishProductDetails(TemplateProductDetails.MultiBindingSegment, emission.multiBindingSegments),
        ...publishProductDetails(TemplateProductDetails.MultiBindingLowering, emission.multiBindingLowerings),
        ...publishProductDetails(TemplateProductDetails.Instruction, emission.instructions),
        ...publishProductDetails(TemplateProductDetails.ValueSite, emission.valueSites),
        ...publishProductDetails(TemplateProductDetails.ExpressionParse, emission.expressionParses),
      ],
    ));
    return emission;
  }

  private recordsForLowering(input: BindingCommandLoweringRequest): BindingCommandLoweringEmission {
    const source = this.publisher.recordsForSource(input);
    const frame = new BindingCommandLoweringFrame(source.records);
    const indexes = loweringIndexes(input);

    const attributeOwnerProgression = this.lowerInProgressiveAttributeOrder(input, source, indexes, frame);
    frame.recordMaterialization(new MaterializationRecord(
      this.store.handles.materialization(`binding-command-lowering:${input.localKey}`),
      input.compilationUnit.identityHandle,
      frame.materializedProductHandles(),
      frame.claimHandles(),
      frame.openSeamHandles(),
    ));

    return frame.toEmission(attributeOwnerProgression);
  }

  private lowerInProgressiveAttributeOrder(
    input: BindingCommandLoweringRequest,
    source: BindingCommandLoweringSourceSet,
    indexes: BindingCommandLoweringIndexes,
    frame: BindingCommandLoweringFrame,
  ): TemplateCompilerAttributeOwnerProgression {
    const progression = new TemplateCompilerAttributeOwnerProgression(input.html);
    const syntaxesByAttribute = new Map(input.attributeSyntax.syntaxes.flatMap((syntax) =>
      syntax.attribute.productHandle == null ? [] : [[syntax.attribute.productHandle, syntax] as const]
    ));
    const classificationsBySyntax = new Map(input.attributeClassification.classifications.map((classification) =>
      [classification.syntaxProductHandle, classification] as const
    ));
    const primarySitesByClassification = new Map(input.valueSites.sites.flatMap((site) =>
      site.classification?.productHandle == null ? [] : [[site.classification.productHandle, site] as const]
    ));
    const parsesBySite = new Map(input.valueSites.parses.map((parse) => [parse.site.productHandle, parse] as const));
    const classificationOrdinals = new Map(input.attributeClassification.classifications.map((classification, ordinal) =>
      [classification, ordinal] as const
    ));
    const valueSiteOrdinals = new Map(input.valueSites.sites.map((site, ordinal) => [site, ordinal] as const));
    const commandResults = new Map<AttributeClassification, BindingCommandClassificationLoweringResult>();
    const multiBindingResults = new Map<TemplateValueSite, MultiBindingLoweringResult>();

    for (const attribute of input.html.attributes) {
      const syntax = syntaxesByAttribute.get(attribute.productHandle) ?? null;
      const classification = syntax == null
        ? null
        : classificationsBySyntax.get(syntax.productHandle) ?? null;
      const primarySite = classification == null
        ? null
        : primarySitesByClassification.get(classification.productHandle) ?? null;
      const parse = primarySite == null ? null : parsesBySite.get(primarySite.productHandle) ?? null;
      const progressionSite = progression.begin(attribute, syntax, classification);
      let commandResult: BindingCommandClassificationLoweringResult | null = null;
      let multiBindingResult: MultiBindingLoweringResult | null = null;
      if (classification?.bindingCommand != null) {
        const ordinal = classificationOrdinals.get(classification)!;
        commandResult = this.lowerBindingCommandClassification(
          `binding-command-lowering:${input.localKey}:${ordinal}`,
          source,
          input.compilerWorld,
          input.compilerReads,
          classification as CommandAttributeClassification,
          syntax,
          attribute,
          progressionSite.owner,
          progressionSite.ownerView ?? progressionSite.owner,
        );
        commandResults.set(classification, commandResult);
      } else if (primarySite?.siteKind === TemplateValueSiteKind.MultiBindingValue) {
        const ordinal = valueSiteOrdinals.get(primarySite)!;
        multiBindingResult = this.lowerMultiBindingSite(
          `multi-binding-lowering:${input.localKey}:${ordinal}`,
          source,
          input.compilerWorld,
          input.compilerReads,
          primarySite,
          indexes.attributesByProduct,
          indexes.ownersByAttributeProduct,
          progressionSite.ownerView ?? progressionSite.owner,
        );
        multiBindingResults.set(primarySite, multiBindingResult);
      }
      const completion = progressionCompletion(
        progressionSite,
        primarySite,
        parse,
        commandResult?.lowering ?? null,
        multiBindingResult?.lowering ?? null,
        input.compilerWorld.templateCompiler.debug,
      );
      progression.complete(progressionSite, completion.disposition, completion.openReason);
    }

    input.attributeClassification.classifications.forEach((classification, ordinal) => {
      if (classification.bindingCommand == null) return;
      let result = commandResults.get(classification) ?? null;
      if (result == null) {
        const syntax = indexes.syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
        const attribute = syntax?.attribute.productHandle == null
          ? null
          : indexes.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
        result = this.lowerBindingCommandClassification(
          `binding-command-lowering:${input.localKey}:${ordinal}`,
          source,
          input.compilerWorld,
          input.compilerReads,
          classification as CommandAttributeClassification,
          syntax,
          attribute,
          null,
          null,
        );
      }
      frame.recordCommandClassification(result);
    });
    input.valueSites.sites.forEach((site, ordinal) => {
      if (site.siteKind !== TemplateValueSiteKind.MultiBindingValue) return;
      const result = multiBindingResults.get(site) ?? this.lowerMultiBindingSite(
        `multi-binding-lowering:${input.localKey}:${ordinal}`,
        source,
        input.compilerWorld,
        input.compilerReads,
        site,
        indexes.attributesByProduct,
        indexes.ownersByAttributeProduct,
        null,
      );
      frame.recordMultiBindingSite(result);
    });
    return progression.finish();
  }

  private lowerBindingCommandClassification(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    owner: HtmlElementAttributeOwner | null,
    mapperOwner: TemplateAttributeMapperNode | null,
  ): BindingCommandClassificationLoweringResult {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];
    const command = compilerReads.bindingCommand(classification.bindingCommand.name);
    const commandMatch = command == null ? null : findCommand(compilerWorld, command.toReference());
    const buildInput = this.commandPublisher.publishBindingCommandBuildInput(
      local,
      source,
      classification,
      syntax,
      attribute,
    );
    records.push(...buildInput.records);
    claims.push(...buildInput.claims);

    const loweringResult = syntax == null
      || attribute == null
      || owner == null
      || mapperOwner == null
      || commandMatch == null
      ? this.openLowering(
          local,
          source,
          syntax?.sourceAddressHandle ?? classification.sourceAddressHandle,
          missingInputSummary(syntax, attribute, owner, commandMatch),
          [OpenSeamReasonKind.BindingTargetProductMissing],
        )
      : this.executeCommand(
        local,
        source,
        compilerWorld,
        compilerReads,
        mapperOwner,
        syntax,
        attribute,
        classification,
        buildInput.input,
        commandMatch,
      );
    records.push(...loweringResult.openSeams);
    openSeams.push(...loweringResult.openSeams);
    const commandLowering = this.commandPublisher.materializeCommandLowering(
      local,
      source,
      classification.bindingCommand,
      buildInput.input,
      loweringResult.result,
    );
    records.push(...commandLowering.records);
    claims.push(...commandLowering.claims);
    const issue = this.publishCommandLoweringIssue(local, source, buildInput.input, loweringResult.result);
    if (issue != null) {
      records.push(...issue.records);
    }
    if (loweringResult instanceof ExecutedLoweringResult) {
      records.push(...loweringResult.context.records);
      claims.push(...loweringResult.context.claims);
      valueSites.push(...loweringResult.context.sites);
      expressionParses.push(...loweringResult.context.parses);
    }
    return new BindingCommandClassificationLoweringResult(
      buildInput.input,
      commandLowering.lowering,
      issue == null ? [] : [issue.issue],
      loweringResult.result.instructions,
      valueSites,
      expressionParses,
      records,
      claims,
      openSeams,
    );
  }

  private lowerMultiBindingSite(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>,
    mapperOwner: TemplateAttributeMapperNode | null,
  ): MultiBindingLoweringResult {
    const closed = this.closeMultiBindingSite(
      local,
      source,
      compilerWorld,
      compilerReads,
      site,
      attributesByProduct,
      ownersByAttributeProduct,
      mapperOwner,
    );
    const batch = closed instanceof ClosedMultiBindingSite
      ? this.lowerMultiBindingSiteSegments(local, source, compilerWorld, compilerReads, site, closed)
      : this.openMultiBindingSiteBatch(closed);
    const state = loweringStateFor(batch.openSeams, batch.commandLowerings, batch.expressionParses, batch.issues);
    const lowering = this.createMultiBindingLowering(local, site, state, batch);
    const loweringClaims = this.publisher.claimsForMultiBindingLowering(local, source, site, lowering, batch.instructions);
    return new MultiBindingLoweringResult(
      lowering,
      batch.segments,
      batch.commandLowerings,
      batch.issues,
      batch.buildInputs,
      batch.attributeSyntaxes,
      batch.instructions,
      batch.valueSites,
      batch.expressionParses,
      [
        ...batch.records,
        ...this.publisher.publishMultiBindingLoweringRecords(local, source, site, lowering, batch.directInstructions, loweringClaims),
      ],
      [...batch.claims, ...loweringClaims],
      batch.openSeams,
    );
  }

  private closeMultiBindingSite(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>,
    mapperOwner: TemplateAttributeMapperNode | null,
  ): ClosedMultiBindingSite | OpenSeam {
    const attribute = site.attribute?.productHandle == null
      ? null
      : attributesByProduct.get(site.attribute.productHandle) ?? null;
    const owner = site.attribute?.productHandle == null
      ? null
      : ownersByAttributeProduct.get(site.attribute.productHandle) ?? null;
    const classification = site.classification;
    const currentDefinition = compilerReads.currentDefinition(classification?.resource ?? null);
    const definition = currentDefinition instanceof CustomAttributeDefinition ? currentDefinition : null;
    const parsedSegments = parseInlineMultiBindingSegments(site.rawValue);

    if (attribute == null || owner == null || mapperOwner == null || classification == null || definition == null) {
      return this.publisher.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        'Inline multi-binding lowering could not close over its authored attribute, owner element, classification, and custom-attribute definition.',
        [OpenSeamReasonKind.BindingTargetProductMissing],
        KernelVocabulary.Instruction.OpenInstruction.key,
      );
    }
    if (parsedSegments.length === 0) {
      return this.publisher.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        `Inline multi-binding value for '${classification.resource?.name ?? attribute.rawName}' did not contain a closed segment.`,
        [OpenSeamReasonKind.BindingExpressionOpen],
        KernelVocabulary.Instruction.OpenInstruction.key,
      );
    }
    return new ClosedMultiBindingSite(
      attribute,
      owner,
      mapperOwner,
      classification,
      definition,
      parsedSegments,
      compilerReads.bindables(definition),
    );
  }

  private openMultiBindingSiteBatch(openSeam: OpenSeam): MultiBindingSiteSegmentBatch {
    return new MultiBindingSiteSegmentBatch(
      [openSeam],
      [],
      [openSeam],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    );
  }

  private lowerMultiBindingSiteSegments(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    closed: ClosedMultiBindingSite,
  ): MultiBindingSiteSegmentBatch {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const buildInputs: BindingCommandBuildInput[] = [];
    const commandLowerings: BindingCommandLowering[] = [];
    const issues: TemplateCompilerIssue[] = [];
    const attributeSyntaxes: AttributeSyntax[] = [];
    const segments: MultiBindingSegment[] = [];
    const instructions: TemplateInstruction[] = [];
    const directInstructions: TemplateInstruction[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];

    for (const parsed of closed.parsedSegments) {
      const segmentLocal = `${local}:segment:${parsed.segmentIndex}`;
      const result = this.lowerMultiBindingSegment(
        segmentLocal,
        source,
        compilerWorld,
        compilerReads,
        site,
        closed.attribute,
        closed.owner,
        closed.mapperOwner,
        closed.classification,
        closed.definition,
        parsed,
        closed.bindables,
      );
      records.push(...result.records);
      claims.push(...result.claims);
      openSeams.push(...result.openSeams);
      buildInputs.push(...result.buildInputs);
      commandLowerings.push(...result.commandLowerings);
      issues.push(...result.issues);
      attributeSyntaxes.push(...result.attributeSyntaxes);
      segments.push(result.segment);
      instructions.push(...result.instructions);
      directInstructions.push(...result.directInstructions);
      valueSites.push(...result.valueSites);
      expressionParses.push(...result.expressionParses);
    }

    return new MultiBindingSiteSegmentBatch(
      records,
      claims,
      openSeams,
      buildInputs,
      commandLowerings,
      issues,
      attributeSyntaxes,
      segments,
      instructions,
      directInstructions,
      valueSites,
      expressionParses,
    );
  }

  private createMultiBindingLowering(
    local: string,
    site: TemplateValueSite,
    state: BindingCommandLoweringState,
    batch: MultiBindingSiteSegmentBatch,
  ): MultiBindingLowering {
    return new MultiBindingLowering(
      this.store.handles.product(`${local}:lowering`),
      this.store.handles.identity(`${local}:lowering`),
      site.toReference(),
      state,
      batch.segments.map((segment) => segment.productHandle),
      batch.instructions.map((instruction) => instruction.productHandle),
      site.sourceAddressHandle,
      [],
    );
  }

  private publishCommandLoweringIssue(
    local: string,
    source: BindingCommandLoweringSourceSet,
    buildInput: BindingCommandBuildInput,
    result: BindingCommandBuildResult,
  ) {
    if (result.state !== BindingCommandLoweringState.Invalid || result.message == null) {
      return null;
    }
    return this.issuePublisher.publish(
      `${local}:issue`,
      buildInput.identityHandle,
      source.provenanceHandle,
      TemplateCompilerIssuePhase.BindingCommandLowering,
      result.issueKind ?? TemplateCompilerIssueKind.BindingCommandBuildInvalid,
      result.message,
      result.frameworkErrorCode,
      buildInput.sourceAddressHandle,
    );
  }

  private lowerMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    mapperOwner: TemplateAttributeMapperNode,
    classification: AttributeClassification,
    definition: CustomAttributeDefinition,
    parsed: ParsedMultiBindingSegment,
    bindables: TemplateAttributeBindablesInfo,
  ): MultiBindingSegmentLoweringResult {
    const materializedSegment = this.materializeMultiBindingSegment(
      local,
      source,
      compilerWorld,
      compilerReads,
      site,
      attribute,
      parsed,
      bindables,
    );
    const frame = new MultiBindingSegmentLoweringFrame(materializedSegment.segment);
    frame.recordSegment(materializedSegment);

    if (materializedSegment.bindable == null) {
      this.recordInvalidMultiBindingSegment(local, source, definition, materializedSegment, frame);
    } else if (materializedSegment.commandMatch == null) {
      this.lowerPlainMultiBindingSegment(
        local,
        source,
        compilerReads,
        site,
        attribute,
        owner,
        parsed,
        materializedSegment,
        materializedSegment.bindable,
        frame,
      );
    } else {
      this.lowerCommandedMultiBindingSegment(
        local,
        source,
        compilerWorld,
        compilerReads,
        attribute,
        owner,
        mapperOwner,
        classification,
        materializedSegment,
        materializedSegment.bindable,
        materializedSegment.commandMatch,
        frame,
      );
    }

    return frame.toResult();
  }

  private recordInvalidMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    definition: CustomAttributeDefinition,
    materializedSegment: MaterializedMultiBindingSegment,
    frame: MultiBindingSegmentLoweringFrame,
  ): void {
    frame.recordCommandIssue(this.issuePublisher.publish(
      `${local}:issue`,
      materializedSegment.segment.identityHandle,
      source.provenanceHandle,
      TemplateCompilerIssuePhase.BindingCommandLowering,
      TemplateCompilerIssueKind.BindingToNonBindable,
      `Template compilation error in custom attribute "${definition.name}": property "${materializedSegment.syntax.target}" is not bindable.`,
      TemplateCompilerFrameworkErrorCode.CompilerBindingToNonBindable,
      materializedSegment.targetSourceAddressHandle ?? materializedSegment.sourceAddressHandle,
    ));
  }

  private lowerPlainMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    parsed: ParsedMultiBindingSegment,
    materializedSegment: MaterializedMultiBindingSegment,
    bindable: TemplateBindableReference,
    frame: MultiBindingSegmentLoweringFrame,
  ): void {
    const publication = this.publisher.publishMultiBindingExpressionParse(
      `${local}:interpolation`,
      source,
      compilerReads,
      site,
      materializedSegment.segment,
      materializedSegment.syntax,
      bindable,
      parsed.rawValue,
      'Interpolation',
      materializedSegment.sourceAddressHandle,
      materializedSegment.sourceAddressRecord,
    );
    frame.recordExpressionPublication(publication);
    frame.recordDirectInstruction(this.publisher.createMultiBindingValueInstruction(
      `${local}:instruction`,
      owner,
      attribute,
      bindable.definition.name,
      parsed.rawValue,
      publication.parse,
      materializedSegment.sourceAddressHandle,
    ));
  }

  private lowerCommandedMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    mapperOwner: TemplateAttributeMapperNode,
    classification: AttributeClassification,
    materializedSegment: MaterializedMultiBindingSegment,
    bindable: TemplateBindableReference,
    commandMatch: CommandHandlerMatch,
    frame: MultiBindingSegmentLoweringFrame,
  ): void {
    const closedCommandReference = commandMatch.executable.toReference();
    const buildInput = this.publisher.publishMultiBindingCommandBuildInput(
      local,
      source,
      owner,
      attribute,
      materializedSegment.syntax,
      materializedSegment.segment,
      bindable,
    );
    frame.recordBuildInput(buildInput);
    const loweringResult = this.executeCommand(
      local,
      source,
      compilerWorld,
      compilerReads,
      mapperOwner,
      materializedSegment.syntax,
      attribute,
      classification,
      buildInput.input,
      commandMatch,
      bindable,
      closedCommandReference,
      materializedSegment.sourceAddressHandle,
      runtimeExpressionParseContextForSourceSpanAddress(this.store, materializedSegment.sourceAddressRecord) ?? null,
    );
    frame.recordCommandExecution(loweringResult);
    frame.recordCommandIssue(this.publishCommandLoweringIssue(local, source, buildInput.input, loweringResult.result));
    frame.recordCommandLowering(this.commandPublisher.materializeCommandLowering(
      `${local}:command`,
      source,
      closedCommandReference,
      buildInput.input,
      loweringResult.result,
    ));
  }

  private materializeMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    parsed: ParsedMultiBindingSegment,
    bindables: TemplateAttributeBindablesInfo,
  ): MaterializedMultiBindingSegment {
    const syntaxAddress = this.publisher.segmentSyntaxSourceAddress(local, site.sourceAddressHandle, parsed);
    const nameAddress = this.publisher.segmentNameSourceAddress(local, site.sourceAddressHandle, parsed);
    const valueAddress = this.publisher.segmentValueSourceAddress(local, site.sourceAddressHandle, parsed);
    const syntax = this.publisher.publishMultiBindingAttributeSyntax(
      local,
      site,
      source,
      attribute,
      parseAttributeSyntaxInWorld(compilerReads, parsed.rawName, parsed.rawValue),
      syntaxAddress.handle,
      nameAddress.record ?? nameAddress.handle,
    );
    const selection = this.selectMultiBindingSegment(
      compilerWorld,
      compilerReads,
      syntax.syntax,
      bindables,
    );
    const segment = this.publisher.publishMultiBindingSegment(
      local,
      source,
      site,
      attribute,
      syntax.syntax,
      parsed,
      selection,
      syntax.syntax.targetSourceAddressHandle,
      valueAddress.handle,
    );

    return new MaterializedMultiBindingSegment(
      segment.segment,
      syntax.syntax,
      selection.bindable,
      selection.commandMatch,
      syntax.syntax.targetSourceAddressHandle,
      valueAddress.handle,
      valueAddress.record,
      [
        ...(syntaxAddress.record == null ? [] : [syntaxAddress.record]),
        ...(nameAddress.record == null ? [] : [nameAddress.record]),
        ...(valueAddress.record == null ? [] : [valueAddress.record]),
        ...syntax.records,
        ...segment.records,
      ],
      [
        ...syntax.claims,
        ...segment.claims,
      ],
    );
  }

  private selectMultiBindingSegment(
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    syntax: AttributeSyntax,
    bindables: TemplateAttributeBindablesInfo,
  ): MultiBindingSegmentSelection {
    const bindable = bindables.attr(syntax.target);
    const command = syntax.command == null
      ? null
      : compilerReads.bindingCommand(syntax.command);
    const commandMatch = command == null
      ? null
      : findCommand(compilerWorld, command.toReference());
    return new MultiBindingSegmentSelection(
      bindable,
      commandMatch,
      commandMatch?.executable.toReference() ?? null,
    );
  }

  private executeCommand(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    mapperOwner: TemplateAttributeMapperNode,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    classification: AttributeClassification,
    buildInput: BindingCommandBuildInput,
    commandMatch: CommandHandlerMatch,
    bindable: TemplateBindableReference | null = classification.bindable,
    commandReference: BindingCommandLowering['command'] = classification.bindingCommand ?? commandMatch.executable.toReference(),
    expressionSourceAddressHandle: AddressHandle | null = attribute.valueAddressHandle ?? buildInput.sourceAddressHandle,
    expressionParseContext: ExpressionParseContext | null = null,
  ): OpenLoweringResult {
    const executable = commandMatch.executable;
    if (executable.executionKind !== BindingCommandExecutionKind.BuiltIn || commandMatch.handler == null) {
      return this.openLowering(
        local,
        source,
        syntax.sourceAddressHandle,
        `Binding command '${executable.name}' reached an executable body this substrate does not model yet.`,
        [OpenSeamReasonKind.BindingCommandExecutableBodyOpen],
        KernelVocabulary.Compiler.OpenExecutableBody.key,
      );
    }
    const context = new CommandLoweringExecutionContext(
      this.store,
      local,
      source,
      compilerWorld,
      compilerReads,
      mapperOwner,
      syntax,
      classification,
      executable,
      commandReference,
      bindable,
      expressionParseContext,
    );
    const buildInfo = new BindingCommandBuildInfo(
      classification.ownerNode,
      attribute.toReference(),
      syntax,
      bindable?.definition ?? null,
      buildInput.productHandle,
      buildInput.bindableOwnerProductHandle,
      buildInput.definitionProductHandle,
      buildInput.sourceAddressHandle,
      expressionSourceAddressHandle,
    );
    let result: BindingCommandBuildResult;
    try {
      result = commandMatch.handler.build(buildInfo, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.openLowering(
        local,
        source,
        syntax.sourceAddressHandle,
        message,
        [OpenSeamReasonKind.BindingCommandExecutableBodyOpen],
        KernelVocabulary.Instruction.OpenInstruction.key,
        BindingCommandLoweringState.Invalid,
      );
    }
    const seams = result.state === BindingCommandLoweringState.Open
      ? [
        this.publisher.openSeam(
          local,
          source,
          syntax.sourceAddressHandle,
          result.message ?? `Binding command '${executable.name}' did not produce closed instructions.`,
          [OpenSeamReasonKind.BindingCommandExecutableBodyOpen],
          KernelVocabulary.Compiler.OpenExecutableBody.key,
        ),
      ]
      : [];
    return new ExecutedLoweringResult(result, seams, context);
  }

  private openLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    addressHandle: AddressHandle | null,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Compiler.OpenExecutableBody.key,
    state = BindingCommandLoweringState.Open,
  ): OpenLoweringResult {
    return new OpenLoweringResult(
      new BindingCommandBuildResult(state, [], summary),
      [this.publisher.openSeam(local, source, addressHandle, summary, reasonKinds, seamKindKey)],
    );
  }

}

class ExecutedLoweringResult extends OpenLoweringResult {
  constructor(
    result: BindingCommandBuildResult,
    openSeams: readonly OpenSeam[],
    readonly context: CommandLoweringExecutionContext,
  ) {
    super(result, openSeams);
  }
}

function loweringIndexes(input: BindingCommandLoweringRequest): BindingCommandLoweringIndexes {
  return {
    syntaxByProduct: new Map(input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax])),
    attributesByProduct: new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute])),
    ownersByAttributeProduct: htmlElementAttributeOwnersByAttributeProduct(input.html.nodes, input.html.attributes),
  };
}

function findCommand(
  world: TemplateCompilerWorldEmission,
  command: AttributeClassification['bindingCommand'],
): CommandHandlerMatch | null {
  if (command == null) {
    return null;
  }
  const emission = world.bindingCommands.find((candidate) =>
    command.productHandle != null
      ? candidate.executable.productHandle === command.productHandle
      : candidate.executable.name === command.name || candidate.executable.aliases.includes(command.name)
  ) ?? null;
  return emission == null
    ? null
    : new CommandHandlerMatch(emission.executable, emission.handler);
}

function parseAttributeSyntaxInWorld(
  compilerReads: TemplateCompilerReadView,
  rawName: string,
  rawValue: string,
) {
  return compilerReads.parseAttribute(rawName, rawValue);
}

function BindingCommandTailSyntaxFromExecution(
  execution: AttributePatternExecutionResult,
): BindingCommandTailSyntax {
  return new BindingCommandTailSyntax(
    execution.rawName,
    execution.rawValue,
    execution.target,
    execution.command,
    execution.parts,
  );
}

function iteratorLocalNames(result: IteratorParseResult): readonly string[] {
  if (result.kind !== ExpressionParseResultKind.IteratorSuccess) {
    return [];
  }
  if (result.ast.declaration.$kind === 'ObjectBindingPattern') {
    const admission = admitRepeatObjectBindingPattern(result.ast.declaration);
    return admission.admitted ? admission.localNames : [];
  }
  return bindingNames(result.ast.declaration);
}

function iteratorObjectBindingSourceKeys(result: IteratorParseResult): readonly (string | number)[] {
  if (
    result.kind !== ExpressionParseResultKind.IteratorSuccess
    || result.ast.declaration.$kind !== 'ObjectBindingPattern'
  ) {
    return [];
  }
  const admission = admitRepeatObjectBindingPattern(result.ast.declaration);
  return admission.admitted ? admission.sourceKeys : [];
}

function bindingNames(pattern: BindingIdentifierOrPattern): readonly string[] {
  const names: string[] = [];
  visitExpressionAstNodes(pattern, (expression) => {
    if (expression.$kind === 'BindingIdentifier') {
      names.push(expression.name.name);
    }
  });
  return names;
}

function iteratorRawTailText(result: IteratorParseResult): string | null {
  switch (result.kind) {
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return result.trailingSplit?.rawTailText ?? null;
    case ExpressionParseResultKind.CompleteInputParseError:
      return null;
  }
}

function iteratorTailSpan(result: IteratorParseResult): SourceSpan | null {
  switch (result.kind) {
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return result.trailingSplit?.tailSpan ?? null;
    case ExpressionParseResultKind.CompleteInputParseError:
      return null;
  }
}

function loweringStateFor(
  openSeams: readonly OpenSeam[],
  commandLowerings: readonly BindingCommandLowering[],
  parses: readonly TemplateExpressionParse[],
  issues: readonly TemplateCompilerIssue[] = [],
): BindingCommandLoweringState {
  if (
    issues.length > 0 ||
    commandLowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Invalid)
    || parses.some((parse) => parse.state === TemplateExpressionParseState.Error)
  ) {
    return BindingCommandLoweringState.Invalid;
  }
  if (
    commandLowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Open)
  ) {
    return BindingCommandLoweringState.Open;
  }
  if (
    commandLowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Partial)
    || parses.some((parse) => parse.state !== TemplateExpressionParseState.Complete)
    || openSeams.length > 0
  ) {
    return BindingCommandLoweringState.Partial;
  }
  return BindingCommandLoweringState.Complete;
}

class AttributeProgressionCompletion {
  constructor(
    readonly disposition: TemplateCompilerAttributeOwnerProgressionDisposition,
    readonly openReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null,
  ) {}
}

function progressionCompletion(
  site: TemplateCompilerAttributeOwnerProgressionSite,
  primaryValueSite: TemplateValueSite | null,
  primaryParse: TemplateExpressionParse | null,
  commandLowering: BindingCommandLowering | null,
  multiBindingLowering: MultiBindingLowering | null,
  debug: boolean,
): AttributeProgressionCompletion {
  if (site.state === TemplateCompilerAttributeOwnerProgressionState.Open) {
    return new AttributeProgressionCompletion(
      TemplateCompilerAttributeOwnerProgressionDisposition.Open,
      site.openReason ?? progressionOpen(site, 'A prior attribute left owner state open.'),
    );
  }
  const classification = site.classification;
  if (
    site.syntax == null
    || classification == null
    || classification.classificationKind === AttributeClassificationKind.Open
  ) {
    return new AttributeProgressionCompletion(
      TemplateCompilerAttributeOwnerProgressionDisposition.Open,
      progressionOpen(site, 'Attribute syntax or classification is open.'),
    );
  }
  if (
    classification.classificationKind === AttributeClassificationKind.Captured
    || classification.classificationKind === AttributeClassificationKind.CompilerControl
  ) {
    return progressionSuccess(debug, true);
  }
  if (classification.bindingCommand != null) {
    return commandLowering?.state === BindingCommandLoweringState.Complete
      ? progressionSuccess(debug, true)
      : new AttributeProgressionCompletion(
          TemplateCompilerAttributeOwnerProgressionDisposition.Open,
          progressionOpen(site, 'Binding-command execution did not close exactly.'),
        );
  }
  if (primaryValueSite?.siteKind === TemplateValueSiteKind.MultiBindingValue) {
    return multiBindingLowering?.state === BindingCommandLoweringState.Complete
      ? progressionSuccess(debug, true)
      : new AttributeProgressionCompletion(
          TemplateCompilerAttributeOwnerProgressionDisposition.Open,
          progressionOpen(site, 'Inline multi-binding execution did not close exactly.'),
        );
  }

  switch (classification.classificationKind) {
    case AttributeClassificationKind.Plain:
      if (primaryValueSite == null) return progressionSuccess(debug, false);
      if (primaryParse?.state !== TemplateExpressionParseState.Complete) {
        return new AttributeProgressionCompletion(
          TemplateCompilerAttributeOwnerProgressionDisposition.Open,
          progressionOpen(site, 'Plain-attribute interpolation parsing did not close exactly.'),
        );
      }
      return progressionSuccess(
        debug,
        primaryParse.resultKind !== ExpressionParseResultKind.InterpolationAbsent,
      );
    case AttributeClassificationKind.Bindable:
    case AttributeClassificationKind.CustomAttribute:
    case AttributeClassificationKind.TemplateController:
    case AttributeClassificationKind.Spread:
      if (
        primaryValueSite?.entryFamily != null
        && primaryParse?.state !== TemplateExpressionParseState.Complete
      ) {
        return new AttributeProgressionCompletion(
          TemplateCompilerAttributeOwnerProgressionDisposition.Open,
          progressionOpen(site, 'Attribute value parsing did not close exactly.'),
        );
      }
      return progressionSuccess(debug, true);
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.Ref:
      return new AttributeProgressionCompletion(
        TemplateCompilerAttributeOwnerProgressionDisposition.Open,
        progressionOpen(site, 'Attribute execution did not retain an exact lowering.'),
      );
  }
}

function progressionSuccess(debug: boolean, removed: boolean): AttributeProgressionCompletion {
  return new AttributeProgressionCompletion(
    !debug && removed
      ? TemplateCompilerAttributeOwnerProgressionDisposition.Removed
      : TemplateCompilerAttributeOwnerProgressionDisposition.Retained,
    null,
  );
}

function progressionOpen(
  site: TemplateCompilerAttributeOwnerProgressionSite,
  summary: string,
): TemplateCompilerAttributeOwnerProgressionOpenReason {
  return new TemplateCompilerAttributeOwnerProgressionOpenReason(
    TemplateCompilerAttributeOwnerProgressionOpenReasonKind.CurrentSiteOpen,
    site.attribute.productHandle,
    summary,
  );
}

function missingInputSummary(
  syntax: AttributeSyntax | null,
  attribute: HtmlAttribute | null,
  owner: HtmlElementAttributeOwner | null,
  command: CommandHandlerMatch | null,
): string {
  if (syntax == null) {
    return 'Binding-command lowering could not find the AttrSyntax product for the selected classification.';
  }
  if (attribute == null) {
    return 'Binding-command lowering could not find the authored HTML attribute for the selected AttrSyntax.';
  }
  if (owner == null) {
    return 'Binding-command lowering could not find the owner element for the command-bearing attribute.';
  }
  if (command == null) {
    return `Binding-command lowering could not resolve command '${syntax.command ?? '(unknown)'}'.`;
  }
  return 'Binding-command lowering could not close its required inputs.';
}
