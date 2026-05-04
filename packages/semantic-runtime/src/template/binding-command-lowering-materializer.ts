import {
  SourceFileAddress,
  SourceSpanRole,
  SourceSpanAddress,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
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
  type InstructionKindKey,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import type {
  BindingIdentifierOrPattern,
  ExpressionType,
} from '../expression/ast.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
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
  AttributeSyntaxKind,
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
  executeBuiltInAttributePattern,
  type BuiltInAttributePattern,
  type BuiltInBindingCommand,
} from './built-in-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type {
  TemplateBindableReference,
} from './compiler-world.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  expressionParseStateForResult,
  TemplateExpressionParse,
  TemplateExpressionParseState,
  TemplateValueSite,
  TemplateValueSiteKind,
  type TemplateExpressionParseField,
  type TemplateValueSiteField,
} from './value-site.js';
import type { TemplateValueSiteEmission } from './value-site-materializer.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlAttributeReference,
} from './html-ir.js';
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
import { TemplateProductDetails } from './product-details.js';
export class BindingCommandLoweringInput {
  constructor(
    /** Store-local key for this binding-command lowering pass. */
    readonly localKey: string,
    /** Compiler unit that owns the HTML, syntax, classification, and parser publications. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Parsed HTML products whose command-bearing attributes are being lowered. */
    readonly html: HtmlParseEmission,
    /** Runtime AttrSyntax products produced from the HTML attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Attribute classifications that selected binding commands. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Value-site products that identify command-owned values before command-specific parsing. */
    readonly valueSites: TemplateValueSiteEmission,
    /** Compiler world that supplies binding-command resolver, expression parser, attribute parser, and mapper services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
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
  constructor(
    readonly element: HtmlElement,
    readonly attributes: readonly HtmlAttribute[],
  ) {}
}

class ParsedMultiBindingSegment {
  constructor(
    readonly segmentIndex: number,
    readonly rawName: string,
    readonly rawValue: string,
    readonly start: number,
    readonly end: number,
    readonly valueStart: number,
    readonly valueEnd: number,
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
    readonly parser: ExpressionParser,
  ) {}

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
    const interpretation = this.compilerWorld.attributeParser.interpret(rawName);
    if (interpretation == null) {
      return BindingCommandTailSyntaxFromExecution(AttributePatternExecutionResult.plain(rawName, rawValue));
    }
    const matched = interpretation.compiledPatternProductHandle == null
      ? null
      : findMatchedPattern(this.compilerWorld, interpretation.compiledPatternProductHandle);
    const execution = matched == null
      ? AttributePatternExecutionResult.plain(rawName, rawValue)
      : executeBuiltInAttributePattern(
        matched.handler,
        matched.pattern.pattern,
        rawName,
        rawValue,
        interpretation.parts,
      ) ?? new AttributePatternExecutionResult(
        AttributeSyntaxKind.Open,
        rawName,
        rawValue,
        rawName,
        null,
        interpretation.parts,
      );
    return BindingCommandTailSyntaxFromExecution(execution);
  }

  mapAttribute(
    _node: HtmlNodeReference,
    attr: string,
  ): string | null {
    return mapAttribute(this.owner.element, attr);
  }

  isTwoWay(
    _node: HtmlNodeReference,
    attr: string,
  ): boolean {
    return shouldDefaultToTwoWay(this.owner, attr);
  }

  private parseExpression(
    expression: string,
    entryFamily: ExpressionType,
    info: BindingCommandBuildInfo,
  ): CommandParsePublication {
    const index = this.expressionIndex++;
    const siteLocal = `${this.local}:value-site:${index}`;
    const parseLocal = `${this.local}:expression-parse:${index}`;
    const siteProductHandle = this.store.handles.product(siteLocal);
    const siteIdentityHandle = this.store.handles.identity(siteLocal);
    const parseProductHandle = this.store.handles.product(parseLocal);
    const parseIdentityHandle = this.store.handles.identity(parseLocal);
    const addressHandle = info.expressionSourceAddressHandle;
    const result = this.parser.parse(
      expression,
      entryFamily,
      this.expressionParseContext(addressHandle),
    );
    const site = new TemplateValueSite(
      siteProductHandle,
      siteIdentityHandle,
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
      compactFieldProvenance<TemplateValueSiteField>([
        new FieldProvenance('siteKind', this.source.provenanceHandle),
        new FieldProvenance('rawValue', this.source.provenanceHandle),
        new FieldProvenance('entryFamily', this.source.provenanceHandle),
        new FieldProvenance('node', this.source.provenanceHandle),
        new FieldProvenance('attribute', this.source.provenanceHandle),
        new FieldProvenance('syntax', this.source.provenanceHandle),
        new FieldProvenance('classification', this.source.provenanceHandle),
        new FieldProvenance('bindingCommand', this.source.provenanceHandle),
        this.bindable == null ? null : new FieldProvenance('bindable', this.source.provenanceHandle),
        new FieldProvenance('source', this.source.provenanceHandle),
      ]),
    );
    const parse = new TemplateExpressionParse(
      parseProductHandle,
      parseIdentityHandle,
      site.toReference(),
      this.compilerWorld.expressionParser.productHandle,
      expressionParseStateForResult(result),
      result.kind,
      result,
      addressHandle,
      compactFieldProvenance<TemplateExpressionParseField>([
        new FieldProvenance('site', this.source.provenanceHandle),
        new FieldProvenance('parser', this.source.provenanceHandle),
        new FieldProvenance('state', this.source.provenanceHandle),
        new FieldProvenance('resultKind', this.source.provenanceHandle),
        new FieldProvenance('source', this.source.provenanceHandle),
      ]),
    );
    const routeClaim = info.buildInputProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${siteLocal}:selects-value-site`),
        info.buildInputProductHandle,
        KernelVocabulary.Template.SelectsValueSite.key,
        site.productHandle,
        this.source.provenanceHandle,
      );
    const claim = new SemanticClaim(
      this.store.handles.claim(`${parseLocal}:parses-to-expression-parse`),
      site.productHandle,
      KernelVocabulary.Template.ParsesToExpressionParse.key,
      parse.productHandle,
      this.source.provenanceHandle,
    );
    if (routeClaim != null) {
      this.claims.push(routeClaim);
    }
    this.claims.push(claim);
    this.sites.push(site);
    this.parses.push(parse);
    this.records.push(
      new CompilerIdentity(
        site.identityHandle,
        KernelVocabulary.Template.ValueSite.key,
        this.classification.identityHandle,
        addressHandle,
        `${this.command.name}:${entryFamily}`,
      ),
      new MaterializedProduct(
        site.productHandle,
        KernelVocabulary.Template.ValueSite.key,
        site.identityHandle,
        addressHandle,
        this.source.provenanceHandle,
      ),
      new CompilerIdentity(
        parse.identityHandle,
        KernelVocabulary.Template.ExpressionParse.key,
        site.identityHandle,
        addressHandle,
        `${this.command.name}:${result.kind}`,
      ),
      new MaterializedProduct(
        parse.productHandle,
        KernelVocabulary.Template.ExpressionParse.key,
        parse.identityHandle,
        addressHandle,
        this.source.provenanceHandle,
      ),
      claim,
    );
    return new CommandParsePublication(site, parse, result);
  }

  private expressionParseContext(addressHandle: AddressHandle | null): ExpressionParseContext | undefined {
    if (addressHandle == null) {
      return undefined;
    }
    const address = this.store.readAddress(addressHandle);
    if (!(address instanceof SourceSpanAddress)) {
      return undefined;
    }
    const fileAddress = this.store.readAddress(address.fileHandle);
    const file = fileAddress instanceof SourceFileAddress
      ? new SourceFileRef(fileAddress.handle, fileAddress.path)
      : null;
    return {
      baseSpan: sourceSpanFromBounds(address.start, address.end, file),
    };
  }
}

/** Lowers command-bearing attribute classifications through runtime-shaped binding-command models. */
export class BindingCommandLoweringMaterializer {
  private readonly parser = new ExpressionParser();

  constructor(
    /** Hot analysis store that receives binding-command lowering records. */
    readonly store: KernelStore,
  ) {}

  lower(input: BindingCommandLoweringInput): BindingCommandLoweringEmission {
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

  private recordsForLowering(input: BindingCommandLoweringInput): BindingCommandLoweringEmission {
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
      const commandMatch = findCommand(input.compilerWorld, classification.bindingCommand);
      const local = `binding-command-lowering:${input.localKey}:${index}`;
      const expressionSite = valueSiteByClassificationProduct.get(classification.productHandle) ?? null;
      const handles = this.handlesForLocal(local);
      const buildInput = new BindingCommandBuildInput(
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
      const buildInputClaim = new SemanticClaim(
        this.store.handles.claim(`${local}:builds-command-input`),
        classification.productHandle,
        KernelVocabulary.Compiler.BuildsCommandInput.key,
        buildInput.productHandle,
        source.provenanceHandle,
      );
      claims.push(buildInputClaim);
      buildInputs.push(buildInput);
      records.push(
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
        buildInputClaim,
      );

      const loweringResult = syntax == null || attribute == null || owner == null || commandMatch == null
        ? this.openLowering(local, source, syntax?.sourceAddressHandle ?? classification.sourceAddressHandle, missingInputSummary(syntax, attribute, owner, commandMatch))
        : this.executeCommand(local, source, input.compilerWorld, owner, syntax, attribute, classification, buildInput, commandMatch);
      records.push(...loweringResult.openSeams);
      openSeams.push(...loweringResult.openSeams);

      const result = loweringResult.result;
      const commandReference = classification.bindingCommand;
      const lowering = new BindingCommandLowering(
        handles.loweringProductHandle,
        handles.loweringIdentityHandle,
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
      const loweringClaim = new SemanticClaim(
        this.store.handles.claim(`${local}:lowers-binding-command`),
        buildInput.productHandle,
        KernelVocabulary.Compiler.LowersBindingCommand.key,
        lowering.productHandle,
        source.provenanceHandle,
      );
      claims.push(loweringClaim);
      if (commandReference.productHandle != null) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:uses-binding-command-executable`),
          lowering.productHandle,
          KernelVocabulary.Compiler.UsesBindingCommandExecutable.key,
          commandReference.productHandle,
          source.provenanceHandle,
        ));
      }
      result.instructions.forEach((instruction, instructionIndex) => {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:produces-instruction:${instructionIndex}`),
          lowering.productHandle,
          KernelVocabulary.Compiler.ProducesInstruction.key,
          instruction.productHandle,
          source.provenanceHandle,
        ));
        for (const [expressionIndex, expressionProductHandle] of expressionProductHandlesForInstruction(instruction).entries()) {
          claims.push(new SemanticClaim(
            this.store.handles.claim(`${local}:instruction:${instructionIndex}:uses-expression-parse:${expressionIndex}`),
            instruction.productHandle,
            KernelVocabulary.Compiler.UsesExpressionParse.key,
            expressionProductHandle,
            source.provenanceHandle,
          ));
        }
      });
      const instructionRecords = recordsForInstructions(
        result.instructions,
        lowering.identityHandle,
        source,
        claims,
      );
      records.push(
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
        ...instructionRecords,
      );
      lowerings.push(lowering);
      instructions.push(...result.instructions);
      if (loweringResult instanceof ExecutedLoweringResult) {
        records.push(...loweringResult.context.records);
        claims.push(...loweringResult.context.claims);
        valueSites.push(...loweringResult.context.sites);
        expressionParses.push(...loweringResult.context.parses);
      }
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

  private lowerMultiBindingSite(
    local: string,
    source: BindingCommandLoweringSourceSet,
    compilerWorld: TemplateCompilerWorldEmission,
    site: TemplateValueSite,
    attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>,
    ownersByAttributeProduct: ReadonlyMap<ProductHandle, OwnerElement>,
  ): MultiBindingLoweringResult {
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
    const loweringProductHandle = this.store.handles.product(`${local}:lowering`);
    const loweringIdentityHandle = this.store.handles.identity(`${local}:lowering`);
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
      openSeams.push(this.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        'Inline multi-binding lowering could not close over its authored attribute, owner element, classification, and custom-attribute definition.',
        KernelVocabulary.Instruction.OpenInstruction.key,
      ));
    } else if (parsedSegments.length === 0) {
      openSeams.push(this.openSeam(
        local,
        source,
        site.sourceAddressHandle,
        `Inline multi-binding value for '${classification.resource?.name ?? attribute.rawName}' did not contain a closed segment.`,
        KernelVocabulary.Instruction.OpenInstruction.key,
      ));
    } else {
      const bindables = compilerWorld.resourceResolver.bindables(definition);
      for (const parsed of parsedSegments) {
        const segmentLocal = `${local}:segment:${parsed.segmentIndex}`;
        const segmentAddress = this.segmentSourceAddress(segmentLocal, site.sourceAddressHandle, parsed);
        if (segmentAddress.record != null) {
          records.push(segmentAddress.record);
        }
        const syntax = this.materializeMultiBindingAttributeSyntax(
          segmentLocal,
          source,
          compilerWorld,
          site,
          attribute,
          parsed,
          segmentAddress.handle,
        );
        records.push(...syntax.records);
        claims.push(...syntax.claims);
        attributeSyntaxes.push(syntax.syntax);

        const bindable = bindables.attr(syntax.syntax.target);
        const commandMatch = syntax.syntax.command == null
          ? null
          : compilerWorld.bindingCommandResolver.resolve(syntax.syntax.command) == null
            ? null
            : findCommand(compilerWorld, compilerWorld.bindingCommandResolver.resolve(syntax.syntax.command)!.toReference());
        const commandReference = commandMatch?.executable.toReference() ?? null;
        const segment = new MultiBindingSegment(
          this.store.handles.product(segmentLocal),
          this.store.handles.identity(segmentLocal),
          site.toReference(),
          attribute.toReference(),
          syntax.syntax.productHandle,
          bindable,
          commandReference,
          parsed.segmentIndex,
          parsed.rawName,
          parsed.rawValue,
          segmentAddress.handle,
          compactFieldProvenance<MultiBindingSegmentField>([
            new FieldProvenance('site', source.provenanceHandle),
            new FieldProvenance('attribute', source.provenanceHandle),
            new FieldProvenance('syntax', source.provenanceHandle),
            bindable == null ? null : new FieldProvenance('bindable', source.provenanceHandle),
            commandReference == null ? null : new FieldProvenance('command', source.provenanceHandle),
            new FieldProvenance('rawName', source.provenanceHandle),
            new FieldProvenance('rawValue', source.provenanceHandle),
            new FieldProvenance('source', source.provenanceHandle),
          ]),
        );
        segments.push(segment);
        const splitClaim = new SemanticClaim(
          this.store.handles.claim(`${segmentLocal}:splits-multi-binding-segment`),
          site.productHandle,
          KernelVocabulary.Compiler.SplitsMultiBindingSegment.key,
          segment.productHandle,
          source.provenanceHandle,
        );
        claims.push(splitClaim);
        const syntaxClaim = new SemanticClaim(
          this.store.handles.claim(`${segmentLocal}:parses-to-attribute-syntax`),
          segment.productHandle,
          KernelVocabulary.Template.ParsesToAttributeSyntax.key,
          syntax.syntax.productHandle,
          source.provenanceHandle,
        );
        claims.push(syntaxClaim);
        if (commandReference?.productHandle != null) {
          claims.push(new SemanticClaim(
            this.store.handles.claim(`${segmentLocal}:uses-binding-command-executable`),
            segment.productHandle,
            KernelVocabulary.Compiler.UsesBindingCommandExecutable.key,
            commandReference.productHandle,
            source.provenanceHandle,
          ));
        }
        records.push(
          new MaterializedProduct(
            syntax.syntax.productHandle,
            KernelVocabulary.Template.AttributeSyntax.key,
            syntax.syntax.identityHandle,
            syntax.syntax.sourceAddressHandle,
            source.provenanceHandle,
          ),
          new CompilerIdentity(
            segment.identityHandle,
            KernelVocabulary.Compiler.MultiBindingSegment.key,
            site.identityHandle,
            segmentAddress.handle,
            syntax.syntax.target,
          ),
          new MaterializedProduct(
            segment.productHandle,
            KernelVocabulary.Compiler.MultiBindingSegment.key,
            segment.identityHandle,
            segmentAddress.handle,
            source.provenanceHandle,
          ),
          splitClaim,
          syntaxClaim,
        );

        if (bindable == null) {
          openSeams.push(this.openSeam(
            segmentLocal,
            source,
            segmentAddress.handle,
            `Inline multi-binding segment '${syntax.syntax.target}' does not match a bindable on '${definition.name}'.`,
            KernelVocabulary.Instruction.OpenInstruction.key,
          ));
          continue;
        }

        if (commandMatch == null) {
          const publication = this.publishMultiBindingExpressionParse(
            `${segmentLocal}:interpolation`,
            source,
            compilerWorld,
            site,
            segment,
            syntax.syntax,
            bindable,
            parsed.rawValue,
            'Interpolation',
            segmentAddress.handle,
          );
          records.push(...publication.records);
          claims.push(...publication.claims);
          valueSites.push(publication.site);
          expressionParses.push(publication.parse);
          const instruction = this.createMultiBindingValueInstruction(
            `${segmentLocal}:instruction`,
            source,
            owner,
            attribute,
            bindable.definition.name,
            parsed.rawValue,
            publication.parse,
            segmentAddress.handle,
          );
          directInstructions.push(instruction);
          instructions.push(instruction);
          continue;
        }
        const closedCommandReference = commandMatch.executable.toReference();

        const buildInput = this.createMultiBindingCommandBuildInput(
          segmentLocal,
          source,
          owner,
          attribute,
          syntax.syntax,
          segment,
          bindable,
        );
        buildInputs.push(buildInput.input);
        claims.push(...buildInput.claims);
        records.push(...buildInput.records);
        const loweringResult = this.executeCommand(
          segmentLocal,
          source,
          compilerWorld,
          owner,
          syntax.syntax,
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
          `${segmentLocal}:command`,
          source,
          closedCommandReference,
          buildInput.input,
          loweringResult.result,
          claims,
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
    }

    const state = loweringStateFor(openSeams, commandLowerings, expressionParses);
    const lowering = new MultiBindingLowering(
      loweringProductHandle,
      loweringIdentityHandle,
      site.toReference(),
      state,
      segments.map((segment) => segment.productHandle),
      instructions.map((instruction) => instruction.productHandle),
      site.sourceAddressHandle,
      compactFieldProvenance<MultiBindingLoweringField>([
        new FieldProvenance('site', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        segments.length === 0 ? null : new FieldProvenance('segments', source.provenanceHandle),
        instructions.length === 0 ? null : new FieldProvenance('instructions', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const loweringClaim = new SemanticClaim(
      this.store.handles.claim(`${local}:lowers-multi-binding`),
      site.productHandle,
      KernelVocabulary.Compiler.LowersMultiBinding.key,
      lowering.productHandle,
      source.provenanceHandle,
    );
    claims.push(loweringClaim);
    instructions.forEach((instruction, instructionIndex) => {
      claims.push(new SemanticClaim(
        this.store.handles.claim(`${local}:produces-instruction:${instructionIndex}`),
        lowering.productHandle,
        KernelVocabulary.Compiler.ProducesInstruction.key,
        instruction.productHandle,
        source.provenanceHandle,
      ));
      for (const [expressionIndex, expressionProductHandle] of expressionProductHandlesForInstruction(instruction).entries()) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:instruction:${instructionIndex}:uses-expression-parse:${expressionIndex}`),
          instruction.productHandle,
          KernelVocabulary.Compiler.UsesExpressionParse.key,
          expressionProductHandle,
          source.provenanceHandle,
        ));
      }
    });
    records.push(
      new CompilerIdentity(
        lowering.identityHandle,
        KernelVocabulary.Compiler.MultiBindingLowering.key,
        site.identityHandle,
        site.sourceAddressHandle,
        state,
      ),
      new MaterializedProduct(
        lowering.productHandle,
        KernelVocabulary.Compiler.MultiBindingLowering.key,
        lowering.identityHandle,
        lowering.sourceAddressHandle,
        source.provenanceHandle,
      ),
      loweringClaim,
      ...recordsForInstructions(directInstructions, lowering.identityHandle, source, claims),
    );

    return new MultiBindingLoweringResult(
      lowering,
      segments,
      commandLowerings,
      buildInputs,
      attributeSyntaxes,
      instructions,
      valueSites,
      expressionParses,
      records,
      claims,
      openSeams,
    );
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
    const interpretation = compilerWorld.attributeParser.interpret(segment.rawName);
    const matched = interpretation?.compiledPatternProductHandle == null
      ? null
      : findMatchedPattern(compilerWorld, interpretation.compiledPatternProductHandle);
    const execution = matched == null
      ? AttributePatternExecutionResult.plain(segment.rawName, segment.rawValue)
      : executeBuiltInAttributePattern(
        matched.handler,
        matched.pattern.pattern,
        segment.rawName,
        segment.rawValue,
        interpretation?.parts ?? [],
      ) ?? new AttributePatternExecutionResult(
        AttributeSyntaxKind.Open,
        segment.rawName,
        segment.rawValue,
        segment.rawName,
        null,
        interpretation?.parts ?? [],
      );
    const syntaxProductHandle = this.store.handles.product(`${local}:attribute-syntax`);
    const syntaxIdentityHandle = this.store.handles.identity(`${local}:attribute-syntax`);
    const syntax = new AttributeSyntax(
      syntaxProductHandle,
      syntaxIdentityHandle,
      execution.syntaxKind,
      execution.rawName,
      execution.rawValue,
      execution.target,
      execution.command,
      execution.parts,
      null,
      attribute.toReference(),
      sourceAddressHandle,
      compactFieldProvenance<AttributeSyntaxField>([
        new FieldProvenance('rawName', source.provenanceHandle),
        new FieldProvenance('rawValue', source.provenanceHandle),
        new FieldProvenance('target', source.provenanceHandle),
        execution.command == null ? null : new FieldProvenance('command', source.provenanceHandle),
        execution.parts.length === 0 ? null : new FieldProvenance('parts', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    return {
      syntax,
      records: [
        new CompilerIdentity(
          syntax.identityHandle,
          KernelVocabulary.Template.AttributeSyntax.key,
          site.identityHandle,
          sourceAddressHandle,
          syntax.rawName,
        ),
      ],
      claims: [],
    };
  }

  private createMultiBindingCommandBuildInput(
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
    const productHandle = this.store.handles.product(`${local}:build-input`);
    const identityHandle = this.store.handles.identity(`${local}:build-input`);
    const input = new BindingCommandBuildInput(
      productHandle,
      identityHandle,
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
    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:builds-command-input`),
      segment.productHandle,
      KernelVocabulary.Compiler.BuildsCommandInput.key,
      input.productHandle,
      source.provenanceHandle,
    );
    return {
      input,
      records: [
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
      ],
      claims: [claim],
    };
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
    const siteProductHandle = this.store.handles.product(`${local}:value-site`);
    const siteIdentityHandle = this.store.handles.identity(`${local}:value-site`);
    const parseProductHandle = this.store.handles.product(`${local}:expression-parse`);
    const parseIdentityHandle = this.store.handles.identity(`${local}:expression-parse`);
    const result = this.parser.parse(
      expression,
      entryFamily,
      this.expressionParseContext(sourceAddressHandle),
    );
    const site = new TemplateValueSite(
      siteProductHandle,
      siteIdentityHandle,
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
      compactFieldProvenance<TemplateValueSiteField>([
        new FieldProvenance('siteKind', source.provenanceHandle),
        new FieldProvenance('rawValue', source.provenanceHandle),
        new FieldProvenance('entryFamily', source.provenanceHandle),
        new FieldProvenance('node', source.provenanceHandle),
        new FieldProvenance('attribute', source.provenanceHandle),
        new FieldProvenance('syntax', source.provenanceHandle),
        new FieldProvenance('classification', source.provenanceHandle),
        new FieldProvenance('bindable', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const parse = new TemplateExpressionParse(
      parseProductHandle,
      parseIdentityHandle,
      site.toReference(),
      compilerWorld.expressionParser.productHandle,
      expressionParseStateForResult(result),
      result.kind,
      result,
      sourceAddressHandle,
      compactFieldProvenance<TemplateExpressionParseField>([
        new FieldProvenance('site', source.provenanceHandle),
        new FieldProvenance('parser', source.provenanceHandle),
        new FieldProvenance('state', source.provenanceHandle),
        new FieldProvenance('resultKind', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    const routeClaim = new SemanticClaim(
      this.store.handles.claim(`${local}:selects-value-site`),
      segment.productHandle,
      KernelVocabulary.Template.SelectsValueSite.key,
      site.productHandle,
      source.provenanceHandle,
    );
    const parseClaim = new SemanticClaim(
      this.store.handles.claim(`${local}:parses-to-expression-parse`),
      site.productHandle,
      KernelVocabulary.Template.ParsesToExpressionParse.key,
      parse.productHandle,
      source.provenanceHandle,
    );
    return {
      site,
      parse,
      claims: [routeClaim, parseClaim],
      records: [
        new CompilerIdentity(
          site.identityHandle,
          KernelVocabulary.Template.ValueSite.key,
          segment.identityHandle,
          sourceAddressHandle,
          `${segment.rawName}:Interpolation`,
        ),
        new MaterializedProduct(
          site.productHandle,
          KernelVocabulary.Template.ValueSite.key,
          site.identityHandle,
          sourceAddressHandle,
          source.provenanceHandle,
        ),
        new CompilerIdentity(
          parse.identityHandle,
          KernelVocabulary.Template.ExpressionParse.key,
          site.identityHandle,
          sourceAddressHandle,
          `${segment.rawName}:${result.kind}`,
        ),
        new MaterializedProduct(
          parse.productHandle,
          KernelVocabulary.Template.ExpressionParse.key,
          parse.identityHandle,
          sourceAddressHandle,
          source.provenanceHandle,
        ),
        routeClaim,
        parseClaim,
      ],
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
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    if (parse.resultKind === ExpressionParseResultKind.InterpolationAbsent) {
      return new SetPropertyInstruction(
        productHandle,
        identityHandle,
        owner.element.toReference(),
        attribute.toReference(),
        target,
        value,
        sourceAddressHandle,
        compactFieldProvenance<TemplateInstructionField>([
          new FieldProvenance('node', source.provenanceHandle),
          new FieldProvenance('attribute', source.provenanceHandle),
          new FieldProvenance('target', source.provenanceHandle),
          new FieldProvenance('value', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
    }
    return new InterpolationInstruction(
      productHandle,
      identityHandle,
      owner.element.toReference(),
      attribute.toReference(),
      target,
      [parse.productHandle],
      sourceAddressHandle,
      compactFieldProvenance<TemplateInstructionField>([
        new FieldProvenance('node', source.provenanceHandle),
        new FieldProvenance('attribute', source.provenanceHandle),
        new FieldProvenance('target', source.provenanceHandle),
        new FieldProvenance('expression', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private materializeCommandLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    buildInput: BindingCommandBuildInput,
    result: BindingCommandBuildResult,
    existingClaims: readonly SemanticClaim[],
  ): {
    readonly lowering: BindingCommandLowering;
    readonly records: readonly KernelStoreRecord[];
    readonly claims: readonly SemanticClaim[];
  } {
    const productHandle = this.store.handles.product(`${local}:lowering`);
    const identityHandle = this.store.handles.identity(`${local}:lowering`);
    const claims: SemanticClaim[] = [];
    const lowering = new BindingCommandLowering(
      productHandle,
      identityHandle,
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
    claims.push(new SemanticClaim(
      this.store.handles.claim(`${local}:lowers-binding-command`),
      buildInput.productHandle,
      KernelVocabulary.Compiler.LowersBindingCommand.key,
      lowering.productHandle,
      source.provenanceHandle,
    ));
    if (commandReference.productHandle != null) {
      claims.push(new SemanticClaim(
        this.store.handles.claim(`${local}:uses-binding-command-executable`),
        lowering.productHandle,
        KernelVocabulary.Compiler.UsesBindingCommandExecutable.key,
        commandReference.productHandle,
        source.provenanceHandle,
      ));
    }
    result.instructions.forEach((instruction, instructionIndex) => {
      claims.push(new SemanticClaim(
        this.store.handles.claim(`${local}:produces-instruction:${instructionIndex}`),
        lowering.productHandle,
        KernelVocabulary.Compiler.ProducesInstruction.key,
        instruction.productHandle,
        source.provenanceHandle,
      ));
      for (const [expressionIndex, expressionProductHandle] of expressionProductHandlesForInstruction(instruction).entries()) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:instruction:${instructionIndex}:uses-expression-parse:${expressionIndex}`),
          instruction.productHandle,
          KernelVocabulary.Compiler.UsesExpressionParse.key,
          expressionProductHandle,
          source.provenanceHandle,
        ));
      }
    });
    const allClaims = [...existingClaims, ...claims];
    return {
      lowering,
      claims,
      records: [
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
        ...recordsForInstructions(result.instructions, lowering.identityHandle, source, allClaims),
        ...claims,
      ],
    };
  }

  private expressionParseContext(addressHandle: AddressHandle | null): ExpressionParseContext | undefined {
    if (addressHandle == null) {
      return undefined;
    }
    const address = this.store.readAddress(addressHandle);
    if (!(address instanceof SourceSpanAddress)) {
      return undefined;
    }
    const fileAddress = this.store.readAddress(address.fileHandle);
    const file = fileAddress instanceof SourceFileAddress
      ? new SourceFileRef(fileAddress.handle, fileAddress.path)
      : null;
    return {
      baseSpan: sourceSpanFromBounds(address.start, address.end, file),
    };
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
      this.parser,
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

  private recordsForSource(input: BindingCommandLoweringInput): BindingCommandLoweringSourceSet {
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

  private handlesForLocal(local: string): {
    readonly buildInputProductHandle: ProductHandle;
    readonly buildInputIdentityHandle: IdentityHandle;
    readonly loweringProductHandle: ProductHandle;
    readonly loweringIdentityHandle: IdentityHandle;
  } {
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

function findMatchedPattern(
  world: TemplateCompilerWorldEmission,
  compiledPatternProductHandle: ProductHandle,
): {
  readonly pattern: { readonly pattern: string };
  readonly handler: BuiltInAttributePattern;
} | null {
  for (const emission of world.attributePatterns) {
    const pattern = emission.compiledPatterns.find((candidate) => candidate.productHandle === compiledPatternProductHandle);
    if (pattern == null) {
      continue;
    }
    return {
      pattern: pattern.definition,
      handler: emission.handler,
    };
  }
  return null;
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
  claims: readonly SemanticClaim[],
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

function instructionKindKeyFor(
  kind: TemplateInstruction['instructionKind'],
): InstructionKindKey {
  switch (kind) {
    case TemplateInstructionKind.HydrateElement:
      return KernelVocabulary.Instruction.HydrateElement.key;
    case TemplateInstructionKind.HydrateAttribute:
      return KernelVocabulary.Instruction.HydrateAttribute.key;
    case TemplateInstructionKind.HydrateTemplateController:
      return KernelVocabulary.Instruction.HydrateTemplateController.key;
    case TemplateInstructionKind.PropertyBinding:
      return KernelVocabulary.Instruction.PropertyBinding.key;
    case TemplateInstructionKind.Interpolation:
      return KernelVocabulary.Instruction.Interpolation.key;
    case TemplateInstructionKind.ListenerBinding:
      return KernelVocabulary.Instruction.ListenerBinding.key;
    case TemplateInstructionKind.IteratorBinding:
      return KernelVocabulary.Instruction.IteratorBinding.key;
    case TemplateInstructionKind.RefBinding:
      return KernelVocabulary.Instruction.RefBinding.key;
    case TemplateInstructionKind.LetBinding:
      return KernelVocabulary.Instruction.LetBinding.key;
    case TemplateInstructionKind.TextBinding:
      return KernelVocabulary.Instruction.TextBinding.key;
    case TemplateInstructionKind.AttributeBinding:
      return KernelVocabulary.Instruction.AttributeBinding.key;
    case TemplateInstructionKind.MultiAttr:
      return KernelVocabulary.Instruction.MultiAttr.key;
    case TemplateInstructionKind.SetProperty:
      return KernelVocabulary.Instruction.SetProperty.key;
    case TemplateInstructionKind.SetAttribute:
      return KernelVocabulary.Instruction.SetAttribute.key;
    case TemplateInstructionKind.SetClassAttribute:
      return KernelVocabulary.Instruction.SetClassAttribute.key;
    case TemplateInstructionKind.SetStyleAttribute:
      return KernelVocabulary.Instruction.SetStyleAttribute.key;
    case TemplateInstructionKind.StylePropertyBinding:
      return KernelVocabulary.Instruction.StylePropertyBinding.key;
    case TemplateInstructionKind.HydrateLetElement:
      return KernelVocabulary.Instruction.HydrateLetElement.key;
    case TemplateInstructionKind.SpreadTransferedBinding:
      return KernelVocabulary.Instruction.SpreadTransferedBinding.key;
    case TemplateInstructionKind.SpreadElementPropBinding:
      return KernelVocabulary.Instruction.SpreadElementPropBinding.key;
    case TemplateInstructionKind.SpreadValueBinding:
      return KernelVocabulary.Instruction.SpreadValueBinding.key;
    case TemplateInstructionKind.TranslationBinding:
      return KernelVocabulary.Instruction.TranslationBinding.key;
    case TemplateInstructionKind.TranslationBindBinding:
      return KernelVocabulary.Instruction.TranslationBindBinding.key;
    case TemplateInstructionKind.TranslationParametersBinding:
      return KernelVocabulary.Instruction.TranslationParametersBinding.key;
    case TemplateInstructionKind.StateBinding:
      return KernelVocabulary.Instruction.StateBinding.key;
    case TemplateInstructionKind.DispatchBinding:
      return KernelVocabulary.Instruction.DispatchBinding.key;
  }
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

function parseInlineMultiBindingSegments(rawValue: string): readonly ParsedMultiBindingSegment[] {
  const segments: ParsedMultiBindingSegment[] = [];
  const len = rawValue.length;
  let start = 0;
  let segmentIndex = 0;
  for (let i = 0; i < len; i += 1) {
    const ch = rawValue.charCodeAt(i);
    if (ch === 92 /* backslash */) {
      i += 1;
      continue;
    }
    if (ch !== 58 /* colon */) {
      continue;
    }

    const rawName = rawValue.slice(start, i);
    let valueStart = i + 1;
    while (valueStart < len && rawValue.charCodeAt(valueStart) <= 32 /* space */) {
      valueStart += 1;
    }

    let valueEnd = len;
    let cursor = valueStart;
    for (; cursor < len; cursor += 1) {
      const valueCh = rawValue.charCodeAt(cursor);
      if (valueCh === 92 /* backslash */) {
        cursor += 1;
        continue;
      }
      if (valueCh === 59 /* semicolon */) {
        valueEnd = cursor;
        break;
      }
    }

    segments.push(new ParsedMultiBindingSegment(
      segmentIndex++,
      rawName,
      rawValue.slice(valueStart, valueEnd),
      start,
      valueEnd,
      valueStart,
      valueEnd,
    ));

    let nextStart = valueEnd < len ? valueEnd + 1 : valueEnd;
    while (nextStart < len && rawValue.charCodeAt(nextStart) <= 32 /* space */) {
      nextStart += 1;
    }
    start = nextStart;
    i = nextStart - 1;
  }
  return segments;
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

function mapAttribute(
  element: HtmlElement,
  attr: string,
): string | null {
  const tagName = element.tagName.toUpperCase();
  const lowerAttr = attr.toLowerCase();
  const tagMapping = tagName === 'LABEL' && lowerAttr === 'for'
    ? 'htmlFor'
    : tagName === 'IMG' && lowerAttr === 'usemap'
      ? 'useMap'
      : tagName === 'INPUT'
        ? inputAttributeMapping(lowerAttr)
        : (tagName === 'TEXTAREA' && lowerAttr === 'maxlength')
          ? 'maxLength'
          : (tagName === 'TD' || tagName === 'TH')
            ? tableCellAttributeMapping(lowerAttr)
            : null;
  return tagMapping
    ?? globalAttributeMapping(lowerAttr)
    ?? (lowerAttr.startsWith('data-') ? attr : null);
}

function inputAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'maxlength':
      return 'maxLength';
    case 'minlength':
      return 'minLength';
    case 'formaction':
      return 'formAction';
    case 'formenctype':
      return 'formEncType';
    case 'formmethod':
      return 'formMethod';
    case 'formnovalidate':
      return 'formNoValidate';
    case 'formtarget':
      return 'formTarget';
    case 'inputmode':
      return 'inputMode';
    default:
      return null;
  }
}

function tableCellAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'rowspan':
      return 'rowSpan';
    case 'colspan':
      return 'colSpan';
    default:
      return null;
  }
}

function globalAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'accesskey':
      return 'accessKey';
    case 'contenteditable':
      return 'contentEditable';
    case 'tabindex':
      return 'tabIndex';
    case 'textcontent':
      return 'textContent';
    case 'innerhtml':
      return 'innerHTML';
    case 'scrolltop':
      return 'scrollTop';
    case 'scrollleft':
      return 'scrollLeft';
    case 'readonly':
      return 'readOnly';
    default:
      return null;
  }
}

function shouldDefaultToTwoWay(
  owner: OwnerElement,
  attr: string,
): boolean {
  const lowerAttr = attr.toLowerCase();
  switch (owner.element.tagName.toUpperCase()) {
    case 'INPUT': {
      const type = attributeValue(owner, 'type')?.toLowerCase() ?? '';
      switch (type) {
        case 'checkbox':
        case 'radio':
          return lowerAttr === 'checked';
        default:
          return lowerAttr === 'value'
            || lowerAttr === 'files'
            || lowerAttr === 'value-as-number'
            || lowerAttr === 'value-as-date';
      }
    }
    case 'TEXTAREA':
    case 'SELECT':
      return lowerAttr === 'value';
    default:
      switch (lowerAttr) {
        case 'textcontent':
        case 'innerhtml':
          return hasAttribute(owner, 'contenteditable');
        case 'scrolltop':
        case 'scrollleft':
          return true;
        default:
          return false;
      }
  }
}

function attributeValue(
  owner: OwnerElement,
  name: string,
): string | null {
  return owner.attributes.find((attribute) => attribute.rawName.toLowerCase() === name)?.rawValue ?? null;
}

function hasAttribute(
  owner: OwnerElement,
  name: string,
): boolean {
  return owner.attributes.some((attribute) => attribute.rawName.toLowerCase() === name);
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

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}

function encodeOpenSeamLocal(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'open';
}
