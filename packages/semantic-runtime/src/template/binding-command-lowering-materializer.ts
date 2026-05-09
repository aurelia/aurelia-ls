import {
  SourceSpanRole,
  SourceSpanAddress,
} from '../kernel/address.js';
import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  InstructionIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
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
  type AttributeParserParseResult,
  type AttributeSyntaxField,
} from './attribute-syntax.js';
import type {
  BindingCommandBuildContext,
} from './binding-command-execution.js';
import {
  BindingCommandBuildInfo,
  BindingCommandBuildInput,
  BindingCommandBuildInputKind,
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
  type BindingCommandBuildInputField,
  type BindingCommandLoweringField,
  type MultiBindingLoweringField,
  type MultiBindingSegmentField,
} from './binding-command-execution.js';
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
  HtmlElement,
  HtmlAttributeReference,
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
  InterpolationInstruction,
  SetPropertyInstruction,
  TemplateInstructionKind,
  type TemplateInstruction,
  type TemplateInstructionField,
} from './instruction-ir.js';
import { instructionKindKeyFor } from './instruction-vocabulary.js';
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
    readonly attributeSyntaxes: readonly AttributeSyntax[],
    readonly multiBindingSegments: readonly MultiBindingSegment[],
    readonly multiBindingLowerings: readonly MultiBindingLowering[],
    readonly instructions: readonly TemplateInstruction[],
    readonly valueSites: readonly TemplateValueSite[],
    readonly expressionParses: readonly TemplateExpressionParse[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class BindingCommandLoweringSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceRecord['handle'],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class OwnerElement {
  get tagName(): string {
    return this.element.tagName;
  }

  get namespace(): HtmlElement['namespace'] {
    return this.element.namespace;
  }

  constructor(
    readonly element: HtmlElement,
    readonly attributes: readonly HtmlAttribute[],
  ) {}
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

type CommandAttributeClassification = AttributeClassification & {
  readonly bindingCommand: NonNullable<AttributeClassification['bindingCommand']>;
};

type BindingCommandLoweringHandleSet = {
  readonly buildInputProductHandle: ProductHandle;
  readonly buildInputIdentityHandle: IdentityHandle;
  readonly loweringProductHandle: ProductHandle;
  readonly loweringIdentityHandle: IdentityHandle;
};

type TemplateInstructionHandleSet = {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
};

type MultiBindingSegmentHandleSet = {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
};

type AttributeSyntaxHandleSet = {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
};

class BindingCommandClassificationLoweringResult {
  constructor(
    readonly buildInput: BindingCommandBuildInput,
    readonly lowering: BindingCommandLowering,
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
    readonly owner: OwnerElement,
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

class PublishedMultiBindingSegment {
  constructor(
    readonly segment: MultiBindingSegment,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class PublishedMultiBindingAttributeSyntax {
  constructor(
    readonly syntax: AttributeSyntax,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class PublishedBindingCommandLowering {
  constructor(
    readonly lowering: BindingCommandLowering,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

interface PublishedBindingCommandBuild {
  readonly input: BindingCommandBuildInput;
  readonly records: readonly KernelStoreRecord[];
  readonly claims: readonly SemanticClaim[];
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
    readonly owner: OwnerElement,
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
  private readonly valueSitePublisher: TemplateValueSitePublisher;

  constructor(
    /** Hot analysis store that receives binding-command lowering records. */
    readonly store: KernelStore,
  ) {
    this.valueSitePublisher = new TemplateValueSitePublisher(store);
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
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const buildInputs: BindingCommandBuildInput[] = [];
    const lowerings: BindingCommandLowering[] = [];
    const attributeSyntaxes: AttributeSyntax[] = [];
    const multiBindingSegments: MultiBindingSegment[] = [];
    const multiBindingLowerings: MultiBindingLowering[] = [];
    const instructions: TemplateInstruction[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const syntaxByProduct = new Map(input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    const attributesByProduct = new Map(input.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    const ownersByAttributeProduct = ownerElementsByAttributeProduct(input.html);
    const valueSiteByClassificationProduct = commandValueSitesByClassificationProduct(input.valueSites);

    input.attributeClassification.classifications.forEach((classification, index) => {
      if (classification.bindingCommand == null) {
        return;
      }
      const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const attribute = syntax?.attribute.productHandle == null
        ? null
        : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
      const owner = syntax?.attribute.productHandle == null
        ? null
        : ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
      const local = `binding-command-lowering:${input.localKey}:${index}`;
      const expressionSite = valueSiteByClassificationProduct.get(classification.productHandle) ?? null;
      const result = this.lowerBindingCommandClassification(
        local,
        source,
        input.compilerWorld,
        classification as CommandAttributeClassification,
        syntax,
        attribute,
        owner,
        expressionSite,
      );
      records.push(...result.records);
      claims.push(...result.claims);
      openSeams.push(...result.openSeams);
      buildInputs.push(result.buildInput);
      lowerings.push(result.lowering);
      instructions.push(...result.instructions);
      valueSites.push(...result.valueSites);
      expressionParses.push(...result.expressionParses);
    });

    input.valueSites.sites.forEach((site, index) => {
      if (site.siteKind !== TemplateValueSiteKind.MultiBindingValue) {
        return;
      }
      const result = this.lowerMultiBindingSite(
        `multi-binding-lowering:${input.localKey}:${index}`,
        source,
        input.compilerWorld,
        site,
        attributesByProduct,
        ownersByAttributeProduct,
      );
      records.push(...result.records);
      claims.push(...result.claims);
      openSeams.push(...result.openSeams);
      buildInputs.push(...result.buildInputs);
      lowerings.push(...result.commandLowerings);
      attributeSyntaxes.push(...result.attributeSyntaxes);
      multiBindingSegments.push(...result.segments);
      multiBindingLowerings.push(result.lowering);
      instructions.push(...result.instructions);
      valueSites.push(...result.valueSites);
      expressionParses.push(...result.expressionParses);
    });

    records.push(
      ...claims.filter((claim) => records.indexOf(claim) < 0),
      new MaterializationRecord(
        this.store.handles.materialization(`binding-command-lowering:${input.localKey}`),
        input.compilationUnit.identityHandle,
        [
          ...buildInputs.map((buildInput) => buildInput.productHandle),
          ...lowerings.map((lowering) => lowering.productHandle),
          ...attributeSyntaxes.map((syntax) => syntax.productHandle),
          ...multiBindingSegments.map((segment) => segment.productHandle),
          ...multiBindingLowerings.map((lowering) => lowering.productHandle),
          ...instructions.map((instruction) => instruction.productHandle),
          ...valueSites.map((site) => site.productHandle),
          ...expressionParses.map((parse) => parse.productHandle),
        ],
        claims.map((claim) => claim.handle),
        openSeams.map((seam) => seam.handle),
      ),
    );

    return new BindingCommandLoweringEmission(
      buildInputs,
      lowerings,
      attributeSyntaxes,
      multiBindingSegments,
      multiBindingLowerings,
      instructions,
      valueSites,
      expressionParses,
      records,
    );
  }

  private lowerBindingCommandClassification(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    owner: OwnerElement | null,
    expressionSite: TemplateValueSite | null,
  ): BindingCommandClassificationLoweringResult {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];
    const commandMatch = findCommand(compilerWorld, classification.bindingCommand);
    const buildInput = this.publishBindingCommandBuildInput(
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
    const commandLowering = this.materializeCommandLowering(
      local,
      source,
      classification.bindingCommand,
      buildInput.input,
      loweringResult.result,
    );
    records.push(...commandLowering.records);
    claims.push(...commandLowering.claims);
    if (loweringResult instanceof ExecutedLoweringResult) {
      records.push(...loweringResult.context.records);
      claims.push(...loweringResult.context.claims);
      valueSites.push(...loweringResult.context.sites);
      expressionParses.push(...loweringResult.context.parses);
    }
    return new BindingCommandClassificationLoweringResult(
      buildInput.input,
      commandLowering.lowering,
      loweringResult.result.instructions,
      valueSites,
      expressionParses,
      records,
      claims,
      openSeams,
    );
  }

  private publishBindingCommandBuildInput(
    local: string,
    source: BindingCommandLoweringSourceSet,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    expressionSite: TemplateValueSite | null,
  ): PublishedBindingCommandBuild {
    const handles = this.handlesForLocal(local);
    const buildInput = this.createBindingCommandBuildInput(handles, source, classification, syntax, attribute, expressionSite);
    const claims = [
      new SemanticClaim(
        this.store.handles.claim(`${local}:builds-command-input`),
        classification.productHandle,
        KernelVocabulary.Compiler.BuildsCommandInput.key,
        buildInput.productHandle,
        source.provenanceHandle,
      ),
    ];
    return {
      input: buildInput,
      records: this.recordsForBindingCommandBuildInput(source, classification, buildInput, claims),
      claims,
    };
  }

  private createBindingCommandBuildInput(
    handles: BindingCommandLoweringHandleSet,
    source: BindingCommandLoweringSourceSet,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
    expressionSite: TemplateValueSite | null,
  ): BindingCommandBuildInput {
    return new BindingCommandBuildInput(
      handles.buildInputProductHandle,
      handles.buildInputIdentityHandle,
      classification.bindable == null
        ? BindingCommandBuildInputKind.PlainAttribute
        : BindingCommandBuildInputKind.Bindable,
      classification.ownerNode,
      syntax?.attribute ?? attribute?.toReference() ?? new HtmlAttributeReference(null, null, null),
      syntax?.productHandle ?? null,
      expressionSite?.productHandle ?? null,
      classification.bindable?.reference.ownerDefinitionProductHandle ?? null,
      classification.resource?.definitionProductHandle ?? null,
      syntax?.sourceAddressHandle ?? attribute?.sourceAddressHandle ?? classification.sourceAddressHandle,
      compactFieldProvenance<BindingCommandBuildInputField>([
        new FieldProvenance('inputKind', source.provenanceHandle),
        new FieldProvenance('attribute', source.provenanceHandle),
        syntax == null ? null : new FieldProvenance('syntax', source.provenanceHandle),
        expressionSite == null ? null : new FieldProvenance('expressionSite', source.provenanceHandle),
        classification.bindable == null ? null : new FieldProvenance('bindable', source.provenanceHandle),
        classification.resource == null ? null : new FieldProvenance('definition', source.provenanceHandle),
        new FieldProvenance('node', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForBindingCommandBuildInput(
    source: BindingCommandLoweringSourceSet,
    classification: CommandAttributeClassification,
    buildInput: BindingCommandBuildInput,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        buildInput.identityHandle,
        KernelVocabulary.Compiler.BindingCommandBuildInput.key,
        classification.identityHandle,
        buildInput.sourceAddressHandle,
        classification.bindingCommand.name,
      ),
      new MaterializedProduct(
        buildInput.productHandle,
        KernelVocabulary.Compiler.BindingCommandBuildInput.key,
        buildInput.identityHandle,
        buildInput.sourceAddressHandle,
        source.provenanceHandle,
      ),
      ...claims,
    ];
  }

  private lowerMultiBindingSite(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, OwnerElement>,
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
    const state = loweringStateFor(batch.openSeams, batch.commandLowerings, batch.expressionParses);
    const lowering = this.createMultiBindingLowering(local, source, site, state, batch);
    const loweringClaims = this.claimsForMultiBindingLowering(local, source, site, lowering, batch.instructions);
    return new MultiBindingLoweringResult(
      lowering,
      batch.segments,
      batch.commandLowerings,
      batch.buildInputs,
      batch.attributeSyntaxes,
      batch.instructions,
      batch.valueSites,
      batch.expressionParses,
      [
        ...batch.records,
        ...this.recordsForMultiBindingLowering(source, site, lowering, batch.directInstructions, loweringClaims),
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
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, OwnerElement>,
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
      return this.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        'Inline multi-binding lowering could not close over its authored attribute, owner element, classification, and custom-attribute definition.',
        KernelVocabulary.Instruction.OpenInstruction.key,
      );
    }
    if (parsedSegments.length === 0) {
      return this.openSeam(
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
    source: BindingCommandLoweringSourceSet,
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
      compactFieldProvenance<MultiBindingLoweringField>([
        new FieldProvenance('site', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        batch.segments.length === 0 ? null : new FieldProvenance('segments', source.provenanceHandle),
        batch.instructions.length === 0 ? null : new FieldProvenance('instructions', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private claimsForMultiBindingLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    lowering: MultiBindingLowering,
    instructions: readonly TemplateInstruction[],
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${local}:lowers-multi-binding`),
        site.productHandle,
        KernelVocabulary.Compiler.LowersMultiBinding.key,
        lowering.productHandle,
        source.provenanceHandle,
      ),
      ...this.claimsForProducedInstructions(local, source, lowering.productHandle, instructions),
    ];
  }

  private recordsForMultiBindingLowering(
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    lowering: MultiBindingLowering,
    directInstructions: readonly TemplateInstruction[],
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        lowering.identityHandle,
        KernelVocabulary.Compiler.MultiBindingLowering.key,
        site.identityHandle,
        site.sourceAddressHandle,
        lowering.state,
      ),
      new MaterializedProduct(
        lowering.productHandle,
        KernelVocabulary.Compiler.MultiBindingLowering.key,
        lowering.identityHandle,
        lowering.sourceAddressHandle,
        source.provenanceHandle,
      ),
      ...claims,
      ...recordsForInstructions(directInstructions, lowering.identityHandle, source),
    ];
  }

  private lowerMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    owner: OwnerElement,
    classification: AttributeClassification,
    definition: CustomAttributeDefinition,
    parsed: ParsedMultiBindingSegment,
    bindables: TemplateAttributeBindablesInfo,
  ): MultiBindingSegmentLoweringResult {
    const records: KernelStoreRecord[] = [];
    const claims: SemanticClaim[] = [];
    const openSeams: OpenSeam[] = [];
    const buildInputs: BindingCommandBuildInput[] = [];
    const commandLowerings: BindingCommandLowering[] = [];
    const attributeSyntaxes: AttributeSyntax[] = [];
    const instructions: TemplateInstruction[] = [];
    const directInstructions: TemplateInstruction[] = [];
    const valueSites: TemplateValueSite[] = [];
    const expressionParses: TemplateExpressionParse[] = [];
    const materializedSegment = this.materializeMultiBindingSegment(
      local,
      source,
      compilerWorld,
      site,
      attribute,
      parsed,
      bindables,
    );
    const { segment, syntax, bindable, commandMatch, sourceAddressHandle } = materializedSegment;
    records.push(...materializedSegment.records);
    claims.push(...materializedSegment.claims);
    attributeSyntaxes.push(syntax);

    if (bindable == null) {
      openSeams.push(this.openSeam(
        local,
        source,
        sourceAddressHandle,
        `Inline multi-binding segment '${syntax.target}' does not match a bindable on '${definition.name}'.`,
        KernelVocabulary.Instruction.OpenInstruction.key,
      ));
    } else if (commandMatch == null) {
      const publication = this.publishMultiBindingExpressionParse(
        `${local}:interpolation`,
        source,
        compilerWorld,
        site,
        segment,
        syntax,
        bindable,
        parsed.rawValue,
        'Interpolation',
        sourceAddressHandle,
      );
      records.push(...publication.records);
      claims.push(...publication.claims);
      valueSites.push(publication.site);
      expressionParses.push(publication.parse);
      const instruction = this.createMultiBindingValueInstruction(
        `${local}:instruction`,
        source,
        owner,
        attribute,
        bindable.definition.name,
        parsed.rawValue,
        publication.parse,
        sourceAddressHandle,
      );
      directInstructions.push(instruction);
      instructions.push(instruction);
    } else {
      const closedCommandReference = commandMatch.executable.toReference();
      const buildInput = this.publishMultiBindingCommandBuildInput(
        local,
        source,
        owner,
        attribute,
        syntax,
        segment,
        bindable,
      );
      buildInputs.push(buildInput.input);
      claims.push(...buildInput.claims);
      records.push(...buildInput.records);
      const loweringResult = this.executeCommand(
        local,
        source,
        compilerWorld,
        owner,
        syntax,
        attribute,
        classification,
        buildInput.input,
        commandMatch,
        bindable,
        closedCommandReference,
      );
      records.push(...loweringResult.openSeams);
      openSeams.push(...loweringResult.openSeams);
      const commandLowering = this.materializeCommandLowering(
        `${local}:command`,
        source,
        closedCommandReference,
        buildInput.input,
        loweringResult.result,
      );
      records.push(...commandLowering.records);
      claims.push(...commandLowering.claims);
      commandLowerings.push(commandLowering.lowering);
      instructions.push(...loweringResult.result.instructions);
      if (loweringResult instanceof ExecutedLoweringResult) {
        records.push(...loweringResult.context.records);
        claims.push(...loweringResult.context.claims);
        valueSites.push(...loweringResult.context.sites);
        expressionParses.push(...loweringResult.context.parses);
      }
    }

    return new MultiBindingSegmentLoweringResult(
      segment,
      commandLowerings,
      buildInputs,
      attributeSyntaxes,
      instructions,
      directInstructions,
      valueSites,
      expressionParses,
      records,
      claims,
      openSeams,
    );
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
    const segmentAddress = this.segmentSourceAddress(local, site.sourceAddressHandle, parsed);
    const syntax = this.materializeMultiBindingAttributeSyntax(
      local,
      source,
      compilerWorld,
      site,
      attribute,
      parsed,
      segmentAddress.handle,
    );
    const selection = this.selectMultiBindingSegment(
      compilerWorld,
      syntax.syntax,
      bindables,
    );
    const segment = this.publishMultiBindingSegment(
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

  private publishMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    parsed: ParsedMultiBindingSegment,
    selection: MultiBindingSegmentSelection,
    sourceAddressHandle: AddressHandle | null,
  ): PublishedMultiBindingSegment {
    const segment = this.createMultiBindingSegment(
      local,
      source,
      site,
      attribute,
      syntax,
      parsed,
      selection,
      sourceAddressHandle,
    );
    const claims = this.claimsForMultiBindingSegment(
      local,
      source,
      site,
      syntax,
      segment,
      selection.commandReference,
    );
    return new PublishedMultiBindingSegment(
      segment,
      this.recordsForMultiBindingSegment(
        source,
        site,
        syntax,
        segment,
        sourceAddressHandle,
        claims,
      ),
      claims,
    );
  }

  private createMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    parsed: ParsedMultiBindingSegment,
    selection: MultiBindingSegmentSelection,
    sourceAddressHandle: AddressHandle | null,
  ): MultiBindingSegment {
    const handles = this.multiBindingSegmentHandles(local);
    return new MultiBindingSegment(
      handles.productHandle,
      handles.identityHandle,
      site.toReference(),
      attribute.toReference(),
      syntax.productHandle,
      selection.bindable,
      selection.commandReference,
      parsed.segmentIndex,
      parsed.rawName,
      parsed.rawValue,
      sourceAddressHandle,
      this.multiBindingSegmentProvenance(source, selection),
    );
  }

  private multiBindingSegmentHandles(local: string): MultiBindingSegmentHandleSet {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }

  private multiBindingSegmentProvenance(
    source: BindingCommandLoweringSourceSet,
    selection: MultiBindingSegmentSelection,
  ): MultiBindingSegment['fieldProvenance'] {
    return compactFieldProvenance<MultiBindingSegmentField>([
      new FieldProvenance('site', source.provenanceHandle),
      new FieldProvenance('attribute', source.provenanceHandle),
      new FieldProvenance('syntax', source.provenanceHandle),
      selection.bindable == null ? null : new FieldProvenance('bindable', source.provenanceHandle),
      selection.commandReference == null ? null : new FieldProvenance('command', source.provenanceHandle),
      new FieldProvenance('rawName', source.provenanceHandle),
      new FieldProvenance('rawValue', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private claimsForMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    commandReference: MultiBindingSegment['command'],
  ): readonly SemanticClaim[] {
    return [
      this.splitsMultiBindingSegmentClaim(local, source, site, segment),
      this.multiBindingSegmentParsesToSyntaxClaim(local, source, segment, syntax),
      ...this.multiBindingSegmentCommandClaims(local, source, segment, commandReference),
    ];
  }

  private splitsMultiBindingSegmentClaim(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    segment: MultiBindingSegment,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:splits-multi-binding-segment`),
      site.productHandle,
      KernelVocabulary.Compiler.SplitsMultiBindingSegment.key,
      segment.productHandle,
      source.provenanceHandle,
    );
  }

  private multiBindingSegmentParsesToSyntaxClaim(
    local: string,
    source: BindingCommandLoweringSourceSet,
    segment: MultiBindingSegment,
    syntax: AttributeSyntax,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:parses-to-attribute-syntax`),
      segment.productHandle,
      KernelVocabulary.Template.ParsesToAttributeSyntax.key,
      syntax.productHandle,
      source.provenanceHandle,
    );
  }

  private multiBindingSegmentCommandClaims(
    local: string,
    source: BindingCommandLoweringSourceSet,
    segment: MultiBindingSegment,
    commandReference: MultiBindingSegment['command'],
  ): readonly SemanticClaim[] {
    return commandReference?.productHandle == null
      ? []
      : [
        new SemanticClaim(
          this.store.handles.claim(`${local}:uses-binding-command-executable`),
          segment.productHandle,
          KernelVocabulary.Compiler.UsesBindingCommandExecutable.key,
          commandReference.productHandle,
          source.provenanceHandle,
        ),
      ];
  }

  private recordsForMultiBindingSegment(
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    sourceAddressHandle: AddressHandle | null,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    const splitClaim = claims.find((claim) =>
      claim.predicateKey === KernelVocabulary.Compiler.SplitsMultiBindingSegment.key
    );
    const syntaxClaim = claims.find((claim) =>
      claim.predicateKey === KernelVocabulary.Template.ParsesToAttributeSyntax.key
    );
    return [
      new MaterializedProduct(
        syntax.productHandle,
        KernelVocabulary.Template.AttributeSyntax.key,
        syntax.identityHandle,
        syntax.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new CompilerIdentity(
        segment.identityHandle,
        KernelVocabulary.Compiler.MultiBindingSegment.key,
        site.identityHandle,
        sourceAddressHandle,
        syntax.target,
      ),
      new MaterializedProduct(
        segment.productHandle,
        KernelVocabulary.Compiler.MultiBindingSegment.key,
        segment.identityHandle,
        sourceAddressHandle,
        source.provenanceHandle,
      ),
      ...(splitClaim == null ? [] : [splitClaim]),
      ...(syntaxClaim == null ? [] : [syntaxClaim]),
    ];
  }

  private materializeMultiBindingAttributeSyntax(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    segment: ParsedMultiBindingSegment,
    sourceAddressHandle: AddressHandle | null,
  ): {
    readonly syntax: AttributeSyntax;
    readonly records: readonly KernelStoreRecord[];
    readonly claims: readonly SemanticClaim[];
  } {
    const parse = parseAttributeSyntaxInWorld(compilerWorld, segment.rawName, segment.rawValue);
    const syntax = this.createMultiBindingAttributeSyntax(
      this.attributeSyntaxHandles(`${local}:attribute-syntax`),
      source,
      attribute,
      parse,
      sourceAddressHandle,
    );
    return new PublishedMultiBindingAttributeSyntax(
      syntax,
      this.recordsForMultiBindingAttributeSyntax(site, syntax, sourceAddressHandle),
      [],
    );
  }

  private attributeSyntaxHandles(local: string): AttributeSyntaxHandleSet {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }

  private createMultiBindingAttributeSyntax(
    handles: AttributeSyntaxHandleSet,
    source: BindingCommandLoweringSourceSet,
    attribute: HtmlAttribute,
    parse: AttributeParserParseResult,
    sourceAddressHandle: AddressHandle | null,
  ): AttributeSyntax {
    const execution = parse.execution;
    return new AttributeSyntax(
      handles.productHandle,
      handles.identityHandle,
      execution.syntaxKind,
      execution.rawName,
      execution.rawValue,
      execution.target,
      execution.command,
      execution.parts,
      parse.pattern,
      attribute.toReference(),
      sourceAddressHandle,
      this.multiBindingAttributeSyntaxProvenance(source, parse),
    );
  }

  private multiBindingAttributeSyntaxProvenance(
    source: BindingCommandLoweringSourceSet,
    parse: AttributeParserParseResult,
  ): AttributeSyntax['fieldProvenance'] {
    const execution = parse.execution;
    return compactFieldProvenance<AttributeSyntaxField>([
      new FieldProvenance('rawName', source.provenanceHandle),
      new FieldProvenance('rawValue', source.provenanceHandle),
      new FieldProvenance('target', source.provenanceHandle),
      execution.command == null ? null : new FieldProvenance('command', source.provenanceHandle),
      execution.parts.length === 0 ? null : new FieldProvenance('parts', source.provenanceHandle),
      parse.pattern == null ? null : new FieldProvenance('pattern', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private recordsForMultiBindingAttributeSyntax(
    site: TemplateValueSite,
    syntax: AttributeSyntax,
    sourceAddressHandle: AddressHandle | null,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        syntax.identityHandle,
        KernelVocabulary.Template.AttributeSyntax.key,
        site.identityHandle,
        sourceAddressHandle,
        syntax.rawName,
      ),
    ];
  }

  private publishMultiBindingCommandBuildInput(
    local: string,
    source: BindingCommandLoweringSourceSet,
    owner: OwnerElement,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    bindable: TemplateBindableReference,
  ): {
    readonly input: BindingCommandBuildInput;
    readonly records: readonly KernelStoreRecord[];
    readonly claims: readonly SemanticClaim[];
  } {
    const handles = this.multiBindingCommandBuildInputHandles(local);
    const input = this.createMultiBindingCommandBuildInput(
      handles,
      source,
      owner,
      attribute,
      syntax,
      segment,
      bindable,
    );
    const claim = this.multiBindingCommandBuildInputClaim(local, source, segment, input);
    return {
      input,
      records: this.recordsForMultiBindingCommandBuildInput(input, syntax, segment, source, claim),
      claims: [claim],
    };
  }

  private multiBindingCommandBuildInputHandles(local: string): {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
  } {
    return {
      productHandle: this.store.handles.product(`${local}:build-input`),
      identityHandle: this.store.handles.identity(`${local}:build-input`),
    };
  }

  private createMultiBindingCommandBuildInput(
    handles: {
      readonly productHandle: ProductHandle;
      readonly identityHandle: IdentityHandle;
    },
    source: BindingCommandLoweringSourceSet,
    owner: OwnerElement,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    bindable: TemplateBindableReference,
  ): BindingCommandBuildInput {
    return new BindingCommandBuildInput(
      handles.productHandle,
      handles.identityHandle,
      BindingCommandBuildInputKind.Bindable,
      owner.element.toReference(),
      attribute.toReference(),
      syntax.productHandle,
      null,
      bindable.reference.ownerDefinitionProductHandle,
      bindable.reference.ownerDefinitionProductHandle,
      syntax.sourceAddressHandle ?? segment.sourceAddressHandle,
      compactFieldProvenance<BindingCommandBuildInputField>([
        new FieldProvenance('inputKind', source.provenanceHandle),
        new FieldProvenance('attribute', source.provenanceHandle),
        new FieldProvenance('syntax', source.provenanceHandle),
        new FieldProvenance('bindable', source.provenanceHandle),
        new FieldProvenance('definition', source.provenanceHandle),
        new FieldProvenance('node', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private multiBindingCommandBuildInputClaim(
    local: string,
    source: BindingCommandLoweringSourceSet,
    segment: MultiBindingSegment,
    input: BindingCommandBuildInput,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:builds-command-input`),
      segment.productHandle,
      KernelVocabulary.Compiler.BuildsCommandInput.key,
      input.productHandle,
      source.provenanceHandle,
    );
  }

  private recordsForMultiBindingCommandBuildInput(
    input: BindingCommandBuildInput,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    source: BindingCommandLoweringSourceSet,
    claim: SemanticClaim,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        input.identityHandle,
        KernelVocabulary.Compiler.BindingCommandBuildInput.key,
        segment.identityHandle,
        input.sourceAddressHandle,
        segment.command?.name ?? syntax.command ?? null,
      ),
      new MaterializedProduct(
        input.productHandle,
        KernelVocabulary.Compiler.BindingCommandBuildInput.key,
        input.identityHandle,
        input.sourceAddressHandle,
        source.provenanceHandle,
      ),
      claim,
    ];
  }

  private publishMultiBindingExpressionParse(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    originalSite: TemplateValueSite,
    segment: MultiBindingSegment,
    syntax: AttributeSyntax,
    bindable: TemplateBindableReference,
    expression: string,
    entryFamily: ExpressionType,
    sourceAddressHandle: AddressHandle | null,
  ): {
    readonly site: TemplateValueSite;
    readonly parse: TemplateExpressionParse;
    readonly records: readonly KernelStoreRecord[];
    readonly claims: readonly SemanticClaim[];
  } {
    const publication = this.valueSitePublisher.publish(new TemplateValueSitePublicationRequest(
      `${local}:value-site`,
      `${local}:expression-parse`,
      compilerWorld.expressionParser,
      source.provenanceHandle,
      TemplateValueSiteKind.CustomAttributeValue,
      expression,
      entryFamily,
      originalSite.node,
      originalSite.attribute,
      syntax,
      originalSite.classification,
      null,
      bindable,
      sourceAddressHandle,
      segment.identityHandle,
      `${segment.rawName}:Interpolation`,
      segment.productHandle,
      (result) => `${segment.rawName}:${result.kind}`,
    ));
    if (publication.parse == null) {
      throw new Error('Inline multi-binding expression parsing must publish an expression parse.');
    }
    return {
      site: publication.site,
      parse: publication.parse,
      claims: publication.claims,
      records: publication.records,
    };
  }

  private createMultiBindingValueInstruction(
    local: string,
    source: BindingCommandLoweringSourceSet,
    owner: OwnerElement,
    attribute: HtmlAttribute,
    target: string,
    value: string,
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateInstruction {
    const handles = this.templateInstructionHandles(local);
    return parse.resultKind === ExpressionParseResultKind.InterpolationAbsent
      ? this.createMultiBindingSetPropertyInstruction(handles, source, owner, attribute, target, value, sourceAddressHandle)
      : this.createMultiBindingInterpolationInstruction(handles, source, owner, attribute, target, parse, sourceAddressHandle);
  }

  private templateInstructionHandles(local: string): TemplateInstructionHandleSet {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }

  private createMultiBindingSetPropertyInstruction(
    handles: TemplateInstructionHandleSet,
    source: BindingCommandLoweringSourceSet,
    owner: OwnerElement,
    attribute: HtmlAttribute,
    target: string,
    value: string,
    sourceAddressHandle: AddressHandle | null,
  ): SetPropertyInstruction {
    return new SetPropertyInstruction(
      handles.productHandle,
      handles.identityHandle,
      owner.element.toReference(),
      attribute.toReference(),
      target,
      value,
      sourceAddressHandle,
      this.multiBindingSetPropertyInstructionProvenance(source),
    );
  }

  private createMultiBindingInterpolationInstruction(
    handles: TemplateInstructionHandleSet,
    source: BindingCommandLoweringSourceSet,
    owner: OwnerElement,
    attribute: HtmlAttribute,
    target: string,
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
  ): InterpolationInstruction {
    return new InterpolationInstruction(
      handles.productHandle,
      handles.identityHandle,
      owner.element.toReference(),
      attribute.toReference(),
      target,
      [parse.productHandle],
      sourceAddressHandle,
      this.multiBindingInterpolationInstructionProvenance(source),
    );
  }

  private multiBindingSetPropertyInstructionProvenance(
    source: BindingCommandLoweringSourceSet,
  ): TemplateInstruction['fieldProvenance'] {
    return compactFieldProvenance<TemplateInstructionField>([
      new FieldProvenance('node', source.provenanceHandle),
      new FieldProvenance('attribute', source.provenanceHandle),
      new FieldProvenance('target', source.provenanceHandle),
      new FieldProvenance('value', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private multiBindingInterpolationInstructionProvenance(
    source: BindingCommandLoweringSourceSet,
  ): TemplateInstruction['fieldProvenance'] {
    return compactFieldProvenance<TemplateInstructionField>([
      new FieldProvenance('node', source.provenanceHandle),
      new FieldProvenance('attribute', source.provenanceHandle),
      new FieldProvenance('target', source.provenanceHandle),
      new FieldProvenance('expression', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private materializeCommandLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    buildInput: BindingCommandBuildInput,
    result: BindingCommandBuildResult,
  ): PublishedBindingCommandLowering {
    const lowering = this.createBindingCommandLowering(
      local,
      source,
      commandReference,
      buildInput,
      result,
    );
    const claims = this.claimsForBindingCommandLowering(
      local,
      source,
      commandReference,
      lowering,
      buildInput,
      result.instructions,
    );
    return new PublishedBindingCommandLowering(
      lowering,
      this.recordsForBindingCommandLowering(
        source,
        commandReference,
        buildInput,
        lowering,
        result.instructions,
        claims,
      ),
      claims,
    );
  }

  private createBindingCommandLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    buildInput: BindingCommandBuildInput,
    result: BindingCommandBuildResult,
  ): BindingCommandLowering {
    return new BindingCommandLowering(
      this.store.handles.product(`${local}:lowering`),
      this.store.handles.identity(`${local}:lowering`),
      commandReference,
      buildInput.productHandle,
      result.state,
      result.instructions.map((instruction) => instruction.productHandle),
      buildInput.sourceAddressHandle,
      compactFieldProvenance<BindingCommandLoweringField>([
        new FieldProvenance('command', source.provenanceHandle),
        new FieldProvenance('input', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        result.instructions.length === 0 ? null : new FieldProvenance('instructions', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private claimsForBindingCommandLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    lowering: BindingCommandLowering,
    buildInput: BindingCommandBuildInput,
    instructions: readonly TemplateInstruction[],
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${local}:lowers-binding-command`),
        buildInput.productHandle,
        KernelVocabulary.Compiler.LowersBindingCommand.key,
        lowering.productHandle,
        source.provenanceHandle,
      ),
      ...(commandReference.productHandle == null
        ? []
        : [
          new SemanticClaim(
            this.store.handles.claim(`${local}:uses-binding-command-executable`),
            lowering.productHandle,
            KernelVocabulary.Compiler.UsesBindingCommandExecutable.key,
            commandReference.productHandle,
            source.provenanceHandle,
          ),
        ]),
      ...this.claimsForProducedInstructions(local, source, lowering.productHandle, instructions),
    ];
  }

  private recordsForBindingCommandLowering(
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    buildInput: BindingCommandBuildInput,
    lowering: BindingCommandLowering,
    instructions: readonly TemplateInstruction[],
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        lowering.identityHandle,
        KernelVocabulary.Compiler.BindingCommandLowering.key,
        buildInput.identityHandle,
        lowering.sourceAddressHandle,
        commandReference.name,
      ),
      new MaterializedProduct(
        lowering.productHandle,
        KernelVocabulary.Compiler.BindingCommandLowering.key,
        lowering.identityHandle,
        lowering.sourceAddressHandle,
        source.provenanceHandle,
      ),
      ...recordsForInstructions(instructions, lowering.identityHandle, source),
      ...claims,
    ];
  }

  private claimsForProducedInstructions(
    local: string,
    source: BindingCommandLoweringSourceSet,
    producerHandle: ProductHandle,
    instructions: readonly TemplateInstruction[],
  ): readonly SemanticClaim[] {
    return instructions.flatMap((instruction, instructionIndex) => [
      new SemanticClaim(
        this.store.handles.claim(`${local}:produces-instruction:${instructionIndex}`),
        producerHandle,
        KernelVocabulary.Compiler.ProducesInstruction.key,
        instruction.productHandle,
        source.provenanceHandle,
      ),
      ...expressionProductHandlesForInstruction(instruction).map((expressionProductHandle, expressionIndex) =>
        new SemanticClaim(
          this.store.handles.claim(`${local}:instruction:${instructionIndex}:uses-expression-parse:${expressionIndex}`),
          instruction.productHandle,
          KernelVocabulary.Compiler.UsesExpressionParse.key,
          expressionProductHandle,
          source.provenanceHandle,
        )
      ),
    ]);
  }

  private segmentSourceAddress(
    local: string,
    addressHandle: AddressHandle | null,
    segment: ParsedMultiBindingSegment,
  ): {
    readonly handle: AddressHandle | null;
    readonly record: SourceSpanAddress | null;
  } {
    const address = addressHandle == null ? null : this.store.readAddress(addressHandle);
    if (!(address instanceof SourceSpanAddress)) {
      return { handle: addressHandle, record: null };
    }
    const handle = this.store.handles.address(`${local}:source`);
    return {
      handle,
      record: new SourceSpanAddress(
        handle,
        address.fileHandle,
        address.start + segment.valueStart,
        address.start + segment.valueEnd,
        SourceSpanRole.Value,
      ),
    };
  }

  private executeCommand(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    owner: OwnerElement,
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
    const seams = result.state === BindingCommandLoweringState.Invalid || result.state === BindingCommandLoweringState.Open
      ? [
        this.openSeam(
          local,
          source,
          syntax.sourceAddressHandle,
          result.message ?? `Binding command '${executable.name}' did not produce closed instructions.`,
          result.state === BindingCommandLoweringState.Invalid
            ? KernelVocabulary.Instruction.OpenInstruction.key
            : KernelVocabulary.Compiler.OpenExecutableBody.key,
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
      [this.openSeam(local, source, addressHandle, summary, seamKindKey)],
    );
  }

  private openSeam(
    local: string,
    source: BindingCommandLoweringSourceSet,
    addressHandle: AddressHandle | null,
    summary: string,
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Compiler.OpenExecutableBody.key,
  ): OpenSeam {
    return new OpenSeam(
      this.store.handles.openSeam(`${local}:open:${encodeOpenSeamLocal(summary)}`),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
  }

  private recordsForSource(input: BindingCommandLoweringRequest): BindingCommandLoweringSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-command-lowering:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`binding-command-lowering:${input.localKey}`);
    return new BindingCommandLoweringSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.Scope],
          'Binding-command lowering consumed attribute classifications, command executables, expression parser, attribute parser, and attribute mapper services.',
          input.compilationUnit.sourceAddressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }

  private handlesForLocal(local: string): BindingCommandLoweringHandleSet {
    return {
      buildInputProductHandle: this.store.handles.product(`${local}:build-input`),
      buildInputIdentityHandle: this.store.handles.identity(`${local}:build-input`),
      loweringProductHandle: this.store.handles.product(`${local}:lowering`),
      loweringIdentityHandle: this.store.handles.identity(`${local}:lowering`),
    };
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

function ownerElementsByAttributeProduct(html: HtmlParseEmission): ReadonlyMap<ProductHandle, OwnerElement> {
  const owners = new Map<ProductHandle, OwnerElement>();
  for (const node of html.nodes) {
    if (!(node instanceof HtmlElement)) {
      continue;
    }
    const attributes = node.attributes
      .map((reference) => reference.productHandle == null
        ? null
        : html.attributes.find((attribute) => attribute.productHandle === reference.productHandle) ?? null
      )
      .filter((attribute): attribute is HtmlAttribute => attribute != null);
    const owner = new OwnerElement(node, attributes);
    for (const attribute of node.attributes) {
      if (attribute.productHandle != null) {
        owners.set(attribute.productHandle, owner);
      }
    }
  }
  return owners;
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

function recordsForInstructions(
  instructions: readonly TemplateInstruction[],
  ownerIdentityHandle: IdentityHandle,
  source: BindingCommandLoweringSourceSet,
): readonly KernelStoreRecord[] {
  return instructions.flatMap((instruction) => [
    new InstructionIdentity(
      instruction.identityHandle,
      ownerIdentityHandle,
      instructionKindKeyFor(instruction.instructionKind),
    ),
    new MaterializedProduct(
      instruction.productHandle,
      KernelVocabulary.Instruction.Instruction.key,
      instruction.identityHandle,
      instruction.sourceAddressHandle,
      source.provenanceHandle,
    ),
  ]);
}

function expressionProductHandlesForInstruction(
  instruction: TemplateInstruction,
): readonly ProductHandle[] {
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.PropertyBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.ListenerBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.IteratorBinding:
      return handleArray(instruction.iterableExpressionProductHandle);
    case TemplateInstructionKind.RefBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.AttributeBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.TranslationBindBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.TranslationParametersBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.SpreadValueBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.Interpolation:
      return instruction.expressionProductHandles;
    case TemplateInstructionKind.TextBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.StylePropertyBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.LetBinding:
      return handleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.HydrateElement:
    case TemplateInstructionKind.HydrateAttribute:
    case TemplateInstructionKind.HydrateTemplateController:
    case TemplateInstructionKind.MultiAttr:
    case TemplateInstructionKind.SetProperty:
    case TemplateInstructionKind.SetAttribute:
    case TemplateInstructionKind.SetClassAttribute:
    case TemplateInstructionKind.SetStyleAttribute:
    case TemplateInstructionKind.HydrateLetElement:
    case TemplateInstructionKind.SpreadTransferedBinding:
    case TemplateInstructionKind.SpreadElementPropBinding:
    case TemplateInstructionKind.TranslationBinding:
    case TemplateInstructionKind.StateBinding:
    case TemplateInstructionKind.DispatchBinding:
      return [];
  }
}

function handleArray(handle: ProductHandle | null): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
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
): BindingCommandLoweringState {
  if (
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
  owner: OwnerElement | null,
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

function encodeOpenSeamLocal(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'open';
}
