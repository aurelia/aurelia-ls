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
  AttributeSyntaxSiteParseInput,
  parseAttributeSyntaxSite,
} from './attribute-syntax-parsing.js';
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

export interface AttributeSyntaxParseRequest {
  /** Store-local key for this attribute-syntax parse pass. */
  readonly localKey: string;
  /** Compiler unit that owns the HTML parse. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Parsed HTML products whose attributes should be interpreted. */
  readonly html: HtmlParseEmission;
  /** Legacy batch carrier for the selected compiler world; compilerReads spends its parser service. */
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

/** Run-owned inputs shared by every attribute-syntax site in one compilation occurrence. */
export interface AttributeSyntaxLoweringSessionRequest {
  /** Store-local key for the complete attribute-syntax lowering pass. */
  readonly localKey: string;
  /** Compiler unit that owns every lowered attribute syntax. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Required run-scoped compiler lookup surface. */
  readonly compilerReads: TemplateCompilerReadView;
}

/** One authored HTML attribute site admitted to the shared attribute-syntax lowering run. */
export interface AuthoredAttributeSyntaxSiteRequest {
  /** Exact store-local key chosen by the caller for this site. */
  readonly localKey: string;
  /** Authored HTML attribute product to lower. */
  readonly attribute: HtmlAttribute;
  /** Browser-shaped namespace of the element that owns the attribute. */
  readonly namespace: HtmlNamespaceKind | undefined;
}

/** Exact product, normalized rows, and claims emitted by one lowered authored attribute site. */
export class AuthoredAttributeSyntaxSiteEmission {
  constructor(
    readonly syntax: AttributeSyntax,
    readonly records: readonly KernelStoreRecord[],
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class AttributeSyntaxSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/**
 * Run-scoped attribute-syntax lowering authority.
 *
 * Sites are lowered independently, but source provenance, normalized row ordering, claims, and the final
 * materialization/publication remain owned by one compilation occurrence. This boundary consumes authored
 * HtmlAttribute names and values. It is not an adapter for browser-normalized or compiler-hook-rewritten values.
 */
export class AttributeSyntaxLoweringSession {
  private readonly source: AttributeSyntaxSourceSet;
  private readonly records: KernelStoreRecord[];
  private readonly syntaxes: AttributeSyntax[] = [];
  private readonly claims: SemanticClaim[] = [];
  private readonly occupiedSiteKeys = new Set<string>();
  private finished = false;

  constructor(
    private readonly store: KernelPublicationContext,
    private readonly input: AttributeSyntaxLoweringSessionRequest,
  ) {
    this.source = this.recordsForSource(input);
    this.records = [...this.source.records];
  }

  lowerAuthoredSite(input: AuthoredAttributeSyntaxSiteRequest): AuthoredAttributeSyntaxSiteEmission {
    this.assertOpen();
    if (this.occupiedSiteKeys.has(input.localKey)) {
      throw new Error(`Attribute-syntax lowering site ${input.localKey} was already admitted to this session.`);
    }
    this.occupiedSiteKeys.add(input.localKey);

    const parse = parseAttributeSyntaxSite(
      this.input.compilerReads,
      AttributeSyntaxSiteParseInput.authored(
        input.attribute.rawName,
        input.attribute.rawValue,
        input.namespace,
      ),
    ).parse;
    const partSources = attributeSyntaxPartSources(
      this.store,
      input.localKey,
      input.attribute.nameAddressHandle,
      input.attribute.rawName,
      parse,
    );
    const syntax = this.createAttributeSyntax(input, parse, partSources);
    const claims = this.claimsForAttributeSyntax(input, syntax, parse.executableProductHandle);
    const emission = new AuthoredAttributeSyntaxSiteEmission(
      syntax,
      [
        ...partSources.records,
        ...this.recordsForAttributeSyntaxProduct(input.attribute, syntax),
      ],
      claims,
    );

    this.syntaxes.push(emission.syntax);
    this.records.push(...emission.records);
    this.claims.push(...emission.claims);
    return emission;
  }

  finish(): AttributeSyntaxParseEmission {
    this.assertOpen();
    this.finished = true;
    const records = [
      ...this.records,
      ...this.claims,
      new MaterializationRecord(
        this.store.handles.materialization(`attribute-syntax:${this.input.localKey}`),
        this.input.compilationUnit.identityHandle,
        this.syntaxes.map((syntax) => syntax.productHandle),
        this.claims.map((claim) => claim.handle),
      ),
    ];
    const emission = new AttributeSyntaxParseEmission(this.syntaxes, records);
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `attribute-syntax:${this.input.localKey}`),
      publishProductDetails(TemplateProductDetails.AttributeSyntax, emission.syntaxes),
    ));
    return emission;
  }

  private createAttributeSyntax(
    input: AuthoredAttributeSyntaxSiteRequest,
    parse: AttributeParserParseResult,
    partSources: AttributeSyntaxPartSources,
  ): AttributeSyntax {
    const productHandle = this.store.handles.product(input.localKey);
    const identityHandle = this.store.handles.identity(input.localKey);
    return bindProductDetailEnvelope(new AttributeSyntax(
      parse.execution.syntaxKind,
      input.attribute.rawName,
      parse.execution.rawName,
      input.attribute.nameAddressHandle,
      input.attribute.rawValue,
      parse.execution.target,
      partSources.targetSourceAddressHandle,
      parse.execution.command,
      partSources.commandSourceAddressHandle,
      parse.execution.parts,
      partSources.patternParts,
      parse.pattern,
      parse.interpretation?.compiledPatternProductHandle ?? null,
      partSources.patternLiterals,
      input.attribute.toReference(),
      [],
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.AttributeSyntax.key,
      identityHandle,
      input.attribute.sourceAddressHandle,
      this.source.provenanceHandle,
    ));
  }

  private claimsForAttributeSyntax(
    input: AuthoredAttributeSyntaxSiteRequest,
    syntax: AttributeSyntax,
    executableProductHandle: AttributeParserParseResult['executableProductHandle'],
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`${input.localKey}:parses-to-attribute-syntax`),
        input.attribute.productHandle,
        KernelVocabulary.Template.ParsesToAttributeSyntax.key,
        syntax.productHandle,
        this.source.provenanceHandle,
      ),
      ...(executableProductHandle == null
        ? []
        : [
          new SemanticClaim(
            this.store.handles.claim(`${input.localKey}:references-attribute-pattern`),
            syntax.productHandle,
            KernelVocabulary.Template.ReferencesResource.key,
            executableProductHandle,
            this.source.provenanceHandle,
          ),
        ]),
    ];
  }

  private recordsForAttributeSyntaxProduct(
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

  private recordsForSource(input: AttributeSyntaxLoweringSessionRequest): AttributeSyntaxSourceSet {
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

  private assertOpen(): void {
    if (this.finished) {
      throw new Error(`Attribute-syntax lowering session ${this.input.localKey} is already finished.`);
    }
  }
}

/** Interprets authored HTML attributes through the runtime-shaped IAttributeParser model. */
export class AttributeSyntaxMaterializer {
  constructor(
    /** Hot analysis store that receives AttrSyntax records. */
    readonly store: KernelPublicationContext,
  ) {}

  parse(input: AttributeSyntaxParseRequest): AttributeSyntaxParseEmission {
    const session = this.beginSession(input);
    const attributes = input.html.attributes;
    const ownersByAttribute = htmlElementAttributeOwnersByAttributeProduct(
      input.html.nodes,
      attributes,
    );
    attributes.forEach((attribute, index) => {
      session.lowerAuthoredSite({
        localKey: `attribute-syntax:${input.localKey}:${index}`,
        attribute,
        namespace: ownersByAttribute.get(attribute.productHandle)?.namespace,
      });
    });
    return session.finish();
  }

  beginSession(input: AttributeSyntaxLoweringSessionRequest): AttributeSyntaxLoweringSession {
    return new AttributeSyntaxLoweringSession(this.store, input);
  }
}
