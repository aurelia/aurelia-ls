import type {
  LookupDomain,
  PositionFamily,
  ResourceKind,
  TraitKind,
} from "./enums.js";
import type { ExtensionIdentifier } from "./families.js";

export interface ResourceKey {
  readonly kind: ResourceKind;
  readonly canonicalName: string;
}

export interface AttributePatternKey {
  readonly kind: "attribute-pattern";
  readonly pattern: string;
  readonly symbols: readonly string[];
}

export interface LocalCustomElementKey {
  readonly kind: "local-custom-element";
  readonly ownerResourceKey: ResourceKey;
  readonly localName: string;
}

export type EntityKey = ResourceKey | AttributePatternKey | LocalCustomElementKey;

export interface BindableKey {
  readonly ownerResourceKey: ResourceKey;
  readonly propertyName: string;
}

export interface BindableTraitKey {
  readonly bindableKey: BindableKey;
  readonly traitKind: TraitKind;
}

export interface Position {
  readonly line: number;
  readonly character: number;
}

declare const occurrenceAnchorBrand: unique symbol;
declare const consultedContextBrand: unique symbol;
declare const consultedWorldBrand: unique symbol;
declare const boundaryKeyBrand: unique symbol;

export type OccurrenceAnchor = string & {
  readonly [occurrenceAnchorBrand]: "OccurrenceAnchor";
};

export type ConsultedContext = string & {
  readonly [consultedContextBrand]: "ConsultedContext";
};

export type ConsultedWorld = string & {
  readonly [consultedWorldBrand]: "ConsultedWorld";
};

export type BoundaryKey = string & {
  readonly [boundaryKeyBrand]: "BoundaryKey";
};

export interface OccurrenceAnchorParts {
  readonly documentUri: string;
  readonly position: Position;
}

export interface ConsultedContextParts {
  readonly scopeChainRef: string;
  readonly boundaryIdentifier: string;
}

export interface ConsultedWorldParts {
  readonly worldIdentifier: string;
  readonly boundaryIdentifier: string;
}

const OCCURRENCE_ANCHOR_LINE_WIDTH = 5;
const OCCURRENCE_ANCHOR_CHARACTER_WIDTH = 4;
const STRUCTURED_AXIS_SEPARATOR = "::";

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function assertSeparatorFree(value: string, separator: string, label: string): void {
  if (value.includes(separator)) {
    throw new Error(`${label} must not contain '${separator}'.`);
  }
}

function padCoordinate(value: number, width: number, label: string): string {
  assertNonNegativeInteger(value, label);

  const encoded = String(value);
  if (encoded.length > width) {
    throw new Error(`${label} exceeds the supported width of ${width} digits.`);
  }

  return encoded.padStart(width, "0");
}

function parseStructuredPair(serialized: string, label: string): readonly [string, string] {
  const firstSeparator = serialized.indexOf(STRUCTURED_AXIS_SEPARATOR);
  const lastSeparator = serialized.lastIndexOf(STRUCTURED_AXIS_SEPARATOR);
  if (firstSeparator <= 0 || firstSeparator !== lastSeparator) {
    throw new Error(`${label} must contain exactly one '${STRUCTURED_AXIS_SEPARATOR}' separator.`);
  }

  const lhs = serialized.slice(0, firstSeparator);
  const rhs = serialized.slice(firstSeparator + STRUCTURED_AXIS_SEPARATOR.length);
  if (lhs.length === 0 || rhs.length === 0) {
    throw new Error(`${label} must contain non-empty components.`);
  }

  return [lhs, rhs] as const;
}

export function serializeOccurrenceAnchor(parts: OccurrenceAnchorParts): OccurrenceAnchor {
  const { documentUri, position } = parts;
  const line = padCoordinate(position.line, OCCURRENCE_ANCHOR_LINE_WIDTH, "OccurrenceAnchor line");
  const character = padCoordinate(
    position.character,
    OCCURRENCE_ANCHOR_CHARACTER_WIDTH,
    "OccurrenceAnchor character",
  );

  return `${documentUri}:${line}:${character}` as OccurrenceAnchor;
}

export function parseOccurrenceAnchor(anchor: OccurrenceAnchor | string): OccurrenceAnchorParts {
  const characterSeparator = anchor.lastIndexOf(":");
  const lineSeparator = characterSeparator > 0 ? anchor.lastIndexOf(":", characterSeparator - 1) : -1;
  if (lineSeparator <= 0 || characterSeparator <= lineSeparator + 1) {
    throw new Error("OccurrenceAnchor must match '<documentUri>:<line>:<character>' with zero-padded coordinates.");
  }

  const documentUri = anchor.slice(0, lineSeparator);
  const line = anchor.slice(lineSeparator + 1, characterSeparator);
  const character = anchor.slice(characterSeparator + 1);
  if (line.length !== OCCURRENCE_ANCHOR_LINE_WIDTH || character.length !== OCCURRENCE_ANCHOR_CHARACTER_WIDTH) {
    throw new Error("OccurrenceAnchor must match '<documentUri>:<line>:<character>' with zero-padded coordinates.");
  }

  return {
    documentUri,
    position: {
      line: Number.parseInt(line, 10),
      character: Number.parseInt(character, 10),
    },
  };
}

export function serializeConsultedContext(parts: ConsultedContextParts): ConsultedContext {
  assertSeparatorFree(parts.scopeChainRef, STRUCTURED_AXIS_SEPARATOR, "ConsultedContext scopeChainRef");
  assertSeparatorFree(
    parts.boundaryIdentifier,
    STRUCTURED_AXIS_SEPARATOR,
    "ConsultedContext boundaryIdentifier",
  );

  return `${parts.scopeChainRef}${STRUCTURED_AXIS_SEPARATOR}${parts.boundaryIdentifier}` as ConsultedContext;
}

export function parseConsultedContext(context: ConsultedContext | string): ConsultedContextParts {
  const [scopeChainRef, boundaryIdentifier] = parseStructuredPair(context, "ConsultedContext");
  return { scopeChainRef, boundaryIdentifier };
}

export function serializeConsultedWorld(parts: ConsultedWorldParts): ConsultedWorld {
  assertSeparatorFree(parts.worldIdentifier, STRUCTURED_AXIS_SEPARATOR, "ConsultedWorld worldIdentifier");
  assertSeparatorFree(
    parts.boundaryIdentifier,
    STRUCTURED_AXIS_SEPARATOR,
    "ConsultedWorld boundaryIdentifier",
  );

  return `${parts.worldIdentifier}${STRUCTURED_AXIS_SEPARATOR}${parts.boundaryIdentifier}` as ConsultedWorld;
}

export function parseConsultedWorld(world: ConsultedWorld | string): ConsultedWorldParts {
  const [worldIdentifier, boundaryIdentifier] = parseStructuredPair(world, "ConsultedWorld");
  return { worldIdentifier, boundaryIdentifier };
}

export function serializeBoundaryKey(key: CompletenessKey): BoundaryKey {
  switch (key.completenessFamily) {
    case "grammar-shape":
      return `${key.consultedContext}${STRUCTURED_AXIS_SEPARATOR}gs${STRUCTURED_AXIS_SEPARATOR}${key.grammarShapeSurface}` as BoundaryKey;
    case "resource-admission":
      return `${key.consultedWorld}${STRUCTURED_AXIS_SEPARATOR}ra${STRUCTURED_AXIS_SEPARATOR}${key.resourceFamily}` as BoundaryKey;
    case "vocabulary-admission":
      return `${key.consultedWorld}${STRUCTURED_AXIS_SEPARATOR}va${STRUCTURED_AXIS_SEPARATOR}${key.vocabularyFamily}` as BoundaryKey;
    case "resource-scope":
      return `${key.consultedContext}${STRUCTURED_AXIS_SEPARATOR}rs${STRUCTURED_AXIS_SEPARATOR}${key.resourceFamily}` as BoundaryKey;
    case "template-scope":
      return `${key.consultedContext}${STRUCTURED_AXIS_SEPARATOR}ts${STRUCTURED_AXIS_SEPARATOR}${key.lookupDomain}` as BoundaryKey;
    case "type-closure":
      return `${key.consultedContext}${STRUCTURED_AXIS_SEPARATOR}tc${STRUCTURED_AXIS_SEPARATOR}${key.typeClosureSurface}` as BoundaryKey;
  }
}

export function serializeResourceKey(key: ResourceKey): string {
  return `resource:${key.kind}:${key.canonicalName}`;
}

export function serializeAttributePatternKey(key: AttributePatternKey): string {
  return `resource:attribute-pattern:${key.pattern}|${key.symbols.join(",")}`;
}

export function serializeLocalCustomElementKey(key: LocalCustomElementKey): string {
  return `resource:local-custom-element:${serializeResourceKey(key.ownerResourceKey)}/${key.localName}`;
}

export function serializeEntityKey(key: EntityKey): string {
  if ("pattern" in key) {
    return serializeAttributePatternKey(key);
  }

  if ("ownerResourceKey" in key && "localName" in key) {
    return serializeLocalCustomElementKey(key);
  }

  return serializeResourceKey(key);
}

export function serializeBindableKey(key: BindableKey): string {
  return `bindable:${serializeResourceKey(key.ownerResourceKey)}:${key.propertyName}`;
}

export function serializeBindableTraitKey(key: BindableTraitKey): string {
  return `bindable-trait:${serializeBindableKey(key.bindableKey)}:${key.traitKind}`;
}

export function serializeOccurrenceKey(key: OccurrenceKey): string {
  return `occ:${key.consultedContext}:${key.occurrenceAnchor}:${key.family}`;
}

export function serializeLookupKey(key: LookupKey): string {
  return `lookup:${serializeOccurrenceKey(key.occurrenceKey)}:${key.lookupDomain}:${key.lookupName}`;
}

export function serializeRelationKey(key: RelationKey): string {
  const rhs = typeof key.rhsKey === "string" ? key.rhsKey : serializeRelationKeyOperand(key.rhsKey);
  return `rel:${serializeRelationKeyOperand(key.lhsKey)}:${rhs}:${key.relationKind}`;
}

function serializeRelationKeyOperand(value: EntityKey | OccurrenceKey): string {
  if ("family" in value && "occurrenceAnchor" in value && "consultedContext" in value) {
    return serializeOccurrenceKey(value);
  }

  return serializeEntityKey(value);
}

export function serializeGovernedSemanticKey(key: GovernedSemanticKey): string {
  return `governed:${serializeEntityKey(key.subjectKey)}:${key.governedFamily}`;
}

export function serializeAdmissionKey(key: AdmissionKey): string {
  return `admission:${key.consultedWorld}:${serializeEntityKey(key.subjectKey)}`;
}

export function serializeReachabilityKey(key: ReachabilityKey): string {
  return `reach:${key.consultedContext}:${serializeEntityKey(key.subjectKey)}`;
}

export function serializeDeclarationWitnessKey(key: DeclarationWitnessKey): string {
  return `decl-witness:${serializeEntityKey(key.subjectKey)}:${key.declarationFormSet}`;
}

export function serializeSupportBundleKey(key: SupportBundleKey): string {
  return `support-bundle:${key.targetFamilyId}:${serializeEntityKey(key.subjectKey)}`;
}

export function serializeOpenBoundaryKey(key: OpenBoundaryKey): string {
  const subject = "family" in key.subjectKey
    ? serializeOccurrenceKey(key.subjectKey)
    : serializeEntityKey(key.subjectKey);
  return `open-boundary:${key.targetFamilyId}:${subject}:${key.blockedDependency}`;
}

export interface OccurrenceKey {
  readonly consultedContext: ConsultedContext;
  readonly occurrenceAnchor: OccurrenceAnchor;
  readonly family: PositionFamily;
}

export interface LookupKey {
  readonly occurrenceKey: OccurrenceKey;
  readonly lookupDomain: LookupDomain;
  readonly lookupName: string;
}

export const RELATION_KINDS = [
  "duplicate-registration",
  "type-contradiction",
  "subject-derived-resource-misuse",
  "governed-resource-misuse",
  "controller-linkage",
  "binding-behavior-misuse",
  "binding-command-misuse",
  "semantic-non-iterable",
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export interface RelationKey {
  readonly lhsKey: EntityKey | OccurrenceKey;
  readonly rhsKey: EntityKey | OccurrenceKey | string;
  readonly relationKind: RelationKind;
}

export interface GovernedSemanticKey {
  readonly subjectKey: EntityKey;
  readonly governedFamily: ExtensionIdentifier;
}

export interface AdmissionKey {
  readonly consultedWorld: ConsultedWorld;
  readonly subjectKey: EntityKey;
}

export interface ReachabilityKey {
  readonly consultedContext: ConsultedContext;
  readonly subjectKey: EntityKey;
}

export interface CompletenessKeyGrammarShape {
  readonly completenessFamily: "grammar-shape";
  readonly consultedContext: ConsultedContext;
  readonly grammarShapeSurface: string;
}

export interface CompletenessKeyResourceAdmission {
  readonly completenessFamily: "resource-admission";
  readonly consultedWorld: ConsultedWorld;
  readonly resourceFamily: ResourceKind;
}

export interface CompletenessKeyVocabularyAdmission {
  readonly completenessFamily: "vocabulary-admission";
  readonly consultedWorld: ConsultedWorld;
  readonly vocabularyFamily: string;
}

export interface CompletenessKeyResourceScope {
  readonly completenessFamily: "resource-scope";
  readonly consultedContext: ConsultedContext;
  readonly resourceFamily: ResourceKind;
}

export interface CompletenessKeyTemplateScope {
  readonly completenessFamily: "template-scope";
  readonly consultedContext: ConsultedContext;
  readonly lookupDomain: string;
}

export interface CompletenessKeyTypeClosure {
  readonly completenessFamily: "type-closure";
  readonly consultedContext: ConsultedContext;
  readonly typeClosureSurface: string;
}

export type CompletenessKey =
  | CompletenessKeyGrammarShape
  | CompletenessKeyResourceAdmission
  | CompletenessKeyVocabularyAdmission
  | CompletenessKeyResourceScope
  | CompletenessKeyTemplateScope
  | CompletenessKeyTypeClosure;

export interface OpenBoundaryKey {
  readonly targetFamilyId: string;
  readonly subjectKey: EntityKey | OccurrenceKey;
  readonly blockedDependency: string;
}

export interface DeclarationWitnessKey {
  readonly subjectKey: EntityKey;
  readonly declarationFormSet: string;
}

export interface SupportBundleKey {
  readonly targetFamilyId: string;
  readonly subjectKey: EntityKey;
}
