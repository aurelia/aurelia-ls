import {
  SourceFileAddress,
  SourceSpanAddress,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import { DerivationPhase } from '../kernel/derivation.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  CompilerIdentityKind,
  IdentityStability,
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
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import type { ExpressionType } from '../expression/ast.js';
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
  TemplateCompilerServiceReference,
} from './compiler-world.js';
import {
  TemplateCompilerServiceKind,
} from './compiler-world.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import {
  HtmlAttribute,
  HtmlText,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import {
  expressionParseStateForResult,
  TemplateExpressionParse,
  TemplateExpressionParseState,
  TemplateValueSite,
  TemplateValueSiteKind,
  type TemplateExpressionParseField,
  type TemplateValueSiteField,
} from './value-site.js';
import { TemplateProductDetails } from './product-details.js';

export class TemplateValueSiteInput {
  constructor(
    /** Store-local key for this value-site pass. */
    readonly localKey: string,
    /** Compiler unit that owns the parsed HTML and attribute products. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Parsed HTML products whose text/attribute values may contain expressions. */
    readonly html: HtmlParseEmission,
    /** Runtime AttrSyntax products that feed attribute classification and value-site selection. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Runtime-shaped attribute classifications that decide attribute-value ownership. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Compiler world that supplies the expression parser service and future command execution context. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
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

/** Selects compiler-owned template value sites and publishes parser-owned values. */
export class TemplateValueSiteMaterializer {
  private readonly parser = new ExpressionParser();

  constructor(
    /** Hot analysis store that receives value-site records. */
    readonly store: KernelStore,
  ) {}

  materialize(input: TemplateValueSiteInput): TemplateValueSiteEmission {
    const emission = this.recordsForValueSites(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `template-value-site:${input.localKey}`));
    }
    for (const site of emission.sites) {
      this.store.productDetails.add(TemplateProductDetails.ValueSite, site.productHandle, site);
    }
    for (const parse of emission.parses) {
      this.store.productDetails.add(TemplateProductDetails.ExpressionParse, parse.productHandle, parse);
    }
    return emission;
  }

  private recordsForValueSites(input: TemplateValueSiteInput): TemplateValueSiteEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const sites: TemplateValueSite[] = [];
    const parses: TemplateExpressionParse[] = [];
    const claims: SemanticClaim[] = [];
    const parserService = parserServiceFor(input.compilerWorld);
    const pendingSites = [
      ...textValueSites(input.html),
      ...attributeValueSites(input.html, input.attributeSyntax, input.attributeClassification),
    ];

    pendingSites.forEach((pending, index) => {
      const siteLocal = `template-value-site:${input.localKey}:${index}`;
      const siteProductHandle = this.store.handles.product(siteLocal);
      const siteIdentityHandle = this.store.handles.identity(siteLocal);
      const site = new TemplateValueSite(
        siteProductHandle,
        siteIdentityHandle,
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
        compactFieldProvenance<TemplateValueSiteField>([
          new FieldProvenance('siteKind', source.provenanceHandle),
          new FieldProvenance('rawValue', source.provenanceHandle),
          pending.entryFamily == null ? null : new FieldProvenance('entryFamily', source.provenanceHandle),
          new FieldProvenance('node', source.provenanceHandle),
          pending.attribute == null ? null : new FieldProvenance('attribute', source.provenanceHandle),
          pending.syntax == null ? null : new FieldProvenance('syntax', source.provenanceHandle),
          pending.classification == null ? null : new FieldProvenance('classification', source.provenanceHandle),
          pending.bindingCommand == null ? null : new FieldProvenance('bindingCommand', source.provenanceHandle),
          pending.bindable == null ? null : new FieldProvenance('bindable', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
      const routeSubjectHandle = valueSiteSubject(pending);
      const routeClaim = routeSubjectHandle == null
        ? null
        : new SemanticClaim(
          this.store.handles.claim(`${siteLocal}:selects-value-site`),
          routeSubjectHandle,
          KernelVocabulary.Template.SelectsValueSite.key,
          site.productHandle,
          source.provenanceHandle,
        );
      if (routeClaim != null) {
        claims.push(routeClaim);
      }
      sites.push(site);
      const siteClaimHandles: ClaimHandle[] = routeClaim == null ? [] : [routeClaim.handle];
      const siteRecords: KernelStoreRecord[] = [
        new CompilerIdentity(
          site.identityHandle,
          IdentityStability.SourceStable,
          CompilerIdentityKind.TemplateValueSite,
          input.compilationUnit.identityHandle,
          pending.sourceAddressHandle,
          pending.siteKind,
        ),
      ];

      if (pending.entryFamily == null) {
        records.push(
          ...siteRecords,
          ...(routeClaim == null ? [] : [routeClaim]),
          new MaterializedProduct(
            site.productHandle,
            KernelVocabulary.Template.ValueSite.key,
            site.identityHandle,
            pending.sourceAddressHandle,
            source.provenanceHandle,
            siteClaimHandles,
          ),
        );
        return;
      }

      const parseLocal = `template-expression-parse:${input.localKey}:${index}`;
      const parseProductHandle = this.store.handles.product(parseLocal);
      const parseIdentityHandle = this.store.handles.identity(parseLocal);
      const result = this.parser.parse(
        pending.rawValue,
        pending.entryFamily,
        this.expressionParseContext(pending.sourceAddressHandle),
      );
      const parse = new TemplateExpressionParse(
        parseProductHandle,
        parseIdentityHandle,
        site.toReference(),
        parserService?.productHandle ?? null,
        expressionParseStateForResult(result),
        result.kind,
        result,
        pending.sourceAddressHandle,
        compactFieldProvenance<TemplateExpressionParseField>([
          new FieldProvenance('site', source.provenanceHandle),
          parserService == null ? null : new FieldProvenance('parser', source.provenanceHandle),
          new FieldProvenance('state', source.provenanceHandle),
          new FieldProvenance('resultKind', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
      const claim = new SemanticClaim(
        this.store.handles.claim(`${parseLocal}:parses-to-expression-parse`),
        site.productHandle,
        KernelVocabulary.Template.ParsesToExpressionParse.key,
        parse.productHandle,
        source.provenanceHandle,
      );
      claims.push(claim);
      parses.push(parse);
      records.push(
        ...siteRecords,
        ...(routeClaim == null ? [] : [routeClaim]),
        new MaterializedProduct(
          site.productHandle,
          KernelVocabulary.Template.ValueSite.key,
          site.identityHandle,
          pending.sourceAddressHandle,
          source.provenanceHandle,
          [...siteClaimHandles, claim.handle],
        ),
        new CompilerIdentity(
          parse.identityHandle,
          IdentityStability.SourceStable,
          CompilerIdentityKind.TemplateExpressionParse,
          site.identityHandle,
          pending.sourceAddressHandle,
          `${pending.siteKind}:${result.kind}`,
        ),
        new MaterializedProduct(
          parse.productHandle,
          KernelVocabulary.Template.ExpressionParse.key,
          parse.identityHandle,
          pending.sourceAddressHandle,
          source.provenanceHandle,
          [claim.handle],
        ),
        claim,
      );
    });

    records.push(new MaterializationRecord(
      this.store.handles.materialization(`template-value-site:${input.localKey}`),
      DerivationPhase.Materialization,
      input.compilationUnit.identityHandle,
      materializationStateForParses(parses),
      [
        ...sites.map((site) => site.productHandle),
        ...parses.map((parse) => parse.productHandle),
      ],
      claims.map((claim) => claim.handle),
    ));

    return new TemplateValueSiteEmission(sites, parses, records);
  }

  private recordsForSource(input: TemplateValueSiteInput): TemplateValueSiteSourceSet {
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
          ProvenanceMode.Derived,
          [evidenceHandle],
          [],
          'Compiler-owned value-site selection and expression parser publication.',
        ),
      ],
      provenanceHandle,
    );
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
      return interpolationAttributeSite(
        TemplateValueSiteKind.PlainAttributeInterpolation,
        classification,
        syntax,
        attribute,
      );
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
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.CompilerControl:
    case AttributeClassificationKind.Ref:
    case AttributeClassificationKind.Spread:
    case AttributeClassificationKind.Open:
      return null;
  }
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
      classification.classificationKind === AttributeClassificationKind.TemplateController
        ? TemplateValueSiteKind.TemplateControllerValue
        : TemplateValueSiteKind.MultiBindingValue,
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

function parserServiceFor(
  compilerWorld: TemplateCompilerWorldEmission,
): TemplateCompilerServiceReference | null {
  return compilerWorld.world.services.find((service) => service.serviceKind === TemplateCompilerServiceKind.ExpressionParser)
    ?? null;
}

function materializationStateForParses(
  parses: readonly TemplateExpressionParse[],
): MaterializationState {
  if (parses.some((parse) => parse.state === TemplateExpressionParseState.Error)) {
    return MaterializationState.Invalid;
  }
  if (parses.some((parse) => parse.state !== TemplateExpressionParseState.Complete)) {
    return MaterializationState.Partial;
  }
  return MaterializationState.Complete;
}
