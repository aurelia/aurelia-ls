import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  type KernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetails,
} from '../kernel/publication.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  AttributeSyntax,
  type AttributeParserParseResult,
} from './attribute-syntax.js';
import {
  attributeSyntaxPartSources,
  type AttributeSyntaxPartSources,
} from './attribute-syntax-source.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilerReadView } from './compiler-read-view.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  htmlElementAttributeOwnersByAttributeProduct,
  type HtmlAttribute,
  type HtmlNamespaceKind,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { TemplateProductDetails } from './product-details.js';
import { runtimeAttributeName } from './runtime-dom-name.js';

export interface AttributeSyntaxParseRequest {
  /** Store-local key for this attribute-syntax parse pass. */
  readonly localKey: string;
  /** Compiler unit that owns the HTML parse. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Parsed HTML products whose attributes should be interpreted. */
  readonly html: HtmlParseEmission;
  /** Compiler world that supplies the runtime-shaped attribute parser service. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
  /** Required run-scoped compiler lookup surface. */
  readonly compilerReads: TemplateCompilerReadView;
}

export class AttributeSyntaxParseEmission {
  constructor(
    readonly syntaxes: readonly AttributeSyntax[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class AttributeSyntaxSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class AttributeSyntaxPublication {
  constructor(
    readonly syntax: AttributeSyntax,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

/** Interprets authored HTML attributes through the runtime-shaped IAttributeParser model. */
export class AttributeSyntaxMaterializer {
  constructor(
    /** Hot analysis store that receives AttrSyntax records. */
    readonly store: KernelPublicationContext,
  ) {}

  parse(input: AttributeSyntaxParseRequest): AttributeSyntaxParseEmission {
    const emission = this.recordsForParse(input);
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `attribute-syntax:${input.localKey}`),
      publishProductDetails(TemplateProductDetails.AttributeSyntax, emission.syntaxes),
    ));
    return emission;
  }

  private recordsForParse(input: AttributeSyntaxParseRequest): AttributeSyntaxParseEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const syntaxes: AttributeSyntax[] = [];
    const claims: SemanticClaim[] = [];
    const ownersByAttribute = htmlElementAttributeOwnersByAttributeProduct(
      input.html.nodes,
      input.html.attributes,
    );
    input.html.attributes.forEach((attribute, index) => {
      const namespace = ownersByAttribute.get(attribute.productHandle)?.namespace;
      const publication = this.publishAttributeSyntax(
        `attribute-syntax:${input.localKey}:${index}`,
        source,
        input,
        attribute,
        namespace,
      );
      syntaxes.push(publication.syntax);
      records.push(...publication.records);
      claims.push(...publication.claims);
    });

    records.push(
      ...claims,
      new MaterializationRecord(
        this.store.handles.materialization(`attribute-syntax:${input.localKey}`),
        input.compilationUnit.identityHandle,
        syntaxes.map((syntax) => syntax.productHandle),
        claims.map((claim) => claim.handle),
      ),
    );

    return new AttributeSyntaxParseEmission(syntaxes, records);
  }

  private publishAttributeSyntax(
    local: string,
    source: AttributeSyntaxSourceSet,
    input: AttributeSyntaxParseRequest,
    attribute: HtmlAttribute,
    namespace: HtmlNamespaceKind | undefined,
  ): AttributeSyntaxPublication {
    // TemplateCompiler receives DOM Attr.name after template.innerHTML parsing, not the
    // source spelling. Keep the authored HtmlAttribute as source authority while feeding
    // the runtime-shaped parser the browser-normalized name it actually observes.
    const parse = input.compilerReads.parseAttribute(
      runtimeAttributeName(attribute.rawName, namespace),
      attribute.rawValue,
    );
    const partSources = attributeSyntaxPartSources(
      this.store,
      local,
      attribute.nameAddressHandle,
      attribute.rawName,
      parse,
    );
    const syntax = this.createAttributeSyntax(local, source, attribute, parse, partSources);
    const claims = this.claimsForAttributeSyntax(local, source, attribute, syntax, parse.executableProductHandle);
    return new AttributeSyntaxPublication(
      syntax,
      [...partSources.records, ...this.recordsForAttributeSyntaxProduct(source, attribute, syntax)],
      claims,
    );
  }

  private createAttributeSyntax(
    local: string,
    source: AttributeSyntaxSourceSet,
    attribute: HtmlAttribute,
    parse: AttributeParserParseResult,
    partSources: AttributeSyntaxPartSources,
  ): AttributeSyntax {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    return bindProductDetailEnvelope(new AttributeSyntax(
      parse.execution.syntaxKind,
      attribute.rawName,
      parse.execution.rawName,
      attribute.nameAddressHandle,
      attribute.rawValue,
      parse.execution.target,
      partSources.targetSourceAddressHandle,
      parse.execution.command,
      partSources.commandSourceAddressHandle,
      parse.execution.parts,
      partSources.patternParts,
      parse.pattern,
      parse.interpretation?.compiledPatternProductHandle ?? null,
      partSources.patternLiterals,
      attribute.toReference(),
      [],
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.AttributeSyntax.key,
      identityHandle,
      attribute.sourceAddressHandle,
      source.provenanceHandle,
    ));
  }

  private claimsForAttributeSyntax(
    local: string,
    source: AttributeSyntaxSourceSet,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
    executableProductHandle: AttributeParserParseResult['executableProductHandle'],
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${local}:parses-to-attribute-syntax`),
        attribute.productHandle,
        KernelVocabulary.Template.ParsesToAttributeSyntax.key,
        syntax.productHandle,
        source.provenanceHandle,
      ),
      ...(executableProductHandle == null
        ? []
        : [
          new SemanticClaim(
            this.store.handles.claim(`${local}:references-attribute-pattern`),
            syntax.productHandle,
            KernelVocabulary.Template.ReferencesResource.key,
            executableProductHandle,
            source.provenanceHandle,
          ),
        ]),
    ];
  }

  private recordsForAttributeSyntaxProduct(
    source: AttributeSyntaxSourceSet,
    attribute: HtmlAttribute,
    syntax: AttributeSyntax,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        syntax.identityHandle,
        KernelVocabulary.Template.AttributeSyntax.key,
        attribute.identityHandle,
        attribute.sourceAddressHandle,
        attribute.rawName,
      ),
      requireProductDetailEnvelope(syntax, 'template.attribute-syntax'),
    ];
  }

  private recordsForSource(input: AttributeSyntaxParseRequest): AttributeSyntaxSourceSet {
    const evidenceHandle = this.store.handles.evidence(`attribute-syntax:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`attribute-syntax:${input.localKey}`);
    return new AttributeSyntaxSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.Scope],
          'Attribute parser consumed authored HTML attributes and the compiler-world IAttributeParser service.',
          input.compilationUnit.sourceAddressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      provenanceHandle,
    );
  }
}
