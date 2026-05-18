import type { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import {
  MaterializationRecord,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { ExpressionType } from '../expression/ast.js';
import { hasInterpolationStart } from '../expression/expression-boundary-scanner.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { AttributeClassificationEmission } from './attribute-classification-materializer.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
  type AttributeSyntax,
} from './attribute-syntax.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type {
  TemplateBindableReference,
} from './compiler-world-reference.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  HtmlAttribute,
  HtmlText,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
  TemplateValueSiteKind,
} from './value-site.js';
import {
  TemplateValueSitePublicationRequest,
  TemplateValueSitePublisher,
} from './value-site-publication.js';
import { TemplateProductDetails } from './product-details.js';

export interface TemplateValueSiteRequest {
  /** Store-local key for this value-site pass. */
  readonly localKey: string;
  /** Compiler unit that owns the parsed HTML and attribute products. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Parsed HTML products whose text/attribute values may contain expressions. */
  readonly html: HtmlParseEmission;
  /** Runtime AttrSyntax products that feed attribute classification and value-site selection. */
  readonly attributeSyntax: AttributeSyntaxParseEmission;
  /** Runtime-shaped attribute classifications that decide attribute-value ownership. */
  readonly attributeClassification: AttributeClassificationEmission;
  /** Compiler world that supplies the expression parser service and future command execution context. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
}

export class TemplateValueSiteEmission {
  constructor(
    readonly sites: readonly TemplateValueSite[],
    readonly parses: readonly TemplateExpressionParse[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class TemplateValueSiteSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class PendingValueSite {
  constructor(
    readonly siteKind: TemplateValueSiteKind,
    readonly rawValue: string,
    readonly entryFamily: ExpressionType | null,
    readonly node: TemplateValueSite['node'],
    readonly attribute: TemplateValueSite['attribute'],
    readonly syntax: AttributeSyntax | null,
    readonly classification: AttributeClassification | null,
    readonly bindingCommand: TemplateValueSite['bindingCommand'],
    readonly bindable: TemplateBindableReference | null,
    readonly sourceAddressHandle: TemplateValueSite['sourceAddressHandle'],
  ) {}
}

class ValueSiteMaterializationEmission {
  constructor(
    readonly site: TemplateValueSite,
    readonly parse: TemplateExpressionParse | null,
    readonly claims: readonly SemanticClaim[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Selects compiler-owned template value sites and publishes parser-owned values. */
export class TemplateValueSiteMaterializer {
  private readonly valueSitePublisher: TemplateValueSitePublisher;

  constructor(
    /** Hot analysis store that receives value-site records. */
    readonly store: KernelStore,
  ) {
    this.valueSitePublisher = new TemplateValueSitePublisher(store);
  }

  materialize(input: TemplateValueSiteRequest): TemplateValueSiteEmission {
    const emission = this.recordsForValueSites(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-value-site:${input.localKey}`));
    }
    this.store.productDetails.addAll(TemplateProductDetails.ValueSite, emission.sites);
    this.store.productDetails.addAll(TemplateProductDetails.ExpressionParse, emission.parses);
    return emission;
  }

  private recordsForValueSites(input: TemplateValueSiteRequest): TemplateValueSiteEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const sites: TemplateValueSite[] = [];
    const parses: TemplateExpressionParse[] = [];
    const claims: SemanticClaim[] = [];
    const pendingSites = [
      ...textValueSites(input.html),
      ...attributeValueSites(input.html, input.attributeSyntax, input.attributeClassification),
    ];

    pendingSites.forEach((pending, index) => {
      const emission = this.recordsForValueSite(input, source, pending, index);
      sites.push(emission.site);
      if (emission.parse != null) {
        parses.push(emission.parse);
      }
      claims.push(...emission.claims);
      records.push(...emission.records);
    });

    records.push(new MaterializationRecord(
      this.store.handles.materialization(`template-value-site:${input.localKey}`),
      input.compilationUnit.identityHandle,
      [
        ...sites.map((site) => site.productHandle),
        ...parses.map((parse) => parse.productHandle),
      ],
      claims.map((claim) => claim.handle),
    ));

    return new TemplateValueSiteEmission(sites, parses, records);
  }

  private recordsForValueSite(
    input: TemplateValueSiteRequest,
    source: TemplateValueSiteSourceSet,
    pending: PendingValueSite,
    index: number,
  ): ValueSiteMaterializationEmission {
    const siteLocal = `template-value-site:${input.localKey}:${index}`;
    const publication = this.valueSitePublisher.publish(new TemplateValueSitePublicationRequest(
      siteLocal,
      pending.entryFamily == null ? null : `template-expression-parse:${input.localKey}:${index}`,
      input.compilerWorld.expressionParser,
      source.provenanceHandle,
      pending.siteKind,
      pending.rawValue,
      pending.entryFamily,
      pending.node,
      pending.attribute,
      pending.syntax,
      pending.classification,
      pending.bindingCommand,
      pending.bindable,
      pending.sourceAddressHandle,
      input.compilationUnit.identityHandle,
      pending.siteKind,
      valueSiteSubject(pending),
      (result) => `${pending.siteKind}:${result.kind}`,
    ));
    return new ValueSiteMaterializationEmission(
      publication.site,
      publication.parse,
      publication.claims,
      publication.records,
    );
  }

  private recordsForSource(input: TemplateValueSiteRequest): TemplateValueSiteSourceSet {
    const evidenceHandle = this.store.handles.evidence(`template-value-site:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`template-value-site:${input.localKey}`);
    return new TemplateValueSiteSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.Scope],
          'Template value-site selection consumed authored HTML, attribute classification, and expression parser service visibility.',
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

function valueSiteSubject(
  pending: PendingValueSite,
): ProductHandle | null {
  return pending.classification?.productHandle
    ?? pending.syntax?.productHandle
    ?? pending.attribute?.productHandle
    ?? pending.node.productHandle
    ?? null;
}

function textValueSites(html: HtmlParseEmission): readonly PendingValueSite[] {
  return html.nodes
    .filter((node): node is HtmlText => node instanceof HtmlText)
    .filter((node) => hasInterpolationOpener(node.text))
    .map((node) => new PendingValueSite(
      TemplateValueSiteKind.TextInterpolation,
      node.text,
      'Interpolation',
      node.toReference(),
      null,
      null,
      null,
      null,
      null,
      node.sourceAddressHandle,
    ));
}

function attributeValueSites(
  html: HtmlParseEmission,
  syntaxEmission: AttributeSyntaxParseEmission,
  classificationEmission: AttributeClassificationEmission,
): readonly PendingValueSite[] {
  const attributesByProduct = new Map(html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const syntaxByProduct = new Map(syntaxEmission.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
  const sites: PendingValueSite[] = [];
  for (const classification of classificationEmission.classifications) {
    const syntax = classification.syntaxProductHandle == null
      ? null
      : syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
    if (syntax == null) {
      continue;
    }
    const attribute = syntax.attribute.productHandle == null
      ? null
      : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
    if (attribute == null) {
      continue;
    }
    const site = siteForAttributeClassification(classification, syntax, attribute);
    if (site != null) {
      sites.push(site);
    }
  }
  return sites;
}

function siteForAttributeClassification(
  classification: AttributeClassification,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
): PendingValueSite | null {
  if (classification.bindingCommand != null) {
    return new PendingValueSite(
      TemplateValueSiteKind.BindingCommandValue,
      syntax.rawValue,
      null,
      classification.ownerNode,
      attribute.toReference(),
      syntax,
      classification,
      classification.bindingCommand,
      classification.bindable,
      attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
    );
  }

  switch (classification.classificationKind) {
    case AttributeClassificationKind.Plain:
      return plainAttributeValueSite(classification, syntax, attribute);
    case AttributeClassificationKind.Bindable:
      return interpolationAttributeSite(
        TemplateValueSiteKind.BindableValue,
        classification,
        syntax,
        attribute,
      );
    case AttributeClassificationKind.CustomAttribute:
    case AttributeClassificationKind.TemplateController:
      return customAttributeOrTemplateControllerSite(classification, syntax, attribute);
    case AttributeClassificationKind.Captured:
      return interpolationAttributeSite(
        TemplateValueSiteKind.CapturedValue,
        classification,
        syntax,
        attribute,
      );
    case AttributeClassificationKind.Spread:
      if (syntax.target.toLowerCase() === '...$attrs') {
        return null;
      }
      return new PendingValueSite(
        TemplateValueSiteKind.SpreadValue,
        spreadValueExpression(syntax),
        'IsProperty',
        classification.ownerNode,
        attribute.toReference(),
        syntax,
        classification,
        null,
        null,
        attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
      );
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.CompilerControl:
    case AttributeClassificationKind.Ref:
    case AttributeClassificationKind.Open:
      return null;
  }
}

function plainAttributeValueSite(
  classification: AttributeClassification,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
): PendingValueSite | null {
  return hasInterpolationOpener(syntax.rawValue)
    ? interpolationAttributeSite(
      TemplateValueSiteKind.PlainAttributeInterpolation,
      classification,
      syntax,
      attribute,
    )
    : null;
}

function hasInterpolationOpener(value: string): boolean {
  // Interpolation parsing is only meaningful after an unescaped grammar opener appears; the parser still owns the full hole grammar.
  return hasInterpolationStart(value);
}

function interpolationAttributeSite(
  siteKind: TemplateValueSiteKind,
  classification: AttributeClassification,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
): PendingValueSite {
  return new PendingValueSite(
    siteKind,
    syntax.rawValue,
    'Interpolation',
    classification.ownerNode,
    attribute.toReference(),
    syntax,
    classification,
    null,
    classification.bindable,
    attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
  );
}

function customAttributeOrTemplateControllerSite(
  classification: AttributeClassification,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute,
): PendingValueSite {
  const definition = classification.resource?.definition ?? null;
  const isMultiBinding = definition instanceof CustomAttributeDefinition
    && !definition.noMultiBindings
    && hasInlineBindings(syntax.rawValue);
  if (isMultiBinding) {
    return new PendingValueSite(
      TemplateValueSiteKind.MultiBindingValue,
      syntax.rawValue,
      null,
      classification.ownerNode,
      attribute.toReference(),
      syntax,
      classification,
      null,
      classification.bindable,
      attribute.valueAddressHandle ?? attribute.sourceAddressHandle,
    );
  }
  return interpolationAttributeSite(
    classification.resourceKind === ResourceDefinitionKind.TemplateController
      ? TemplateValueSiteKind.TemplateControllerValue
      : TemplateValueSiteKind.CustomAttributeValue,
    classification,
    syntax,
    attribute,
  );
}

function spreadValueExpression(
  syntax: AttributeSyntax,
): string {
  return syntax.target.toLowerCase() === '...$bindables'
    ? syntax.rawValue
    : syntax.target.slice(3);
}

function hasInlineBindings(rawValue: string): boolean {
  const len = rawValue.length;
  let i = 0;
  while (i < len) {
    const ch = rawValue.charCodeAt(i);
    if (ch === 92) {
      ++i;
    } else if (ch === 58) {
      return true;
    } else if (ch === 36 && rawValue.charCodeAt(i + 1) === 123) {
      return false;
    }
    ++i;
  }
  return false;
}
