import type { AureliaAppWorldEmission } from '../configuration/app-world-producer.js';
import {
  CustomElementDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { KernelStore } from '../kernel/store.js';
import {
  AttributeClassificationInput,
  AttributeClassificationProducer,
  type AttributeClassificationEmission,
} from './attribute-classification-producer.js';
import {
  AttributeSyntaxParseInput,
  AttributeSyntaxProducer,
  type AttributeSyntaxParseEmission,
} from './attribute-syntax-producer.js';
import type {
  TemplateCompilerWorldEmission,
} from './compiler-world-producer.js';
import {
  TemplateCompilationUnitConstructionInput,
  TemplateCompilationUnitProducer,
  type TemplateCompilationUnitEmission,
} from './compilation-unit-producer.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import {
  HtmlParseInput,
  HtmlParserProducer,
  type HtmlParseEmission,
} from './html-parser-producer.js';
import {
  TemplateValueSiteInput,
  TemplateValueSiteProducer,
  type TemplateValueSiteEmission,
} from './value-site-producer.js';
import {
  BindingCommandLoweringInput,
  BindingCommandLoweringProducer,
  type BindingCommandLoweringEmission,
} from './binding-command-lowering-producer.js';

/** Front-door template products produced for one compiler-visible custom element definition. */
export class TemplateResourceCompilationEmission {
  constructor(
    /** Compiler world that supplied resources, syntax handlers, and runtime-shaped compiler services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Custom element definition whose authored template was admitted. */
    readonly definition: CustomElementDefinition,
    /** Compilation-unit emission for the authored template source. */
    readonly unit: TemplateCompilationUnitEmission,
    /** Authored HTML parse emission for the template source. */
    readonly html: HtmlParseEmission,
    /** Runtime-shaped attribute syntax parse over the HTML attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Resource/bindable/binding-command classification over parsed attribute syntax. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Value sites plus expression parser publications for parser-owned values. */
    readonly valueSites: TemplateValueSiteEmission,
    /** Binding-command build inputs, command-owned parser publications, and instruction products. */
    readonly bindingCommandLowering: BindingCommandLoweringEmission,
  ) {}
}

/** Template compilation-front-door result for one app-world composition. */
export class TemplateCompilationProjectEmission {
  constructor(
    /** App-world composition that supplied compiler worlds. */
    readonly appWorld: AureliaAppWorldEmission,
    /** Per-resource template compilation-front-door emissions. */
    readonly resources: readonly TemplateResourceCompilationEmission[],
  ) {}
}

/**
 * Runs the current template front door over compiler-visible custom elements.
 *
 * This pass establishes the route from converged resource definitions through compiler-world selection into
 * compilation units, authored HTML, runtime-shaped attribute syntax, attribute classification, compiler-owned
 * value-site selection, and binding-command lowering. It still stops before element/controller lowering, multi-binding
 * lowering, and final instruction sequence assembly.
 */
export class TemplateCompilationProjectPass {
  private readonly unitProducer: TemplateCompilationUnitProducer;
  private readonly htmlParser: HtmlParserProducer;
  private readonly attributeSyntax: AttributeSyntaxProducer;
  private readonly attributeClassification: AttributeClassificationProducer;
  private readonly valueSites: TemplateValueSiteProducer;
  private readonly bindingCommandLowering: BindingCommandLoweringProducer;

  constructor(
    /** Hot analysis store shared by child producers. */
    readonly store: KernelStore,
  ) {
    this.unitProducer = new TemplateCompilationUnitProducer(store);
    this.htmlParser = new HtmlParserProducer(store);
    this.attributeSyntax = new AttributeSyntaxProducer(store);
    this.attributeClassification = new AttributeClassificationProducer(store);
    this.valueSites = new TemplateValueSiteProducer(store);
    this.bindingCommandLowering = new BindingCommandLoweringProducer(store);
  }

  compile(appWorld: AureliaAppWorldEmission): TemplateCompilationProjectEmission {
    const resources: TemplateResourceCompilationEmission[] = [];

    appWorld.compilerWorlds.forEach((compilerWorld, worldIndex) => {
      compilerWorld.resourceScope.resources.forEach((visibleResource, resourceIndex) => {
        const definition = visibleResource.definition;
        if (!(definition instanceof CustomElementDefinition)) {
          return;
        }
        const sourceKind = templateSourceKind(definition);
        if (sourceKind == null) {
          return;
        }

        const localKey = templateResourceCompilationLocalKey(worldIndex, resourceIndex, definition);
        const owner = new TemplateSourceOwnerReference(
          definition.productHandle,
          definition.identityHandle,
          ResourceDefinitionKind.CustomElement,
          definition.name,
          definition.sourceAddressHandle,
        );
        const sourceAddressHandle = definition.template?.addressHandle ?? definition.sourceAddressHandle;
        const unit = this.unitProducer.construct(new TemplateCompilationUnitConstructionInput(
          localKey,
          TemplateCompilationUnitKind.CustomElement,
          compilerWorld,
          owner,
          sourceKind,
          definition.template?.markup ?? null,
          sourceAddressHandle,
        ));
        const html = this.htmlParser.parse(new HtmlParseInput(
          localKey,
          unit.templateSource,
          unit.compilationUnit,
          unit.parseContext,
        ));
        const attributeSyntax = this.attributeSyntax.parse(new AttributeSyntaxParseInput(
          localKey,
          unit.compilationUnit,
          html,
          compilerWorld,
        ));
        const attributeClassification = this.attributeClassification.classify(new AttributeClassificationInput(
          localKey,
          unit.compilationUnit,
          html,
          attributeSyntax,
          compilerWorld,
        ));
        const valueSites = this.valueSites.produce(new TemplateValueSiteInput(
          localKey,
          unit.compilationUnit,
          html,
          attributeSyntax,
          attributeClassification,
          compilerWorld,
        ));
        const bindingCommandLowering = this.bindingCommandLowering.lower(new BindingCommandLoweringInput(
          localKey,
          unit.compilationUnit,
          html,
          attributeSyntax,
          attributeClassification,
          valueSites,
          compilerWorld,
        ));

        resources.push(new TemplateResourceCompilationEmission(
          compilerWorld,
          definition,
          unit,
          html,
          attributeSyntax,
          attributeClassification,
          valueSites,
          bindingCommandLowering,
        ));
      });
    });

    return new TemplateCompilationProjectEmission(appWorld, resources);
  }
}

function templateSourceKind(definition: CustomElementDefinition): TemplateSourceKind | null {
  const template = definition.template;
  if (template == null) {
    return null;
  }

  switch (template.kind) {
    case CustomElementTemplateKind.Markup:
      return TemplateSourceKind.Markup;
    case CustomElementTemplateKind.DomNode:
      return TemplateSourceKind.DomNode;
    case CustomElementTemplateKind.Open:
      return TemplateSourceKind.Open;
    case CustomElementTemplateKind.None:
      return null;
  }
}

function templateResourceCompilationLocalKey(
  worldIndex: number,
  resourceIndex: number,
  definition: CustomElementDefinition,
): string {
  return [
    'component-template',
    String(worldIndex),
    String(resourceIndex),
    definition.productHandle ?? definition.key,
  ].join(':');
}
