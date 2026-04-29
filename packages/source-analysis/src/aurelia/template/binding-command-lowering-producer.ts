import {
  SourceFileAddress,
  SourceSpanAddress,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
  OpenSeamSeverity,
} from '../kernel/derivation.js';
import { DerivationPhase } from '../kernel/derivation.js';
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
  CompilerIdentityKind,
  IdentityStability,
  InstructionIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceMode,
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
  type ProductKindKey,
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
import type { AttributeSyntaxParseEmission } from './attribute-syntax-producer.js';
import type {
  AttributeClassificationEmission,
} from './attribute-classification-producer.js';
import {
  AttributeClassification,
  AttributePatternExecutionResult,
  AttributeSyntax,
  AttributeSyntaxKind,
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
  type BindingCommandBuildInputField,
  type BindingCommandLoweringField,
} from './binding-command-execution.js';
import {
  executeBuiltInAttributePattern,
  type BuiltInAttributePattern,
  type BuiltInBindingCommand,
} from './built-in-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-producer.js';
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
import type { TemplateValueSiteEmission } from './value-site-producer.js';
import {
  HtmlAttribute,
  HtmlElement,
  HtmlAttributeReference,
} from './html-ir.js';
import type {
  HtmlNodeReference,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parser-producer.js';
import {
  AttributeBindingInstruction,
  DispatchBindingInstruction,
  IteratorBindingInstruction,
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  RefBindingInstruction,
  SpreadValueBindingInstruction,
  StateBindingInstruction,
  TemplateInstructionKind,
  TranslationBindBindingInstruction,
  TranslationParametersBindingInstruction,
  type TemplateInstruction,
  type TemplateInstructionField,
} from './instruction-ir.js';
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
    kind: TemplateInstructionKind,
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
    const addressHandle = info.sourceAddressHandle;
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
        IdentityStability.SourceStable,
        CompilerIdentityKind.TemplateValueSite,
        this.classification.identityHandle,
        addressHandle,
        `${this.command.name}:${entryFamily}`,
      ),
      product(
        site.productHandle,
        KernelVocabulary.Template.ValueSite.key,
        site.identityHandle,
        addressHandle,
        this.source.provenanceHandle,
        [routeClaim?.handle ?? null, claim.handle].filter((handle): handle is ClaimHandle => handle != null),
      ),
      new CompilerIdentity(
        parse.identityHandle,
        IdentityStability.SourceStable,
        CompilerIdentityKind.TemplateExpressionParse,
        site.identityHandle,
        addressHandle,
        `${this.command.name}:${result.kind}`,
      ),
      product(
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
export class BindingCommandLoweringProducer {
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
    return emission;
  }

  private recordsForLowering(input: BindingCommandLoweringInput): BindingCommandLoweringEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const buildInputs: BindingCommandBuildInput[] = [];
    const lowerings: BindingCommandLowering[] = [];
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
          IdentityStability.SourceStable,
          CompilerIdentityKind.BindingCommandBuildInput,
          classification.identityHandle,
          buildInput.sourceAddressHandle,
          classification.bindingCommand.name,
        ),
        product(
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
          IdentityStability.SourceStable,
          CompilerIdentityKind.BindingCommandLowering,
          buildInput.identityHandle,
          lowering.sourceAddressHandle,
          commandReference.name,
        ),
        product(
          lowering.productHandle,
          KernelVocabulary.Compiler.BindingCommandLowering.key,
          lowering.identityHandle,
          lowering.sourceAddressHandle,
          source.provenanceHandle,
          claimsForSubject(claims, lowering.productHandle).map((claim) => claim.handle),
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

    records.push(
      ...claims.filter((claim) => records.indexOf(claim) < 0),
      new MaterializationRecord(
        this.store.handles.materialization(`binding-command-lowering:${input.localKey}`),
        DerivationPhase.Lowering,
        input.compilationUnit.identityHandle,
        materializationState(lowerings, expressionParses, openSeams),
        [
          ...buildInputs.map((buildInput) => buildInput.productHandle),
          ...lowerings.map((lowering) => lowering.productHandle),
          ...instructions.map((instruction) => instruction.productHandle),
          ...valueSites.map((site) => site.productHandle),
          ...expressionParses.map((parse) => parse.productHandle),
        ],
        claims.map((claim) => claim.handle),
        [],
        openSeams.map((seam) => seam.handle),
      ),
    );

    return new BindingCommandLoweringEmission(
      buildInputs,
      lowerings,
      instructions,
      valueSites,
      expressionParses,
      records,
    );
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
  ): OpenLoweringResult {
    const executable = commandMatch.executable;
    const commandReference = executable.toReference();
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
      classification.bindable,
      this.parser,
    );
    const buildInfo = new BindingCommandBuildInfo(
      classification.ownerNode,
      attribute.toReference(),
      syntax,
      classification.bindable?.definition ?? null,
      buildInput.productHandle,
      buildInput.bindableOwnerProductHandle,
      buildInput.definitionProductHandle,
      buildInput.sourceAddressHandle,
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
        OpenSeamSeverity.Error,
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
          result.state === BindingCommandLoweringState.Invalid ? OpenSeamSeverity.Error : OpenSeamSeverity.Blocked,
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
    severity = OpenSeamSeverity.Blocked,
    state = BindingCommandLoweringState.Open,
  ): OpenLoweringResult {
    return new OpenLoweringResult(
      new BindingCommandBuildResult(state, [], summary),
      [this.openSeam(local, source, addressHandle, summary, seamKindKey, severity)],
    );
  }

  private openSeam(
    local: string,
    source: BindingCommandLoweringSourceSet,
    addressHandle: AddressHandle | null,
    summary: string,
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Compiler.OpenExecutableBody.key,
    severity = OpenSeamSeverity.Blocked,
  ): OpenSeam {
    return new OpenSeam(
      this.store.handles.openSeam(`${local}:open:${encodeOpenSeamLocal(summary)}`),
      seamKindKey,
      severity,
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
          ProvenanceMode.Derived,
          [evidenceHandle],
          [],
          'Runtime-shaped binding-command lowering before final instruction sequence assembly.',
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
      IdentityStability.SourceStable,
      ownerIdentityHandle,
      instructionKindKeyFor(instruction.instructionKind),
    ),
    product(
      instruction.productHandle,
      KernelVocabulary.Instruction.Instruction.key,
      instruction.identityHandle,
      instruction.sourceAddressHandle,
      source.provenanceHandle,
      claimsForSubject(claims, instruction.productHandle).map((claim) => claim.handle),
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

function materializationState(
  lowerings: readonly BindingCommandLowering[],
  parses: readonly TemplateExpressionParse[],
  openSeams: readonly OpenSeam[],
): MaterializationState {
  if (
    lowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Invalid)
    || parses.some((parse) => parse.state === TemplateExpressionParseState.Error)
    || openSeams.some((seam) => seam.severity === OpenSeamSeverity.Error)
  ) {
    return MaterializationState.Invalid;
  }
  if (
    lowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Open)
    || openSeams.some((seam) => seam.severity === OpenSeamSeverity.Blocked)
  ) {
    return MaterializationState.Open;
  }
  if (
    lowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Partial)
    || parses.some((parse) => parse.state !== TemplateExpressionParseState.Complete)
    || openSeams.length > 0
  ) {
    return MaterializationState.Partial;
  }
  return MaterializationState.Complete;
}

function product(
  handle: ProductHandle,
  productKind: ProductKindKey,
  identityHandle: IdentityHandle,
  addressHandle: AddressHandle | null,
  provenanceHandle: ProvenanceHandle,
  claimHandles: readonly ClaimHandle[] = [],
): MaterializedProduct {
  return new MaterializedProduct(
    handle,
    productKind,
    identityHandle,
    addressHandle,
    provenanceHandle,
    claimHandles,
  );
}

function claimsForSubject(
  claims: readonly SemanticClaim[],
  subjectHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) => claim.subjectHandle === subjectHandle);
}

function encodeOpenSeamLocal(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'open';
}
