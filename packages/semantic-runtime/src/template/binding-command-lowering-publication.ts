import {
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
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  InstructionIdentity,
} from '../kernel/identity.js';
import {
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { ExpressionType } from '../expression/ast.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import {
  AttributeClassification,
  AttributeSyntax,
  type AttributeParserParseResult,
} from './attribute-syntax.js';
import type {
  BindingCommandLoweringRequest,
} from './binding-command-lowering-materializer.js';
import {
  BindingCommandBuildInput,
  BindingCommandBuildInputKind,
  BindingCommandBuildResult,
  BindingCommandLowering,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import {
  TemplateValueSitePublicationRequest,
  TemplateValueSitePublisher,
} from './value-site-publication.js';
import {
  HtmlAttribute,
  HtmlElementAttributeOwner,
  HtmlAttributeReference,
} from './html-ir.js';
import {
  ParsedMultiBindingSegment,
} from './multi-binding-segments.js';
import {
  expressionProductHandlesForInstruction,
  InterpolationInstruction,
  SetPropertyInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import { instructionKindKeyFor } from './instruction-vocabulary.js';

export type CommandAttributeClassification = AttributeClassification & {
  readonly bindingCommand: NonNullable<AttributeClassification['bindingCommand']>;
};

export class BindingCommandLoweringSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceRecord['handle'],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export type BindingCommandLoweringHandleSet = {
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

export class PublishedBindingCommandLowering {
  constructor(
    readonly lowering: BindingCommandLowering,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

export interface PublishedBindingCommandBuild {
  readonly input: BindingCommandBuildInput;
  readonly records: readonly KernelStoreRecord[];
  readonly claims: readonly SemanticClaim[];
}

export interface PublishedMultiBindingExpressionParse {
  readonly site: TemplateValueSite;
  readonly parse: TemplateExpressionParse;
  readonly records: readonly KernelStoreRecord[];
  readonly claims: readonly SemanticClaim[];
}

export class PublishedMultiBindingSegment {
  constructor(
    readonly segment: MultiBindingSegment,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

export class PublishedMultiBindingAttributeSyntax {
  constructor(
    readonly syntax: AttributeSyntax,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

export interface MultiBindingSegmentPublicationSelection {
  readonly bindable: TemplateBindableReference | null;
  readonly commandReference: MultiBindingSegment['command'];
}

/** Publishes ordinary binding-command build inputs and command-lowering products. */
export class BindingCommandProductPublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publishBindingCommandBuildInput(
    local: string,
    source: BindingCommandLoweringSourceSet,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
  ): PublishedBindingCommandBuild {
    const handles = this.handlesForLocal(local);
    const buildInput = this.createBindingCommandBuildInput(handles, classification, syntax, attribute);
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

  materializeCommandLowering(
    local: string,
    source: BindingCommandLoweringSourceSet,
    commandReference: BindingCommandLowering['command'],
    buildInput: BindingCommandBuildInput,
    result: BindingCommandBuildResult,
  ): PublishedBindingCommandLowering {
    const lowering = this.createBindingCommandLowering(
      local,
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

  private createBindingCommandBuildInput(
    handles: BindingCommandLoweringHandleSet,
    classification: CommandAttributeClassification,
    syntax: AttributeSyntax | null,
    attribute: HtmlAttribute | null,
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
      classification.bindable?.reference.ownerDefinitionProductHandle ?? null,
      classification.resource?.definitionProductHandle ?? null,
      syntax?.sourceAddressHandle ?? attribute?.sourceAddressHandle ?? classification.sourceAddressHandle,
      [],
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

  private createBindingCommandLowering(
    local: string,
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
      result.message,
      result.frameworkErrorCode,
      result.instructions.map((instruction) => instruction.productHandle),
      buildInput.sourceAddressHandle,
      [],
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
      ...claimsForProducedInstructions(this.store, local, source, lowering.productHandle, instructions),
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

  private handlesForLocal(local: string): BindingCommandLoweringHandleSet {
    return {
      buildInputProductHandle: this.store.handles.product(`${local}:build-input`),
      buildInputIdentityHandle: this.store.handles.identity(`${local}:build-input`),
      loweringProductHandle: this.store.handles.product(`${local}:lowering`),
      loweringIdentityHandle: this.store.handles.identity(`${local}:lowering`),
    };
  }
}

/** Owns binding-command lowering product envelopes, provenance, claims, and source-address publication. */
export class BindingCommandLoweringPublisher {
  private readonly valueSitePublisher: TemplateValueSitePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.valueSitePublisher = new TemplateValueSitePublisher(store);
  }

  recordsForSource(input: BindingCommandLoweringRequest): BindingCommandLoweringSourceSet {
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

  openSeam(
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

  publishMultiBindingLoweringRecords(
    local: string,
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

  publishMultiBindingAttributeSyntax(
    local: string,
    site: TemplateValueSite,
    source: BindingCommandLoweringSourceSet,
    attribute: HtmlAttribute,
    parse: AttributeParserParseResult,
    sourceAddressHandle: AddressHandle | null,
  ): PublishedMultiBindingAttributeSyntax {
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

  publishMultiBindingSegment(
    local: string,
    source: BindingCommandLoweringSourceSet,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    parsed: ParsedMultiBindingSegment,
    selection: MultiBindingSegmentPublicationSelection,
    sourceAddressHandle: AddressHandle | null,
  ): PublishedMultiBindingSegment {
    const segment = this.createMultiBindingSegment(
      local,
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

  publishMultiBindingCommandBuildInput(
    local: string,
    source: BindingCommandLoweringSourceSet,
    owner: HtmlElementAttributeOwner,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    bindable: TemplateBindableReference,
  ): PublishedBindingCommandBuild {
    const handles = this.multiBindingCommandBuildInputHandles(local);
    const input = this.createMultiBindingCommandBuildInput(
      handles,
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

  publishMultiBindingExpressionParse(
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
  ): PublishedMultiBindingExpressionParse {
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

  createMultiBindingValueInstruction(
    local: string,
    owner: HtmlElementAttributeOwner,
    attribute: HtmlAttribute,
    target: string,
    value: string,
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateInstruction {
    const handles = this.templateInstructionHandles(local);
    return parse.resultKind === ExpressionParseResultKind.InterpolationAbsent
      ? this.createMultiBindingSetPropertyInstruction(handles, owner, attribute, target, value, sourceAddressHandle)
      : this.createMultiBindingInterpolationInstruction(handles, owner, attribute, target, parse, sourceAddressHandle);
  }

  segmentSourceAddress(
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

  claimsForMultiBindingLowering(
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
      ...claimsForProducedInstructions(this.store, local, source, lowering.productHandle, instructions),
    ];
  }

  private createMultiBindingSegment(
    local: string,
    site: TemplateValueSite,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    parsed: ParsedMultiBindingSegment,
    selection: MultiBindingSegmentPublicationSelection,
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
      [],
    );
  }

  private multiBindingSegmentHandles(local: string): MultiBindingSegmentHandleSet {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
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
    return [
      ...this.recordsForMultiBindingAttributeSyntaxProduct(source, syntax),
      ...this.recordsForMultiBindingSegmentProduct(site, source, syntax, segment, sourceAddressHandle),
      ...multiBindingSegmentPublicationClaims(claims),
    ];
  }

  private recordsForMultiBindingAttributeSyntaxProduct(
    source: BindingCommandLoweringSourceSet,
    syntax: AttributeSyntax,
  ): readonly KernelStoreRecord[] {
    return [requireProductDetailEnvelope(syntax, 'template.attribute-syntax')];
  }

  private recordsForMultiBindingSegmentProduct(
    site: TemplateValueSite,
    source: BindingCommandLoweringSourceSet,
    syntax: AttributeSyntax,
    segment: MultiBindingSegment,
    sourceAddressHandle: AddressHandle | null,
  ): readonly KernelStoreRecord[] {
    return [
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
    ];
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
    return bindProductDetailEnvelope(new AttributeSyntax(
      execution.syntaxKind,
      execution.rawName,
      execution.rawValue,
      execution.target,
      execution.command,
      execution.parts,
      parse.pattern,
      attribute.toReference(),
      [],
    ), new MaterializedProduct(
      handles.productHandle,
      KernelVocabulary.Template.AttributeSyntax.key,
      handles.identityHandle,
      sourceAddressHandle,
      source.provenanceHandle,
    ));
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
    owner: HtmlElementAttributeOwner,
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
      bindable.reference.ownerDefinitionProductHandle,
      bindable.reference.ownerDefinitionProductHandle,
      syntax.sourceAddressHandle ?? segment.sourceAddressHandle,
      [],
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

  private templateInstructionHandles(local: string): TemplateInstructionHandleSet {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }

  private createMultiBindingSetPropertyInstruction(
    handles: TemplateInstructionHandleSet,
    owner: HtmlElementAttributeOwner,
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
      [],
    );
  }

  private createMultiBindingInterpolationInstruction(
    handles: TemplateInstructionHandleSet,
    owner: HtmlElementAttributeOwner,
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
      [],
    );
  }

}

function claimsForProducedInstructions(
  store: KernelStore,
  local: string,
  source: BindingCommandLoweringSourceSet,
  producerHandle: ProductHandle,
  instructions: readonly TemplateInstruction[],
): readonly SemanticClaim[] {
  return instructions.flatMap((instruction, instructionIndex) => [
    new SemanticClaim(
      store.handles.claim(`${local}:produces-instruction:${instructionIndex}`),
      producerHandle,
      KernelVocabulary.Compiler.ProducesInstruction.key,
      instruction.productHandle,
      source.provenanceHandle,
    ),
    ...expressionProductHandlesForInstruction(instruction).map((expressionProductHandle, expressionIndex) =>
      new SemanticClaim(
        store.handles.claim(`${local}:instruction:${instructionIndex}:uses-expression-parse:${expressionIndex}`),
        instruction.productHandle,
        KernelVocabulary.Compiler.UsesExpressionParse.key,
        expressionProductHandle,
        source.provenanceHandle,
      )
    ),
  ]);
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

function multiBindingSegmentPublicationClaims(
  claims: readonly SemanticClaim[],
): readonly SemanticClaim[] {
  return [
    claimWithPredicate(claims, KernelVocabulary.Compiler.SplitsMultiBindingSegment.key),
    claimWithPredicate(claims, KernelVocabulary.Template.ParsesToAttributeSyntax.key),
  ].filter((claim): claim is SemanticClaim => claim != null);
}

function claimWithPredicate(
  claims: readonly SemanticClaim[],
  predicateKey: SemanticClaim['predicateKey'],
): SemanticClaim | null {
  return claims.find((claim) => claim.predicateKey === predicateKey) ?? null;
}

function encodeOpenSeamLocal(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'open';
}
