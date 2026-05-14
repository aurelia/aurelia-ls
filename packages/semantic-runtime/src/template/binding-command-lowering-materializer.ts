import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
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
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type {
  BindingIdentifierOrPattern,
  ExpressionType,
} from '../expression/ast.js';
import type {
  ExpressionParseResult,
  IteratorParseResult,
} from '../expression/parse-result-algebra.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import {
  AttributeClassification,
  AttributePatternExecutionResult,
  AttributeSyntax,
} from './attribute-syntax.js';
import type {
  BindingCommandBuildContext,
} from './binding-command-execution.js';
import {
  BindingCommandBuildInfo,
  BindingCommandBuildInput,
  BindingCommandBuildResult,
  BindingCommandExecutable,
  BindingCommandExecutionKind,
  BindingCommandInstructionAllocation,
  BindingCommandIteratorParse,
  BindingCommandLowering,
  BindingCommandLoweringState,
  BindingCommandTailSyntax,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import {
  BindingCommandProductPublisher,
  BindingCommandLoweringPublisher,
  BindingCommandLoweringSourceSet,
  type CommandAttributeClassification,
  type PublishedBindingCommandBuild,
  PublishedBindingCommandLowering,
  type PublishedMultiBindingExpressionParse,
} from './binding-command-lowering-publication.js';
import {
  TemplateCompilerIssue,
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
import { BuiltInAttributeParserExecutionHost } from './attribute-parser-execution-host.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type {
  TemplateAttributeBindablesInfo,
  TemplateExpressionParserService,
} from './compiler-world.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  TemplateExpressionParse,
  TemplateExpressionParseState,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import {
  TemplateValueSitePublicationRequest,
  TemplateValueSitePublisher,
} from './value-site-publication.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  HtmlAttribute,
  HtmlElementAttributeOwner,
  htmlElementAttributeOwnersByAttributeProduct,
} from './html-ir.js';
import {
  ParsedMultiBindingSegment,
  parseInlineMultiBindingSegments,
} from './multi-binding-segments.js';
import type {
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  TemplateInstructionKind,
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
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

interface BindingCommandLoweringIndexes {
  readonly syntaxByProduct: ReadonlyMap<ProductHandle, AttributeSyntax>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
  readonly ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
  readonly valueSiteByClassificationProduct: ReadonlyMap<ProductHandle, TemplateValueSite>;
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

  toEmission(): BindingCommandLoweringEmission {
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
    readonly sourceAddressHandle: AddressHandle | null,
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
    readonly store: KernelStore,
    readonly local: string,
    readonly source: BindingCommandLoweringSourceSet,
    readonly compilerWorld: TemplateCompilerWorldEmission,
    readonly owner: HtmlElementAttributeOwner,
    readonly syntax: AttributeSyntax,
    readonly classification: AttributeClassification,
    readonly command: BindingCommandExecutable,
    readonly commandReference: BindingCommandLowering['command'],
    readonly bindable: TemplateBindableReference | null,
    readonly parser: TemplateExpressionParserService,
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
  ): ProductHandle | null {
    return this.parseExpression(expression, 'IsProperty', info).parse.productHandle;
  }

  parseFunctionExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): ProductHandle | null {
    return this.parseExpression(expression, 'IsFunction', info).parse.productHandle;
  }

  parseIteratorExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): BindingCommandIteratorParse {
    const publication = this.parseExpression(expression, 'IsIterator', info);
    const result = publication.result as IteratorParseResult;
    return new BindingCommandIteratorParse(
      publication.parse.productHandle,
      iteratorLocalNames(result),
      iteratorRawTailText(result),
    );
  }

  parseAttributeSyntax(
    rawName: string,
    rawValue: string,
    _info: BindingCommandBuildInfo,
  ): BindingCommandTailSyntax | null {
    return BindingCommandTailSyntaxFromExecution(parseAttributeSyntaxInWorld(
      this.compilerWorld,
      rawName,
      rawValue,
    ).execution);
  }

  mapAttribute(
    _node: HtmlNodeReference,
    attr: string,
  ): string | null {
    return this.compilerWorld.attributeMapper.map(this.owner, attr);
  }

  isTwoWay(
    _node: HtmlNodeReference,
    attr: string,
  ): boolean {
    return this.compilerWorld.attributeMapper.isTwoWay(this.owner, attr);
  }

  private parseExpression(
    expression: string,
    entryFamily: ExpressionType,
    info: BindingCommandBuildInfo,
  ): CommandParsePublication {
    const index = this.expressionIndex++;
    const siteLocal = `${this.local}:value-site:${index}`;
    const parseLocal = `${this.local}:expression-parse:${index}`;
    const addressHandle = info.expressionSourceAddressHandle;
    const publication = this.valueSitePublisher.publish(new TemplateValueSitePublicationRequest(
      siteLocal,
      parseLocal,
      this.parser,
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
      addressHandle,
      this.classification.identityHandle,
      `${this.command.name}:${entryFamily}`,
      info.buildInputProductHandle,
      (result) => `${this.command.name}:${result.kind}`,
    ));
    if (publication.parse == null || publication.result == null) {
      throw new Error('Binding command expression parsing must publish an expression parse.');
    }
    this.claims.push(...publication.claims);
    this.records.push(...publication.records);
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
    readonly store: KernelStore,
  ) {
    this.publisher = new BindingCommandLoweringPublisher(store);
    this.commandPublisher = new BindingCommandProductPublisher(store);
    this.issuePublisher = new TemplateCompilerIssuePublisher(store);
  }

  lower(input: BindingCommandLoweringRequest): BindingCommandLoweringEmission {
    const emission = this.recordsForLowering(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-command-lowering:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: BindingCommandLoweringEmission): void {
    for (const buildInput of emission.buildInputs) {
      this.store.productDetails.add(TemplateProductDetails.BindingCommandBuildInput, buildInput.productHandle, buildInput);
    }
    for (const lowering of emission.lowerings) {
      this.store.productDetails.add(TemplateProductDetails.BindingCommandLowering, lowering.productHandle, lowering);
    }
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.CompilerIssue, issue.productHandle, issue);
    }
    for (const syntax of emission.attributeSyntaxes) {
      this.store.productDetails.add(TemplateProductDetails.AttributeSyntax, syntax.productHandle, syntax);
    }
    for (const segment of emission.multiBindingSegments) {
      this.store.productDetails.add(TemplateProductDetails.MultiBindingSegment, segment.productHandle, segment);
    }
    for (const lowering of emission.multiBindingLowerings) {
      this.store.productDetails.add(TemplateProductDetails.MultiBindingLowering, lowering.productHandle, lowering);
    }
    for (const instruction of emission.instructions) {
      this.store.productDetails.add(TemplateProductDetails.Instruction, instruction.productHandle, instruction);
    }
    for (const site of emission.valueSites) {
      this.store.productDetails.add(TemplateProductDetails.ValueSite, site.productHandle, site);
    }
    for (const parse of emission.expressionParses) {
      this.store.productDetails.add(TemplateProductDetails.ExpressionParse, parse.productHandle, parse);
    }
  }

  private recordsForLowering(input: BindingCommandLoweringRequest): BindingCommandLoweringEmission {
    const source = this.publisher.recordsForSource(input);
    const frame = new BindingCommandLoweringFrame(source.records);
    const indexes = loweringIndexes(input);

    this.lowerBindingCommandClassifications(input, source, indexes, frame);
    this.lowerMultiBindingValueSites(input, source, indexes, frame);
    frame.recordMaterialization(new MaterializationRecord(
      this.store.handles.materialization(`binding-command-lowering:${input.localKey}`),
      input.compilationUnit.identityHandle,
      frame.materializedProductHandles(),
      frame.claimHandles(),
      frame.openSeamHandles(),
    ));

    return frame.toEmission();
  }

  private lowerBindingCommandClassifications(
    input: BindingCommandLoweringRequest,
    source: BindingCommandLoweringSourceSet,
    indexes: BindingCommandLoweringIndexes,
    frame: BindingCommandLoweringFrame,
  ): void {
    input.attributeClassification.classifications.forEach((classification, index) => {
      if (classification.bindingCommand == null) {
        return;
      }
      const syntax = indexes.syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const attribute = syntax?.attribute.productHandle == null
        ? null
        : indexes.attributesByProduct.get(syntax.attribute.productHandle) ?? null;
      const owner = syntax?.attribute.productHandle == null
        ? null
        : indexes.ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
      const local = `binding-command-lowering:${input.localKey}:${index}`;
      const expressionSite = indexes.valueSiteByClassificationProduct.get(classification.productHandle) ?? null;
      frame.recordCommandClassification(this.lowerBindingCommandClassification(
        local,
        source,
        input.compilerWorld,
        classification as CommandAttributeClassification,
        syntax,
        attribute,
        owner,
        expressionSite,
      ));
    });
  }

  private lowerMultiBindingValueSites(
    input: BindingCommandLoweringRequest,
    source: BindingCommandLoweringSourceSet,
    indexes: BindingCommandLoweringIndexes,
    frame: BindingCommandLoweringFrame,
  ): void {
    input.valueSites.sites.forEach((site, index) => {
      if (site.siteKind !== TemplateValueSiteKind.MultiBindingValue) {
        return;
      }
      frame.recordMultiBindingSite(this.lowerMultiBindingSite(
        `multi-binding-lowering:${input.localKey}:${index}`,
        source,
        input.compilerWorld,
        site,
        indexes.attributesByProduct,
        indexes.ownersByAttributeProduct,
      ));
    });
  }

  private lowerBindingCommandClassification(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    owner: HtmlElementAttributeOwner | null,
    expressionSite: TemplateValueSite | null,
  ): BindingCommandClassificationLoweringResult {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];
    const commandMatch = findCommand(compilerWorld, classification.bindingCommand);
    const buildInput = this.commandPublisher.publishBindingCommandBuildInput(
      local,
      source,
      classification,
      syntax,
      attribute,
      expressionSite,
    );
    records.push(...buildInput.records);
    claims.push(...buildInput.claims);

    const loweringResult = syntax == null || attribute == null || owner == null || commandMatch == null
      ? this.openLowering(local, source, syntax?.sourceAddressHandle ?? classification.sourceAddressHandle, missingInputSummary(syntax, attribute, owner, commandMatch))
      : this.executeCommand(local, source, compilerWorld, owner, syntax, attribute, classification, buildInput.input, commandMatch);
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
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>,
  ): MultiBindingLoweringResult {
    const closed = this.closeMultiBindingSite(
      local,
      source,
      compilerWorld,
      site,
      attributesByProduct,
      ownersByAttributeProduct,
    );
    const batch = closed instanceof ClosedMultiBindingSite
      ? this.lowerMultiBindingSiteSegments(local, source, compilerWorld, site, closed)
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
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>,
  ): ClosedMultiBindingSite | OpenSeam {
    const attribute = site.attribute?.productHandle == null
      ? null
      : attributesByProduct.get(site.attribute.productHandle) ?? null;
    const owner = site.attribute?.productHandle == null
      ? null
      : ownersByAttributeProduct.get(site.attribute.productHandle) ?? null;
    const classification = site.classification;
    const definition = classification?.resource?.definition instanceof CustomAttributeDefinition
      ? classification.resource.definition
      : null;
    const parsedSegments = parseInlineMultiBindingSegments(site.rawValue);

    if (attribute == null || owner == null || classification == null || definition == null) {
      return this.publisher.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        'Inline multi-binding lowering could not close over its authored attribute, owner element, classification, and custom-attribute definition.',
        KernelVocabulary.Instruction.OpenInstruction.key,
      );
    }
    if (parsedSegments.length === 0) {
      return this.publisher.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        `Inline multi-binding value for '${classification.resource?.name ?? attribute.rawName}' did not contain a closed segment.`,
        KernelVocabulary.Instruction.OpenInstruction.key,
      );
    }
    return new ClosedMultiBindingSite(
      attribute,
      owner,
      classification,
      definition,
      parsedSegments,
      compilerWorld.resourceResolver.bindables(definition),
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
        site,
        closed.attribute,
        closed.owner,
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
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
    classification: AttributeClassification,
    definition: CustomAttributeDefinition,
    parsed: ParsedMultiBindingSegment,
    bindables: TemplateAttributeBindablesInfo,
  ): MultiBindingSegmentLoweringResult {
    const materializedSegment = this.materializeMultiBindingSegment(
      local,
      source,
      compilerWorld,
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
        compilerWorld,
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
        attribute,
        owner,
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
      materializedSegment.sourceAddressHandle,
    ));
  }

  private lowerPlainMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
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
      compilerWorld,
      site,
      materializedSegment.segment,
      materializedSegment.syntax,
      bindable,
      parsed.rawValue,
      'Interpolation',
      materializedSegment.sourceAddressHandle,
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
    attribute: HtmlAttribute,
    owner: HtmlElementAttributeOwner,
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
      owner,
      materializedSegment.syntax,
      attribute,
      classification,
      buildInput.input,
      commandMatch,
      bindable,
      closedCommandReference,
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
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    parsed: ParsedMultiBindingSegment,
    bindables: TemplateAttributeBindablesInfo,
  ): MaterializedMultiBindingSegment {
    const segmentAddress = this.publisher.segmentSourceAddress(local, site.sourceAddressHandle, parsed);
    const syntax = this.publisher.publishMultiBindingAttributeSyntax(
      local,
      site,
      attribute,
      parseAttributeSyntaxInWorld(compilerWorld, parsed.rawName, parsed.rawValue),
      segmentAddress.handle,
    );
    const selection = this.selectMultiBindingSegment(
      compilerWorld,
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
      segmentAddress.handle,
    );

    return new MaterializedMultiBindingSegment(
      segment.segment,
      syntax.syntax,
      selection.bindable,
      selection.commandMatch,
      segmentAddress.handle,
      [
        ...(segmentAddress.record == null ? [] : [segmentAddress.record]),
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
    syntax: AttributeSyntax,
    bindables: TemplateAttributeBindablesInfo,
  ): MultiBindingSegmentSelection {
    const bindable = bindables.attr(syntax.target);
    const command = syntax.command == null
      ? null
      : compilerWorld.bindingCommandResolver.get(syntax.command);
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
    owner: HtmlElementAttributeOwner,
    syntax: AttributeSyntax,
    attribute: HtmlAttribute,
    classification: AttributeClassification,
    buildInput: BindingCommandBuildInput,
    commandMatch: CommandHandlerMatch,
    bindable: TemplateBindableReference | null = classification.bindable,
    commandReference: BindingCommandLowering['command'] = classification.bindingCommand ?? commandMatch.executable.toReference(),
  ): OpenLoweringResult {
    const executable = commandMatch.executable;
    if (executable.executionKind !== BindingCommandExecutionKind.BuiltIn || commandMatch.handler == null) {
      return this.openLowering(
        local,
        source,
        syntax.sourceAddressHandle,
        `Binding command '${executable.name}' reached an executable body this substrate does not model yet.`,
        KernelVocabulary.Compiler.OpenExecutableBody.key,
      );
    }
    const context = new CommandLoweringExecutionContext(
      this.store,
      local,
      source,
      compilerWorld,
      owner,
      syntax,
      classification,
      executable,
      commandReference,
      bindable,
      compilerWorld.expressionParser,
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
      attribute.valueAddressHandle ?? buildInput.sourceAddressHandle,
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
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Compiler.OpenExecutableBody.key,
    state = BindingCommandLoweringState.Open,
  ): OpenLoweringResult {
    return new OpenLoweringResult(
      new BindingCommandBuildResult(state, [], summary),
      [this.publisher.openSeam(local, source, addressHandle, summary, seamKindKey)],
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
    valueSiteByClassificationProduct: commandValueSitesByClassificationProduct(input.valueSites),
  };
}

function commandValueSitesByClassificationProduct(
  valueSites: TemplateValueSiteEmission,
): ReadonlyMap<ProductHandle, TemplateValueSite> {
  const sites = new Map<ProductHandle, TemplateValueSite>();
  for (const site of valueSites.sites) {
    if (site.classification?.productHandle != null && site.bindingCommand != null) {
      sites.set(site.classification.productHandle, site);
    }
  }
  return sites;
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
  world: TemplateCompilerWorldEmission,
  rawName: string,
  rawValue: string,
) {
  return world.attributeParser.parse(
    rawName,
    rawValue,
    new BuiltInAttributeParserExecutionHost(world),
  );
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
  return bindingNames(result.ast.declaration);
}

function bindingNames(pattern: BindingIdentifierOrPattern): readonly string[] {
  switch (pattern.$kind) {
    case 'BindingIdentifier':
      return [pattern.name.name];
    case 'BindingPatternDefault':
      return bindingNames(pattern.target);
    case 'BindingPatternHole':
      return [];
    case 'ArrayBindingPattern':
      return [
        ...pattern.elements.flatMap((element) => bindingNames(element)),
        ...(pattern.rest == null ? [] : bindingNames(pattern.rest)),
      ];
    case 'ObjectBindingPattern':
      return [
        ...pattern.properties.flatMap((property) => bindingNames(property.value)),
        ...(pattern.rest == null ? [] : bindingNames(pattern.rest)),
      ];
  }
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
