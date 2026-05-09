import {
  SourceFileAddress,
  SourceSpanAddress,
} from '../kernel/address.js';
import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import type { AttributeClassification, AttributeSyntax } from './attribute-syntax.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import type { TemplateExpressionParserService } from './compiler-world.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import type {
  HtmlAttributeReference,
  HtmlNodeReference,
} from './html-ir.js';
import {
  expressionParseStateForResult,
  TemplateExpressionParse,
  TemplateValueSite,
  type TemplateExpressionParseField,
  type TemplateValueSiteField,
  type TemplateValueSiteKind,
} from './value-site.js';

export class TemplateValueSitePublicationRequest {
  constructor(
    readonly siteLocal: string,
    readonly parseLocal: string | null,
    readonly parser: TemplateExpressionParserService,
    readonly provenanceHandle: ProvenanceHandle,
    readonly siteKind: TemplateValueSiteKind,
    readonly rawValue: string,
    readonly entryFamily: ExpressionType | null,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference | null,
    readonly syntax: AttributeSyntax | null,
    readonly classification: AttributeClassification | null,
    readonly bindingCommand: BindingCommandExecutableReference | null,
    readonly bindable: TemplateBindableReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly siteIdentityParentHandle: IdentityHandle,
    readonly siteIdentityDiscriminator: string,
    readonly routeSubjectHandle: ProductHandle | null,
    readonly parseIdentityDiscriminator: ((result: ExpressionParseResult) => string) | null,
  ) {}
}

export class TemplateValueSitePublication {
  constructor(
    readonly site: TemplateValueSite,
    readonly parse: TemplateExpressionParse | null,
    readonly result: ExpressionParseResult | null,
    readonly claims: readonly SemanticClaim[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class PublishedTemplateValueSite {
  constructor(
    readonly site: TemplateValueSite,
    readonly claims: readonly SemanticClaim[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class PublishedTemplateExpressionParse {
  constructor(
    readonly parse: TemplateExpressionParse,
    readonly result: ExpressionParseResult,
    readonly claims: readonly SemanticClaim[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class TemplateValueSiteHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class ResolvedTemplateExpressionParseRequest {
  constructor(
    readonly parseLocal: string,
    readonly entryFamily: ExpressionType,
    readonly parseIdentityDiscriminator: (result: ExpressionParseResult) => string,
    readonly result: ExpressionParseResult,
  ) {}
}

/** Publishes the shared ValueSite -> ExpressionParse record shape for compiler and runtime-owned template values. */
export class TemplateValueSitePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(request: TemplateValueSitePublicationRequest): TemplateValueSitePublication {
    const site = this.publishValueSite(request);
    if (request.entryFamily == null) {
      return new TemplateValueSitePublication(site.site, null, null, site.claims, site.records);
    }
    const parse = this.publishExpressionParse(request, site.site);
    return new TemplateValueSitePublication(
      site.site,
      parse.parse,
      parse.result,
      [...site.claims, ...parse.claims],
      [...site.records, ...parse.records],
    );
  }

  private publishValueSite(request: TemplateValueSitePublicationRequest): PublishedTemplateValueSite {
    const handles = this.valueSiteHandles(request.siteLocal);
    const site = this.valueSiteProduct(request, handles);
    const routeClaim = this.valueSiteRouteClaim(request, site);
    return new PublishedTemplateValueSite(
      site,
      nullableClaim(routeClaim),
      this.recordsForValueSite(request, site, routeClaim),
    );
  }

  private valueSiteHandles(siteLocal: string): TemplateValueSiteHandles {
    return new TemplateValueSiteHandles(
      this.store.handles.product(siteLocal),
      this.store.handles.identity(siteLocal),
    );
  }

  private valueSiteProduct(
    request: TemplateValueSitePublicationRequest,
    handles: TemplateValueSiteHandles,
  ): TemplateValueSite {
    return new TemplateValueSite(
      handles.productHandle,
      handles.identityHandle,
      request.siteKind,
      request.rawValue,
      request.entryFamily,
      request.node,
      request.attribute,
      request.syntax,
      request.classification,
      request.bindingCommand,
      request.bindable,
      request.sourceAddressHandle,
      this.valueSiteProvenance(request),
    );
  }

  private valueSiteRouteClaim(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
  ): SemanticClaim | null {
    return request.routeSubjectHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${request.siteLocal}:selects-value-site`),
        request.routeSubjectHandle,
        KernelVocabulary.Template.SelectsValueSite.key,
        site.productHandle,
        request.provenanceHandle,
      );
  }

  private recordsForValueSite(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
    routeClaim: SemanticClaim | null,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        site.identityHandle,
        KernelVocabulary.Template.ValueSite.key,
        request.siteIdentityParentHandle,
        request.sourceAddressHandle,
        request.siteIdentityDiscriminator,
      ),
      new MaterializedProduct(
        site.productHandle,
        KernelVocabulary.Template.ValueSite.key,
        site.identityHandle,
        request.sourceAddressHandle,
        request.provenanceHandle,
      ),
      ...nullableClaim(routeClaim),
    ];
  }

  private publishExpressionParse(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
  ): PublishedTemplateExpressionParse {
    const resolved = this.resolveExpressionParseRequest(request);
    const parse = this.expressionParseProduct(request, site, resolved);
    const claim = this.expressionParseClaim(request, site, parse, resolved);
    return new PublishedTemplateExpressionParse(
      parse,
      resolved.result,
      [claim],
      this.recordsForExpressionParse(request, site, parse, resolved, claim),
    );
  }

  private resolveExpressionParseRequest(
    request: TemplateValueSitePublicationRequest,
  ): ResolvedTemplateExpressionParseRequest {
    const entryFamily = request.entryFamily;
    if (entryFamily == null || request.parseLocal == null || request.parseIdentityDiscriminator == null) {
      throw new Error('Parser-owned template value sites require parse identity allocation.');
    }
    const result = request.parser.parse(
      request.rawValue,
      entryFamily,
      this.expressionParseContext(request.sourceAddressHandle),
    );
    return new ResolvedTemplateExpressionParseRequest(
      request.parseLocal,
      entryFamily,
      request.parseIdentityDiscriminator,
      result,
    );
  }

  private expressionParseProduct(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
    resolved: ResolvedTemplateExpressionParseRequest,
  ): TemplateExpressionParse {
    return new TemplateExpressionParse(
      this.store.handles.product(resolved.parseLocal),
      this.store.handles.identity(resolved.parseLocal),
      site.toReference(),
      request.parser.productHandle,
      expressionParseStateForResult(resolved.result),
      resolved.result.kind,
      resolved.result,
      request.sourceAddressHandle,
      this.expressionParseProvenance(request.provenanceHandle),
    );
  }

  private expressionParseClaim(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
    parse: TemplateExpressionParse,
    resolved: ResolvedTemplateExpressionParseRequest,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${resolved.parseLocal}:parses-to-expression-parse`),
      site.productHandle,
      KernelVocabulary.Template.ParsesToExpressionParse.key,
      parse.productHandle,
      request.provenanceHandle,
    );
  }

  private recordsForExpressionParse(
    request: TemplateValueSitePublicationRequest,
    site: TemplateValueSite,
    parse: TemplateExpressionParse,
    resolved: ResolvedTemplateExpressionParseRequest,
    parseClaim: SemanticClaim,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        parse.identityHandle,
        KernelVocabulary.Template.ExpressionParse.key,
        site.identityHandle,
        request.sourceAddressHandle,
        resolved.parseIdentityDiscriminator(resolved.result),
      ),
      new MaterializedProduct(
        parse.productHandle,
        KernelVocabulary.Template.ExpressionParse.key,
        parse.identityHandle,
        request.sourceAddressHandle,
        request.provenanceHandle,
      ),
      parseClaim,
    ];
  }

  private valueSiteProvenance(
    request: TemplateValueSitePublicationRequest,
  ): readonly FieldProvenance<TemplateValueSiteField>[] {
    return compactFieldProvenance<TemplateValueSiteField>([
      new FieldProvenance('siteKind', request.provenanceHandle),
      new FieldProvenance('rawValue', request.provenanceHandle),
      request.entryFamily == null ? null : new FieldProvenance('entryFamily', request.provenanceHandle),
      new FieldProvenance('node', request.provenanceHandle),
      request.attribute == null ? null : new FieldProvenance('attribute', request.provenanceHandle),
      request.syntax == null ? null : new FieldProvenance('syntax', request.provenanceHandle),
      request.classification == null ? null : new FieldProvenance('classification', request.provenanceHandle),
      request.bindingCommand == null ? null : new FieldProvenance('bindingCommand', request.provenanceHandle),
      request.bindable == null ? null : new FieldProvenance('bindable', request.provenanceHandle),
      new FieldProvenance('source', request.provenanceHandle),
    ]);
  }

  private expressionParseProvenance(
    provenanceHandle: ProvenanceHandle,
  ): readonly FieldProvenance<TemplateExpressionParseField>[] {
    return compactFieldProvenance<TemplateExpressionParseField>([
      new FieldProvenance('site', provenanceHandle),
      new FieldProvenance('parser', provenanceHandle),
      new FieldProvenance('state', provenanceHandle),
      new FieldProvenance('resultKind', provenanceHandle),
      new FieldProvenance('source', provenanceHandle),
    ]);
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
