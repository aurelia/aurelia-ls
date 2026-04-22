import fs from 'node:fs';
import ts from 'typescript';

import {
  findNodeBySpan,
  guessScriptKind,
  readPropertyName,
  readReferenceSeed,
  readStringArrayValues,
  readStringLiteralValue,
  unwrapExpression,
} from '../analysis/index.js';
import type { Exports } from '../exports/index.js';
import type { ExportValueDefineCall } from '../exports/export-value-surface.js';
import { KeyRef, SourceFileRef, SourceNodeRef, SourceSpan } from '../refs.js';
import { AttributePatternDefinition } from './attribute-pattern-definition.js';
import { BindingBehaviorDefinition } from './binding-behavior-definition.js';
import {
  BindingBehaviorFieldProvenance,
  BindingBehaviorFieldWitness,
  BindingBehaviorIdentity,
} from './binding-behavior-support.js';
import { BindingBehaviorMaterializer } from './binding-behavior-materializer.js';
import { BindingCommandDefinition } from './binding-command-definition.js';
import {
  BindingCommandFieldProvenance,
  BindingCommandFieldWitness,
  BindingCommandIdentity,
} from './binding-command-support.js';
import { BindingCommandMaterializer } from './binding-command-materializer.js';
import {
  createBindableResolutionInput,
  readBindableSurfaceFromInputs,
  type BindableContributorSeed,
} from './bindable-materialization.js';
import { BindableSurface, type BindableCarrierKind } from './bindable-support.js';
import { CustomAttributeDefinition } from './custom-attribute-definition.js';
import {
  CustomAttributeDependencyContribution,
  CustomAttributeDependencyEntry,
  CustomAttributeFieldProvenance,
  CustomAttributeFieldWitness,
  CustomAttributeIdentity,
  CustomAttributePolicy,
  type CustomAttributeDependencyLinkSeedKind,
  type CustomAttributeDependencySourceKind,
} from './custom-attribute-support.js';
import { CustomAttributeMaterializer } from './custom-attribute-materializer.js';
import { CustomElementDefinition } from './custom-element-definition.js';
import {
  CustomElementDependencyContribution,
  CustomElementDependencyEntry,
  CustomElementDependencySource,
  CustomElementFieldProvenance,
  CustomElementFieldWitness,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
  type CustomElementCaptureKind,
  type CustomElementDependencyLinkSeedKind,
  type CustomElementDependencySourceKind,
  type CustomElementProcessContentKind,
} from './custom-element-support.js';
import { CustomElementMaterializer } from './custom-element-materializer.js';
import { DefinitionCarrierCollector } from './definition-carrier-collector.js';
import type { DefinitionCarrier } from './definition-carrier.js';
import { ResourceRecognizer } from './resource-recognizer.js';
import type { ResourceCandidate } from './resource-candidate.js';
import type { ResourceDefinition } from './resources.js';
import { TemplateControllerDefinition } from './template-controller-definition.js';
import { ValueConverterDefinition } from './value-converter-definition.js';
import {
  ValueConverterFieldProvenance,
  ValueConverterFieldWitness,
  ValueConverterIdentity,
} from './value-converter-support.js';
import { ValueConverterMaterializer } from './value-converter-materializer.js';

export interface ResourceScannerOptions {
  readonly exports: Exports;
  readonly resourceSeeds?: readonly ResourceDefinition[];
  readonly conventionsActive?: boolean;
  readonly recognizer?: ResourceRecognizer;
  readonly definitionCarrierCollector?: DefinitionCarrierCollector;
  readonly customElementMaterializer?: CustomElementMaterializer;
  readonly customAttributeMaterializer?: CustomAttributeMaterializer;
  readonly bindingCommandMaterializer?: BindingCommandMaterializer;
  readonly valueConverterMaterializer?: ValueConverterMaterializer;
  readonly bindingBehaviorMaterializer?: BindingBehaviorMaterializer;
}

export interface ResourceScannerState {
  readonly exportOwnerLabel: string;
  readonly recognizerExportOwnerLabel: string;
  readonly carrierCollectorExportOwnerLabel: string;
  readonly seedCount: number;
  readonly recognizedCount: number;
  readonly parsedFileCount: number;
}

// This seam now converges real export-backed resource candidates into skeletal
// definitions, then lets family-specific materializers close declaration-local
// fields. Seeds remain available for special framework rows that still need
// bespoke treatment, but they no longer define the whole floor.
export class ResourceScanner {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();
  private readonly exportsValue: Exports;
  private readonly recognizerValue: ResourceRecognizer;
  private readonly definitionCarrierCollectorValue: DefinitionCarrierCollector;
  private readonly customElementMaterializerValue: CustomElementMaterializer;
  private readonly customAttributeMaterializerValue: CustomAttributeMaterializer;
  private readonly bindingCommandMaterializerValue: BindingCommandMaterializer;
  private readonly valueConverterMaterializerValue: ValueConverterMaterializer;
  private readonly bindingBehaviorMaterializerValue: BindingBehaviorMaterializer;
  private readonly resourceSeedsValue: readonly ResourceDefinition[];

  constructor(
    options: ResourceScannerOptions,
  ) {
    this.exportsValue = options.exports;
    this.recognizerValue = options.recognizer
      ?? new ResourceRecognizer({
        exports: options.exports,
        conventionsActive: options.conventionsActive,
      });
    this.definitionCarrierCollectorValue = options.definitionCarrierCollector
      ?? new DefinitionCarrierCollector({
        recognizer: this.recognizerValue,
      });
    this.customElementMaterializerValue = options.customElementMaterializer
      ?? new CustomElementMaterializer();
    this.customAttributeMaterializerValue = options.customAttributeMaterializer
      ?? new CustomAttributeMaterializer();
    this.bindingCommandMaterializerValue = options.bindingCommandMaterializer
      ?? new BindingCommandMaterializer();
    this.valueConverterMaterializerValue = options.valueConverterMaterializer
      ?? new ValueConverterMaterializer();
    this.bindingBehaviorMaterializerValue = options.bindingBehaviorMaterializer
      ?? new BindingBehaviorMaterializer();
    this.resourceSeedsValue = [...(options.resourceSeeds ?? [])];
  }

  scanCandidates(): readonly ResourceCandidate[] {
    return this.recognizerValue.recognizeAll();
  }

  scanDefinitionCarriers(): readonly DefinitionCarrier[] {
    return this.definitionCarrierCollectorValue.collectAll();
  }

  scanAll(): readonly ResourceDefinition[] {
    const recognized = this.materializeRecognizedDefinitions(this.scanCandidates());
    const merged = mergeDefinitions(recognized, this.resourceSeedsValue);

    // TODO: attribute-patterns still rely on special/bespoke ingress rows.
    // Their runtime definition shape is multi-pattern and registrable-metadata
    // driven, so the current single-row resource model needs a dedicated slice
    // before export-backed AP materialization would be honest.
    //
    // TODO: convention-assisted ingress should not become active here until a
    // separate build-tool/conventions activation layer proves that
    // plugin-conventions (or an equivalent transform) is actually in play for
    // the owning project. The current scanner therefore only benefits from
    // convention names when the recognizer was activated through project-owned
    // tooling law (or a deliberate explicit override in tests/manual wiring).
    //
    // TODO: non-exported `*.define(...)` results still need later convergence
    // through registration/configuration/dependency visibility. This first
    // imperative-ingress slice only closes define-call results that are already
    // visible on the export surface.
    return merged.map((resource) => ensureResourceKey(this.materializeDefinition(resource)));
  }

  inspectState(): ResourceScannerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
      recognizerExportOwnerLabel: this.recognizerValue.inspectState().exportOwnerLabel,
      carrierCollectorExportOwnerLabel: this.definitionCarrierCollectorValue.inspectState().exportOwnerLabel,
      seedCount: this.resourceSeedsValue.length,
      recognizedCount: this.scanCandidates().length,
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private materializeRecognizedDefinitions(
    candidates: readonly ResourceCandidate[],
  ): readonly ResourceDefinition[] {
    const result: ResourceDefinition[] = [];

    for (const candidate of candidates) {
      const kind = candidate.possibleKinds[0] ?? null;
      if (kind == null || kind === 'attribute-pattern') {
        continue;
      }
      const type = this.readRecognizedType(candidate);
      if (type == null) {
        continue;
      }

      const conventionName = readConventionName(candidate);
      const definition = this.createRecognizedDefinition(candidate, kind, type, conventionName);

      if (definition != null) {
        result.push(definition);
      }
    }

    return result;
  }

  private createRecognizedDefinition(
    candidate: ResourceCandidate,
    kind: Exclude<ResourceDefinition['kind'], 'attribute-pattern'>,
    type: ResourceDefinition['type'],
    conventionName: string | null,
  ): ResourceDefinition | null {
    const defineCall = candidate.sourceExport.readValueSurface().defineCall;

    switch (kind) {
      case 'custom-element': {
        const defineSeed = defineCall == null ? null : this.readCustomElementDefineSeed(defineCall);
        return new CustomElementDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          defineSeed?.identity ?? new CustomElementIdentity(conventionName),
          defineSeed?.policy,
          defineSeed?.bindableSurface,
          defineSeed?.dependencyContribution,
          defineSeed?.templateSource,
        );
      }
      case 'custom-attribute': {
        const defineSeed = defineCall == null ? null : this.readCustomAttributeDefineSeed(defineCall, false);
        return new CustomAttributeDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          defineSeed?.identity ?? new CustomAttributeIdentity(conventionName),
          defineSeed?.bindableSurface,
          defineSeed?.policy,
          defineSeed?.dependencyContribution,
        );
      }
      case 'template-controller': {
        const defineSeed = defineCall == null ? null : this.readCustomAttributeDefineSeed(defineCall, true);
        return new TemplateControllerDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          defineSeed?.identity ?? new CustomAttributeIdentity(conventionName),
          defineSeed?.bindableSurface,
          defineSeed?.policy,
          defineSeed?.dependencyContribution,
        );
      }
      case 'binding-command': {
        const defineSeed = defineCall == null ? null : this.readBindingCommandIdentitySeed(defineCall);
        return new BindingCommandDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          null,
          defineSeed?.identity.name ?? conventionName,
          defineSeed?.identity.aliases ?? [],
          defineSeed?.identity ?? null,
        );
      }
      case 'value-converter': {
        const defineSeed = defineCall == null ? null : this.readValueConverterIdentitySeed(defineCall);
        return new ValueConverterDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          null,
          defineSeed?.identity.name ?? conventionName,
          defineSeed?.identity.aliases ?? [],
          defineSeed?.identity ?? null,
        );
      }
      case 'binding-behavior': {
        const defineSeed = defineCall == null ? null : this.readBindingBehaviorIdentitySeed(defineCall);
        return new BindingBehaviorDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          null,
          defineSeed?.identity.name ?? conventionName,
          defineSeed?.identity.aliases ?? [],
          defineSeed?.identity ?? null,
        );
      }
    }
  }

  private readRecognizedType(
    candidate: ResourceCandidate,
  ): ResourceDefinition['type'] | null {
    const defineCall = candidate.sourceExport.readValueSurface().defineCall;
    if (defineCall?.typeArgument.source != null) {
      // NOTE: generated-type and unresolved explicit type-argument paths still
      // land on the exported result surface today. That mirrors the current
      // bounded ingress lane, but it does not prove the actual runtime class
      // carrier until a deeper value/reference recovery slice exists.
      return defineCall.typeArgument.source;
    }

    return candidate.sourceExport.symbol;
  }

  private readCustomElementDefineSeed(
    defineCall: ExportValueDefineCall,
  ): RecognizedCustomElementSeed | null {
    const literal = this.readDefineObjectLiteral(defineCall);
    const classCarrier = this.readDefineCallClassCarrier(defineCall);
    const defineSource = defineCall.definitionArgument.source;

    if (literal == null && defineCall.definitionArgument.kind !== 'string-literal') {
      return null;
    }

    const nameContributor = createFieldContributor('name', literal, defineCall.definitionArgument, defineSource);
    const aliasesContributor = createFieldContributor('aliases', literal, 'aliases', defineSource);
    const bindablesContributor = createFieldContributor('bindables', literal, 'bindables', defineSource);
    const dependenciesContributor = createFieldContributor('dependencies', literal, 'dependencies', defineSource);
    const captureContributor = createFieldContributor('capture', literal, 'capture', defineSource);
    const containerlessContributor = createFieldContributor('containerless', literal, 'containerless', defineSource);
    const shadowOptionsContributor = createFieldContributor('shadow-options', literal, 'shadowOptions', defineSource);
    const hasSlotsContributor = createFieldContributor('has-slots', literal, 'hasSlots', defineSource);
    const processContentContributor = createFieldContributor('process-content', literal, 'processContent', defineSource);
    const templateContributor = createFieldContributor('template', literal, 'template', defineSource);

    return {
      identity: new CustomElementIdentity(
        readSelectedStringValue(nameContributor),
        readMergedStringArrayValues([aliasesContributor]),
        null,
        compactCustomElementProvenances([
          buildCustomElementFieldProvenance('name', [nameContributor]),
          buildCustomElementFieldProvenance('aliases', [aliasesContributor]),
        ]),
        nameContributor.expression == null
          ? 'Custom-element identity was seeded from imperative define-call input, but the authored name stayed open. Runtime may synthesize an unnamed-* identity for CustomElement.define(def) paths, and the clean-room leaves that synthetic naming explicit for later work.'
          : 'Custom-element identity seeded from imperative define-call input.',
      ),
      policy: new CustomElementPolicy(
        readCaptureKind(captureContributor.expression),
        readBooleanValue(containerlessContributor.expression),
        readShadowMode(shadowOptionsContributor.expression),
        readProcessContentKind(processContentContributor.expression),
        compactCustomElementProvenances([
          buildCustomElementFieldProvenance('capture', [captureContributor]),
          buildCustomElementFieldProvenance('containerless', [containerlessContributor]),
          buildCustomElementFieldProvenance('shadow-options', [shadowOptionsContributor]),
          buildCustomElementFieldProvenance('has-slots', [hasSlotsContributor]),
          buildCustomElementFieldProvenance('process-content', [processContentContributor]),
        ]),
        'Custom-element policy seeded from imperative define-call object fields.',
      ),
      bindableSurface: this.readDefineBindableSurface(
        bindablesContributor,
        classCarrier,
      ),
      dependencyContribution: new CustomElementDependencyContribution(
        readCustomElementDependencySources([dependenciesContributor]),
        readCustomElementDependencyEntries([dependenciesContributor]),
        compactCustomElementProvenances([
          buildCustomElementFieldProvenance('dependencies', [dependenciesContributor]),
        ]),
        dependenciesContributor.expression == null
          ? 'Custom-element dependencies stayed open on the define-call object.'
          : 'Custom-element dependencies seeded from the define-call object.',
      ),
      templateSource: readCustomElementTemplateSource(templateContributor),
    };
  }

  private readCustomAttributeDefineSeed(
    defineCall: ExportValueDefineCall,
    forceTemplateController: boolean,
  ): RecognizedCustomAttributeSeed | null {
    const literal = this.readDefineObjectLiteral(defineCall);
    const classCarrier = this.readDefineCallClassCarrier(defineCall);
    const defineSource = defineCall.definitionArgument.source;

    if (literal == null && defineCall.definitionArgument.kind !== 'string-literal') {
      return null;
    }

    const nameContributor = createFieldContributor('name', literal, defineCall.definitionArgument, defineSource);
    const aliasesContributor = createFieldContributor('aliases', literal, 'aliases', defineSource);
    const bindablesContributor = createFieldContributor('bindables', literal, 'bindables', defineSource);
    const defaultPropertyContributor = createFieldContributor('default-property', literal, 'defaultProperty', defineSource);
    const noMultiBindingsContributor = createFieldContributor('no-multi-bindings', literal, 'noMultiBindings', defineSource);
    const dependenciesContributor = createFieldContributor('dependencies', literal, 'dependencies', defineSource);
    const containerStrategyContributor = createFieldContributor('container-strategy', literal, 'containerStrategy', defineSource);
    const templateControllerContributor = forceTemplateController
      ? createSyntheticCustomAttributeContributor('is-template-controller', true)
      : createFieldContributor('is-template-controller', literal, 'isTemplateController', defineSource);

    return {
      identity: new CustomAttributeIdentity(
        readSelectedStringValue(nameContributor),
        readMergedStringArrayValues([aliasesContributor]),
        null,
        compactCustomAttributeProvenances([
          buildCustomAttributeFieldProvenance('name', [nameContributor]),
          buildCustomAttributeFieldProvenance('aliases', [aliasesContributor]),
        ]),
        'Custom-attribute identity seeded from imperative define-call input.',
      ),
      bindableSurface: this.readDefineBindableSurface(
        bindablesContributor,
        classCarrier,
      ),
      policy: new CustomAttributePolicy(
        readSelectedStringValue(defaultPropertyContributor),
        readBooleanValue(noMultiBindingsContributor.expression),
        readContainerStrategy(containerStrategyContributor.expression),
        forceTemplateController || readBooleanValue(templateControllerContributor.expression) === true,
        compactCustomAttributeProvenances([
          buildCustomAttributeFieldProvenance('default-property', [defaultPropertyContributor]),
          buildCustomAttributeFieldProvenance('no-multi-bindings', [noMultiBindingsContributor]),
          buildCustomAttributeFieldProvenance('container-strategy', [containerStrategyContributor]),
          buildCustomAttributeFieldProvenance('is-template-controller', [templateControllerContributor]),
        ]),
        'Custom-attribute/template-controller policy seeded from imperative define-call object fields.',
      ),
      dependencyContribution: new CustomAttributeDependencyContribution(
        readCustomAttributeDependencyEntries([dependenciesContributor]),
        compactCustomAttributeProvenances([
          buildCustomAttributeFieldProvenance('dependencies', [dependenciesContributor]),
        ]),
        dependenciesContributor.expression == null
          ? 'Custom-attribute/template-controller dependencies stayed open on the define-call object.'
          : 'Custom-attribute/template-controller dependencies seeded from the define-call object.',
      ),
    };
  }

  private readBindingCommandIdentitySeed(
    defineCall: ExportValueDefineCall,
  ): { readonly identity: BindingCommandIdentity } | null {
    const literal = this.readDefineObjectLiteral(defineCall);
    const defineSource = defineCall.definitionArgument.source;
    const nameContributor = createFieldContributor('name', literal, defineCall.definitionArgument, defineSource);
    const aliasesContributor = createFieldContributor('aliases', literal, 'aliases', defineSource);
    const name = readSelectedStringValue(nameContributor);
    const aliases = readMergedStringArrayValues([aliasesContributor]);
    return {
      identity: new BindingCommandIdentity(
        name,
        aliases,
        null,
        compactBindingCommandProvenances([
          buildBindingCommandFieldProvenance('name', [nameContributor]),
          buildBindingCommandFieldProvenance('aliases', [aliasesContributor]),
        ]),
        'Identity seeded from imperative binding-command define-call input.',
      ),
    };
  }

  private readValueConverterIdentitySeed(
    defineCall: ExportValueDefineCall,
  ): { readonly identity: ValueConverterIdentity } | null {
    const literal = this.readDefineObjectLiteral(defineCall);
    const defineSource = defineCall.definitionArgument.source;
    const nameContributor = createFieldContributor('name', literal, defineCall.definitionArgument, defineSource);
    const aliasesContributor = createFieldContributor('aliases', literal, 'aliases', defineSource);
    const name = readSelectedStringValue(nameContributor);
    const aliases = readMergedStringArrayValues([aliasesContributor]);
    return {
      identity: new ValueConverterIdentity(
        name,
        aliases,
        null,
        compactValueConverterProvenances([
          buildValueConverterFieldProvenance('name', [nameContributor]),
          buildValueConverterFieldProvenance('aliases', [aliasesContributor]),
        ]),
        'Identity seeded from imperative value-converter define-call input.',
      ),
    };
  }

  private readBindingBehaviorIdentitySeed(
    defineCall: ExportValueDefineCall,
  ): { readonly identity: BindingBehaviorIdentity } | null {
    const literal = this.readDefineObjectLiteral(defineCall);
    const defineSource = defineCall.definitionArgument.source;
    const nameContributor = createFieldContributor('name', literal, defineCall.definitionArgument, defineSource);
    const aliasesContributor = createFieldContributor('aliases', literal, 'aliases', defineSource);
    const name = readSelectedStringValue(nameContributor);
    const aliases = readMergedStringArrayValues([aliasesContributor]);
    return {
      identity: new BindingBehaviorIdentity(
        name,
        aliases,
        null,
        compactBindingBehaviorProvenances([
          buildBindingBehaviorFieldProvenance('name', [nameContributor]),
          buildBindingBehaviorFieldProvenance('aliases', [aliasesContributor]),
        ]),
        'Identity seeded from imperative binding-behavior define-call input.',
      ),
    };
  }

  private readDefineObjectLiteral(
    defineCall: ExportValueDefineCall,
  ): ts.ObjectLiteralExpression | null {
    const source = defineCall.definitionArgument.source;
    if (source == null) {
      return null;
    }

    const sourceFile = this.readSourceFile(source.file.path);
    if (sourceFile == null) {
      return null;
    }

    const node = findNodeBySpan(sourceFile, source.span.start, source.span.end);
    return node != null && ts.isObjectLiteralExpression(node)
      ? node
      : null;
  }

  private readDefineCallClassCarrier(
    defineCall: ExportValueDefineCall,
  ): ts.ClassLikeDeclarationBase | null {
    const source = defineCall.typeArgument.source;
    if (source == null || source.kind !== 'source-node') {
      return null;
    }

    const sourceFile = this.readSourceFile(source.file.path);
    if (sourceFile == null) {
      return null;
    }

    const node = findNodeBySpan(sourceFile, source.span.start, source.span.end);
    if (node == null) {
      return null;
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      return node;
    }

    if (ts.isVariableDeclaration(node) && node.initializer != null) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isClassExpression(initializer)) {
        return initializer;
      }
    }

    return null;
  }

  private readSourceFile(
    filePath: string,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) ?? null;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const parsed = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(filePath),
      );
      this.parsedFiles.set(filePath, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(filePath, null);
      return null;
    }
  }

  private readDefineBindableSurface(
    contributor: FieldContributor,
    classCarrier: ts.ClassLikeDeclarationBase | null,
  ): BindableSurface {
    if (contributor.expression == null) {
      return new BindableSurface();
    }

    const source = contributor.witness.source;
    if (source == null) {
      return new BindableSurface();
    }

    const sourceFile = this.readSourceFile(source.file.path);
    if (sourceFile == null) {
      return new BindableSurface();
    }

    const inputs = [
      createBindableResolutionInput(
        'definition-bindables',
        [{
          expression: contributor.expression,
          carrier: 'definition-object',
          source,
          note: contributor.witness.note,
        } satisfies BindableContributorSeed],
      ),
    ];

    return readBindableSurfaceFromInputs(
      inputs,
      classCarrier ?? ts.factory.createClassExpression(undefined, undefined, undefined, undefined, []),
      source.file,
      sourceFile,
    );
  }

  private materializeDefinition(
    resource: ResourceDefinition,
  ): ResourceDefinition {
    return resource.kind === 'custom-element'
      ? this.customElementMaterializerValue.materialize(resource)
      : resource.kind === 'custom-attribute' || resource.kind === 'template-controller'
        ? this.customAttributeMaterializerValue.materialize(resource)
      : resource.kind === 'binding-command'
        ? this.bindingCommandMaterializerValue.materialize(resource)
      : resource.kind === 'value-converter'
        ? this.valueConverterMaterializerValue.materialize(resource)
      : resource.kind === 'binding-behavior'
        ? this.bindingBehaviorMaterializerValue.materialize(resource)
        : resource;
  }
}

interface DefineFieldWitnessSeed {
  readonly source: SourceNodeRef | null;
  readonly note: string | null;
}

interface FieldContributor {
  readonly expression: ts.Expression | null;
  readonly witness: DefineFieldWitnessSeed;
}

interface RecognizedCustomElementSeed {
  readonly identity: CustomElementIdentity;
  readonly policy: CustomElementPolicy;
  readonly bindableSurface: BindableSurface;
  readonly dependencyContribution: CustomElementDependencyContribution;
  readonly templateSource: CustomElementTemplateSource;
}

interface RecognizedCustomAttributeSeed {
  readonly identity: CustomAttributeIdentity;
  readonly bindableSurface: BindableSurface;
  readonly policy: CustomAttributePolicy;
  readonly dependencyContribution: CustomAttributeDependencyContribution;
}

function createFieldContributor(
  _field: FieldContributorFieldKind,
  literal: ts.ObjectLiteralExpression | null,
  propertyNameOrDefinitionArgument: string | ExportValueDefineCall['definitionArgument'],
  fallbackSource: SourceNodeRef | null,
): FieldContributor {
  if (typeof propertyNameOrDefinitionArgument !== 'string') {
    if (propertyNameOrDefinitionArgument.kind === 'object-literal') {
      const property = literal == null
        ? null
        : readObjectLiteralPropertyInitializer(literal, 'name');
      const source = property == null || fallbackSource == null
        ? propertyNameOrDefinitionArgument.source
        : toNodeRef(property, fallbackSource.file, property.getSourceFile());
      return {
        expression: property,
        witness: {
          source,
          note: 'Definition-object name field seeded from the define-call primary argument object.',
        },
      };
    }

    return {
      expression: propertyNameOrDefinitionArgument.kind === 'string-literal'
        ? propertyNameOrDefinitionArgument.source == null
          ? null
          : ts.factory.createStringLiteral(propertyNameOrDefinitionArgument.name ?? '')
        : null,
      witness: {
        source: propertyNameOrDefinitionArgument.source,
        note: 'Definition/name field seeded directly from the define-call primary argument.',
      },
    };
  }

  const property = literal == null
    ? null
    : readObjectLiteralPropertyInitializer(literal, propertyNameOrDefinitionArgument);
  const source = property == null || fallbackSource == null
    ? null
    : toNodeRef(property, fallbackSource.file, property.getSourceFile());

  return {
    expression: property,
    witness: {
      source,
      note: property == null
        ? null
        : `Definition-object property ${propertyNameOrDefinitionArgument} contributed this field.`,
    },
  };
}

function createSyntheticCustomAttributeContributor(
  field: 'is-template-controller',
  value: boolean,
): FieldContributor {
  return {
    expression: value ? ts.factory.createTrue() : ts.factory.createFalse(),
    witness: {
      source: null,
      note: `Template-controller admission was forced by the recognized ${field} define-call kind.`,
    },
  };
}

type FieldContributorFieldKind =
  | 'name'
  | 'aliases'
  | 'bindables'
  | 'dependencies'
  | 'capture'
  | 'containerless'
  | 'shadow-options'
  | 'has-slots'
  | 'process-content'
  | 'template'
  | 'default-property'
  | 'no-multi-bindings'
  | 'container-strategy'
  | 'is-template-controller';

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.id}:${node.getStart(sourceFile)}:${node.end}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Unknown',
    new SourceSpan(node.getStart(sourceFile), node.end),
  );
}

function readObjectLiteralPropertyInitializer(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function readSelectedStringValue(
  contributor: FieldContributor,
): string | null {
  return readStringLiteralValue(contributor.expression == null ? null : unwrapExpression(contributor.expression));
}

function readMergedStringArrayValues(
  contributors: readonly FieldContributor[],
): readonly string[] {
  const merged: string[] = [];
  for (const contributor of contributors) {
    for (const current of readStringArrayValues(contributor.expression == null ? null : unwrapExpression(contributor.expression))) {
      if (!merged.includes(current)) {
        merged.push(current);
      }
    }
  }
  return merged;
}

function buildCustomElementFieldProvenance(
  field: CustomElementFieldProvenance['field'],
  contributors: readonly FieldContributor[],
): CustomElementFieldProvenance | null {
  if (contributors.every((current) => current.expression == null)) {
    return null;
  }

  const witnesses = contributors
    .filter((current) => current.expression != null)
    .map((current) => new CustomElementFieldWitness(field, 'definition-object', current.witness.source, current.witness.note));

  return new CustomElementFieldProvenance(
    field,
    field === 'aliases' || field === 'bindables' || field === 'dependencies' ? 'merged' : 'selected',
    witnesses.at(-1) ?? null,
    witnesses,
  );
}

function compactCustomElementProvenances(
  values: readonly (CustomElementFieldProvenance | null)[],
): readonly CustomElementFieldProvenance[] {
  return values.filter((value): value is CustomElementFieldProvenance => value != null);
}

function buildCustomAttributeFieldProvenance(
  field: CustomAttributeFieldProvenance['field'],
  contributors: readonly FieldContributor[],
): CustomAttributeFieldProvenance | null {
  if (contributors.every((current) => current.expression == null)) {
    return null;
  }

  const witnesses = contributors
    .filter((current) => current.expression != null)
    .map((current) => new CustomAttributeFieldWitness(field, 'definition-object', current.witness.source, current.witness.note));

  return new CustomAttributeFieldProvenance(
    field,
    field === 'aliases' || field === 'bindables' || field === 'dependencies' ? 'merged' : 'selected',
    witnesses.at(-1) ?? null,
    witnesses,
  );
}

function compactCustomAttributeProvenances(
  values: readonly (CustomAttributeFieldProvenance | null)[],
): readonly CustomAttributeFieldProvenance[] {
  return values.filter((value): value is CustomAttributeFieldProvenance => value != null);
}

function buildBindingCommandFieldProvenance(
  field: BindingCommandFieldProvenance['field'],
  contributors: readonly FieldContributor[],
): BindingCommandFieldProvenance | null {
  if (contributors.every((current) => current.expression == null)) {
    return null;
  }

  const witnesses = contributors
    .filter((current) => current.expression != null)
    .map((current) => new BindingCommandFieldWitness(field, 'definition-object', current.witness.source, current.witness.note));

  return new BindingCommandFieldProvenance(
    field,
    field === 'aliases' ? 'merged' : 'selected',
    witnesses.at(-1) ?? null,
    witnesses,
  );
}

function compactBindingCommandProvenances(
  values: readonly (BindingCommandFieldProvenance | null)[],
): readonly BindingCommandFieldProvenance[] {
  return values.filter((value): value is BindingCommandFieldProvenance => value != null);
}

function buildValueConverterFieldProvenance(
  field: ValueConverterFieldProvenance['field'],
  contributors: readonly FieldContributor[],
): ValueConverterFieldProvenance | null {
  if (contributors.every((current) => current.expression == null)) {
    return null;
  }

  const witnesses = contributors
    .filter((current) => current.expression != null)
    .map((current) => new ValueConverterFieldWitness(field, 'definition-object', current.witness.source, current.witness.note));

  return new ValueConverterFieldProvenance(
    field,
    field === 'aliases' ? 'merged' : 'selected',
    witnesses.at(-1) ?? null,
    witnesses,
  );
}

function compactValueConverterProvenances(
  values: readonly (ValueConverterFieldProvenance | null)[],
): readonly ValueConverterFieldProvenance[] {
  return values.filter((value): value is ValueConverterFieldProvenance => value != null);
}

function buildBindingBehaviorFieldProvenance(
  field: BindingBehaviorFieldProvenance['field'],
  contributors: readonly FieldContributor[],
): BindingBehaviorFieldProvenance | null {
  if (contributors.every((current) => current.expression == null)) {
    return null;
  }

  const witnesses = contributors
    .filter((current) => current.expression != null)
    .map((current) => new BindingBehaviorFieldWitness(field, 'definition-object', current.witness.source, current.witness.note));

  return new BindingBehaviorFieldProvenance(
    field,
    field === 'aliases' ? 'merged' : 'selected',
    witnesses.at(-1) ?? null,
    witnesses,
  );
}

function compactBindingBehaviorProvenances(
  values: readonly (BindingBehaviorFieldProvenance | null)[],
): readonly BindingBehaviorFieldProvenance[] {
  return values.filter((value): value is BindingBehaviorFieldProvenance => value != null);
}

function readBooleanValue(
  expression: ts.Expression | null,
): boolean | null {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return null;
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function readCaptureKind(
  expression: ts.Expression | null,
): CustomElementCaptureKind {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return 'open';
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword || current.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean';
  }
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isIdentifier(current) || ts.isPropertyAccessExpression(current)) {
    return 'predicate';
  }
  return 'open';
}

function readShadowMode(
  expression: ts.Expression | null,
): 'open' | 'closed' | null {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null || !ts.isObjectLiteralExpression(current)) {
    return null;
  }

  const mode = readStringLiteralValue(readObjectLiteralPropertyInitializer(current, 'mode'));
  return mode === 'open' || mode === 'closed'
    ? mode
    : null;
}

function readProcessContentKind(
  expression: ts.Expression | null,
): CustomElementProcessContentKind {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null || current.kind === ts.SyntaxKind.NullKeyword) {
    return 'none';
  }
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return 'string-key';
  }
  if (ts.isIdentifier(current) || ts.isPropertyAccessExpression(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) {
    return 'function-hook';
  }
  return 'open';
}

function readContainerStrategy(
  expression: ts.Expression | null,
): 'reuse' | 'new' | null {
  const value = readStringLiteralValue(expression == null ? null : unwrapExpression(expression));
  return value === 'reuse' || value === 'new'
    ? value
    : null;
}

function readCustomElementDependencySources(
  contributors: readonly FieldContributor[],
): readonly CustomElementDependencySource[] {
  const contribution = contributors[0];
  if (contribution == null || contribution.expression == null) {
    return [];
  }

  const expression = unwrapExpression(contribution.expression);
  const witness = new CustomElementFieldWitness('dependencies', 'definition-object', contribution.witness.source, contribution.witness.note);

  if (ts.isArrayLiteralExpression(expression)) {
    const sourceKind: CustomElementDependencySourceKind = expression.elements.some(ts.isSpreadElement)
      ? 'merged-array'
      : 'literal-array';
    return [new CustomElementDependencySource(
      sourceKind,
      witness,
      null,
      'open-expression',
      'Dependency source seeded from a define-call array literal.',
    )];
  }

  const seed = readReferenceSeed(expression);
  const sourceKind: CustomElementDependencySourceKind = ts.isCallExpression(expression)
    ? 'call-result'
    : seed.kind === 'identifier-name' || seed.kind === 'property-access-name'
      ? 'array-reference'
      : 'open-expression';
  return [new CustomElementDependencySource(
    sourceKind,
    witness,
    seed.candidateName,
    seed.kind as CustomElementDependencyLinkSeedKind,
  )];
}

function readCustomElementDependencyEntries(
  contributors: readonly FieldContributor[],
): readonly CustomElementDependencyEntry[] {
  const contribution = contributors[0];
  if (contribution == null || contribution.expression == null) {
    return [];
  }

  const expression = unwrapExpression(contribution.expression);
  const witness = new CustomElementFieldWitness('dependencies', 'definition-object', contribution.witness.source, contribution.witness.note);

  if (ts.isArrayLiteralExpression(expression)) {
    const sourceKind: CustomElementDependencySourceKind = expression.elements.some(ts.isSpreadElement)
      ? 'merged-array'
      : 'literal-array';
    return expression.elements.map((element) => {
      const target = ts.isSpreadElement(element) ? element.expression : element;
      const seed = readReferenceSeed(unwrapExpression(target));
      return new CustomElementDependencyEntry(
        seed.candidateName,
        sourceKind,
        seed.kind as CustomElementDependencyLinkSeedKind,
        witness,
      );
    });
  }

  const seed = readReferenceSeed(expression);
  return [new CustomElementDependencyEntry(
    seed.candidateName,
    ts.isCallExpression(expression)
      ? 'call-result'
      : seed.kind === 'identifier-name' || seed.kind === 'property-access-name'
        ? 'array-reference'
        : 'open-expression',
    seed.kind as CustomElementDependencyLinkSeedKind,
    witness,
  )];
}

function readCustomAttributeDependencyEntries(
  contributors: readonly FieldContributor[],
): readonly CustomAttributeDependencyEntry[] {
  const contribution = contributors[0];
  if (contribution == null || contribution.expression == null) {
    return [];
  }

  const expression = unwrapExpression(contribution.expression);
  const witness = new CustomAttributeFieldWitness('dependencies', 'definition-object', contribution.witness.source, contribution.witness.note);

  if (ts.isArrayLiteralExpression(expression)) {
    const sourceKind: CustomAttributeDependencySourceKind = expression.elements.some(ts.isSpreadElement)
      ? 'merged-array'
      : 'literal-array';
    return expression.elements.map((element) => {
      const target = ts.isSpreadElement(element) ? element.expression : element;
      const seed = readReferenceSeed(unwrapExpression(target));
      return new CustomAttributeDependencyEntry(
        seed.candidateName,
        sourceKind,
        seed.kind as CustomAttributeDependencyLinkSeedKind,
        witness,
      );
    });
  }

  const seed = readReferenceSeed(expression);
  return [new CustomAttributeDependencyEntry(
    seed.candidateName,
    ts.isCallExpression(expression)
      ? 'call-result'
      : seed.kind === 'identifier-name' || seed.kind === 'property-access-name'
        ? 'array-reference'
        : 'open-expression',
    seed.kind as CustomAttributeDependencyLinkSeedKind,
    witness,
  )];
}

function readCustomElementTemplateSource(
  contributor: FieldContributor,
): CustomElementTemplateSource {
  const expression = contributor.expression == null ? null : unwrapExpression(contributor.expression);
  const provenance = buildCustomElementFieldProvenance('template', [contributor]);

  if (expression == null || expression.kind === ts.SyntaxKind.NullKeyword) {
    return new CustomElementTemplateSource(
      'none',
      null,
      null,
      provenance,
      'No template field was present on the define-call object.',
    );
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return new CustomElementTemplateSource(
      'inline-string',
      expression.text,
      null,
      provenance,
      'Inline template text was seeded from the define-call object.',
    );
  }

  const seed = readReferenceSeed(expression);
  return new CustomElementTemplateSource(
    seed.kind === 'open-expression' ? 'open' : 'expression-reference',
    null,
    seed.candidateName,
    provenance,
    seed.kind === 'open-expression'
      ? 'Template source stayed open under the bounded define-call reader.'
      : 'Template source seeded as a reference-shaped define-call field.',
  );
}

function createRecognizedDefinitionId(
  candidate: ResourceCandidate,
  kind: ResourceDefinition['kind'],
): string {
  const ownerId = candidate.sourceExport.symbol?.id
    ?? `export:${candidate.sourceExport.name}`;
  return `recognized-resource:${kind}:${ownerId}`;
}

function readConventionName(
  candidate: ResourceCandidate,
): string | null {
  const kind = candidate.possibleKinds[0] ?? null;
  if (
    kind == null
    || !candidate.recognitionPaths.some((current) => current.kind === 'convention' && current.status === 'matched')
  ) {
    return null;
  }

  return deriveConventionName(kind, candidate.sourceExport.name);
}

function deriveConventionName(
  kind: ResourceDefinition['kind'],
  exportName: string,
): string | null {
  switch (kind) {
    case 'custom-element':
      return deriveKebabConventionName(exportName, 'CustomElement');
    case 'custom-attribute':
      return deriveKebabConventionName(exportName, 'CustomAttribute');
    case 'template-controller':
      return deriveKebabConventionName(exportName, 'TemplateController');
    case 'value-converter':
      return deriveLowerCamelConventionName(exportName, 'ValueConverter');
    case 'binding-behavior':
      return deriveLowerCamelConventionName(exportName, 'BindingBehavior');
    case 'binding-command':
      return deriveLowerCamelConventionName(exportName, 'BindingCommand');
    case 'attribute-pattern':
      return null;
  }
}

function deriveKebabConventionName(
  exportName: string,
  suffix: string,
): string | null {
  const base = stripSuffix(exportName, suffix);
  return base == null || base.length === 0
    ? null
    : toKebabCase(base);
}

function deriveLowerCamelConventionName(
  exportName: string,
  suffix: string,
): string | null {
  const base = stripSuffix(exportName, suffix);
  return base == null || base.length === 0
    ? null
    : `${base[0]!.toLowerCase()}${base.slice(1)}`;
}

function stripSuffix(
  value: string,
  suffix: string,
): string | null {
  return value.endsWith(suffix)
    ? value.slice(0, Math.max(0, value.length - suffix.length))
    : null;
}

function toKebabCase(
  value: string,
): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function mergeDefinitions(
  recognized: readonly ResourceDefinition[],
  seeded: readonly ResourceDefinition[],
): readonly ResourceDefinition[] {
  const byIdentity = new Map<string, ResourceDefinition>();

  for (const current of recognized) {
    byIdentity.set(readResourceIdentityKey(current), current);
  }

  for (const current of seeded) {
    byIdentity.set(readResourceIdentityKey(current), current);
  }

  // TODO: later query/diagnostic work should surface suspicious mixes such as
  // decorator/static-$au/class-surface ingress combined with imperative
  // define-call ingress for the same logical resource owner.
  return [...byIdentity.values()];
}

function readResourceIdentityKey(
  resource: ResourceDefinition,
): string {
  return `${resource.kind}:${readTypeIdentity(resource.type)}`;
}

function readTypeIdentity(
  type: ResourceDefinition['type'],
): string {
  return type.kind === 'symbol'
    ? type.id
    : type.id;
}

function ensureResourceKey(
  resource: ResourceDefinition,
): ResourceDefinition {
  if (resource.key != null) {
    return resource;
  }

  const owner = resource.type;
  const name = 'name' in resource ? resource.name : null;
  if (name == null) {
    return resource;
  }

  const key = new KeyRef(
    `au:resource:${resource.kind}:${name}`,
    'resource',
    owner,
    name,
  );

  switch (resource.kind) {
    case 'custom-element':
      return new CustomElementDefinition(
        resource.id,
        resource.type,
        new CustomElementIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.policy,
        resource.bindableSurface,
        resource.dependencyContribution,
        resource.templateSource,
        resource.watchSurface,
        resource.lifecycleHooks,
        resource.childrenSurface,
        resource.slottedSurface,
        resource.slotTopology,
      );
    case 'custom-attribute':
      return new CustomAttributeDefinition(
        resource.id,
        resource.type,
        new CustomAttributeIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.bindableSurface,
        resource.policy,
        resource.dependencyContribution,
        resource.defaultBindingMode,
        resource.watchSurface,
        resource.lifecycleHooks,
      );
    case 'template-controller':
      return new TemplateControllerDefinition(
        resource.id,
        resource.type,
        new CustomAttributeIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.bindableSurface,
        resource.policy,
        resource.dependencyContribution,
        resource.watchSurface,
        resource.lifecycleHooks,
      );
    case 'binding-command':
      return new BindingCommandDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new BindingCommandIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.buildBasis,
      );
    case 'value-converter':
      return new ValueConverterDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new ValueConverterIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.behavior,
      );
    case 'binding-behavior':
      return new BindingBehaviorDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new BindingBehaviorIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.execution,
      );
    case 'attribute-pattern':
      return new AttributePatternDefinition(
        resource.id,
        resource.type,
        key,
        resource.pattern,
        resource.symbols,
      );
  }
}
