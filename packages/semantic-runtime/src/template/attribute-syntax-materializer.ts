import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ProductHandle,
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
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import {
  AttributePatternExecutionResult,
  AttributeSyntax,
  AttributeSyntaxKind,
  type AttributeSyntaxField,
} from './attribute-syntax.js';
import {
  executeBuiltInAttributePattern,
  type BuiltInAttributePattern,
} from './built-in-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateCompilationUnit } from './compilation-unit.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { TemplateProductDetails } from './product-details.js';

export class AttributeSyntaxParseInput {
  constructor(
    /** Store-local key for this attribute-syntax parse pass. */
    readonly localKey: string,
    /** Compiler unit that owns the HTML parse. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Parsed HTML products whose attributes should be interpreted. */
    readonly html: HtmlParseEmission,
    /** Compiler world that supplies the runtime-shaped attribute parser service. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
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

class MatchedAttributePattern {
  constructor(
    readonly pattern: AttributePatternDefinitionEntry,
    readonly handler: BuiltInAttributePattern,
    readonly executableProductHandle: ProductHandle | null,
  ) {}
}

/** Interprets authored HTML attributes through the runtime-shaped IAttributeParser model. */
export class AttributeSyntaxMaterializer {
  constructor(
    /** Hot analysis store that receives AttrSyntax records. */
    readonly store: KernelStore,
  ) {}

  parse(input: AttributeSyntaxParseInput): AttributeSyntaxParseEmission {
    const emission = this.recordsForParse(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `attribute-syntax:${input.localKey}`));
    }
    for (const syntax of emission.syntaxes) {
      this.store.productDetails.add(TemplateProductDetails.AttributeSyntax, syntax.productHandle, syntax);
    }
    return emission;
  }

  private recordsForParse(input: AttributeSyntaxParseInput): AttributeSyntaxParseEmission {
    const source = this.recordsForSource(input);
    const records: KernelStoreRecord[] = [...source.records];
    const syntaxes: AttributeSyntax[] = [];
    const claims: SemanticClaim[] = [];

    input.html.attributes.forEach((attribute, index) => {
      const local = `attribute-syntax:${input.localKey}:${index}`;
      const productHandle = this.store.handles.product(local);
      const identityHandle = this.store.handles.identity(local);
      const interpretation = input.compilerWorld.attributeParser.interpret(attribute.rawName);
      const matched = interpretation?.compiledPatternProductHandle == null
        ? null
        : findMatchedPattern(input.compilerWorld, interpretation.compiledPatternProductHandle);
      const execution = matched == null || interpretation == null
        ? AttributePatternExecutionResult.plain(attribute.rawName, attribute.rawValue)
        : executeBuiltInAttributePattern(
          matched.handler,
          matched.pattern.pattern,
          attribute.rawName,
          attribute.rawValue,
          interpretation.parts,
        ) ?? new AttributePatternExecutionResult(
          AttributeSyntaxKind.Open,
          attribute.rawName,
          attribute.rawValue,
          attribute.rawName,
          null,
          interpretation.parts,
        );
      const syntax = new AttributeSyntax(
        productHandle,
        identityHandle,
        execution.syntaxKind,
        execution.rawName,
        execution.rawValue,
        execution.target,
        execution.command,
        execution.parts,
        matched?.pattern ?? null,
        attribute.toReference(),
        attribute.sourceAddressHandle,
        compactFieldProvenance<AttributeSyntaxField>([
          new FieldProvenance('rawName', source.provenanceHandle),
          new FieldProvenance('rawValue', source.provenanceHandle),
          new FieldProvenance('target', source.provenanceHandle),
          execution.command == null ? null : new FieldProvenance('command', source.provenanceHandle),
          execution.parts.length === 0 ? null : new FieldProvenance('parts', source.provenanceHandle),
          matched == null ? null : new FieldProvenance('pattern', source.provenanceHandle),
          new FieldProvenance('source', source.provenanceHandle),
        ]),
      );
      const parseClaim = new SemanticClaim(
        this.store.handles.claim(`${local}:parses-to-attribute-syntax`),
        attribute.productHandle,
        KernelVocabulary.Template.ParsesToAttributeSyntax.key,
        productHandle,
        source.provenanceHandle,
      );
      claims.push(parseClaim);
      if (matched?.executableProductHandle != null) {
        claims.push(new SemanticClaim(
          this.store.handles.claim(`${local}:references-attribute-pattern`),
          productHandle,
          KernelVocabulary.Template.ReferencesResource.key,
          matched.executableProductHandle,
          source.provenanceHandle,
        ));
      }
      syntaxes.push(syntax);
      records.push(
        new CompilerIdentity(
          identityHandle,
          KernelVocabulary.Template.AttributeSyntax.key,
          attribute.identityHandle,
          attribute.sourceAddressHandle,
          attribute.rawName,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Template.AttributeSyntax.key,
          identityHandle,
          attribute.sourceAddressHandle,
          source.provenanceHandle,
        ),
      );
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

  private recordsForSource(input: AttributeSyntaxParseInput): AttributeSyntaxSourceSet {
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

function findMatchedPattern(
  world: TemplateCompilerWorldEmission,
  compiledPatternProductHandle: ProductHandle,
): MatchedAttributePattern | null {
  for (const emission of world.attributePatterns) {
    const pattern = emission.compiledPatterns.find((candidate) => candidate.productHandle === compiledPatternProductHandle);
    if (pattern == null) {
      continue;
    }
    return new MatchedAttributePattern(
      pattern.definition,
      emission.handler,
      emission.executable.productHandle,
    );
  }
  return null;
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
