import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import {
  CustomElementDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { KernelStore } from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  AttributeClassificationInput,
  AttributeClassificationMaterializer,
  type AttributeClassificationEmission,
} from './attribute-classification-materializer.js';
import {
  AttributeSyntaxParseInput,
  AttributeSyntaxMaterializer,
  type AttributeSyntaxParseEmission,
} from './attribute-syntax-materializer.js';
import type {
  TemplateCompilerWorldEmission,
} from './compiler-world-materializer.js';
import {
  TemplateCompilerCompileRequest,
  type TemplateCompilerCompileHost,
  type TemplateCompilerService,
} from './compiler-world.js';
import {
  TemplateCompilationUnitConstructionRequest,
  TemplateCompilationUnitMaterializer,
  type TemplateCompilationUnitEmission,
} from './compilation-unit-materializer.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import {
  HtmlParseInput,
  HtmlParseMaterializer,
  type HtmlParseEmission,
} from './html-parse-materializer.js';
import {
  TemplateValueSiteInput,
  TemplateValueSiteMaterializer,
  type TemplateValueSiteEmission,
} from './value-site-materializer.js';
import {
  BindingCommandLoweringInput,
  BindingCommandLoweringMaterializer,
  type BindingCommandLoweringEmission,
} from './binding-command-lowering-materializer.js';
import {
  CompiledTemplateMaterializationInput,
  CompiledTemplateMaterializer,
  type CompiledTemplateEmission,
} from './compiled-template-materializer.js';
import {
  TemplateRuntimeAnalysisMaterializer,
  TemplateRuntimeAnalysisRequest,
  type TemplateRuntimeAnalysisEmission,
} from './template-runtime-analysis.js';
import {
  TemplateRuntimeAnalysisProjectContext,
  TemplateRuntimeAnalysisResource,
} from './template-runtime-analysis-context.js';

/** Front-door template products produced for one compiler-visible custom element definition. */
export class TemplateResourceCompilationEmission {
  constructor(
    /** Store-local key shared by this resource's compiler and runtime phases. */
    readonly localKey: string,
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
    /** Compiled template handoff: render targets, instruction rows, and visible compiler gaps. */
    readonly compiledTemplate: CompiledTemplateEmission,
  ) {}
}

/** Runtime/checker products produced after the project has admitted compiled template front doors. */
export class TemplateResourceRuntimeAnalysisEmission {
  constructor(
    /** Compiler-front-door products for the analyzed resource. */
    readonly compilation: TemplateResourceCompilationEmission,
    /** Runtime/checker analysis downstream of compiled-template row assembly. */
    readonly runtimeAnalysis: TemplateRuntimeAnalysisEmission,
  ) {}
}

/** Template compilation-front-door result for one app-world composition. */
export class TemplateCompilationProjectEmission {
  constructor(
    /** App-world composition that supplied compiler worlds. */
    readonly appWorld: AureliaAppWorldEmission,
    /** Per-resource template compilation plus runtime/checker analysis emissions. */
    readonly resources: readonly TemplateResourceRuntimeAnalysisEmission[],
  ) {}
}

/**
 * Runs the current template front door over compiler-visible custom elements.
 *
 * This pass establishes the route from converged resource definitions through compiler-world selection into
 * compilation units, authored HTML, runtime-shaped attribute syntax, attribute classification, compiler-owned
 * value-site selection, binding-command lowering, compiled-template row assembly, runtime Rendering dispatch, and
 * TypeChecker-backed binding-scope projection. Remaining compiler gaps stay visible as open seams at the materializer
 * that exposed them.
 */
export class TemplateCompilationProjectPass {
  private readonly unitMaterializer: TemplateCompilationUnitMaterializer;
  private readonly htmlParser: HtmlParseMaterializer;
  private readonly attributeSyntax: AttributeSyntaxMaterializer;
  private readonly attributeClassification: AttributeClassificationMaterializer;
  private readonly valueSites: TemplateValueSiteMaterializer;
  private readonly bindingCommandLowering: BindingCommandLoweringMaterializer;
  private readonly compiledTemplate: CompiledTemplateMaterializer;
  private readonly runtimeAnalysis: TemplateRuntimeAnalysisMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
  ) {
    this.unitMaterializer = new TemplateCompilationUnitMaterializer(store);
    this.htmlParser = new HtmlParseMaterializer(store);
    this.attributeSyntax = new AttributeSyntaxMaterializer(store);
    this.attributeClassification = new AttributeClassificationMaterializer(store);
    this.valueSites = new TemplateValueSiteMaterializer(store);
    this.bindingCommandLowering = new BindingCommandLoweringMaterializer(store);
    this.compiledTemplate = new CompiledTemplateMaterializer(store);
    this.runtimeAnalysis = new TemplateRuntimeAnalysisMaterializer(store);
  }

  compile(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject | null = null,
  ): TemplateCompilationProjectEmission {
    const compilations: TemplateResourceCompilationEmission[] = [];

    appWorld.compilerWorlds.forEach((compilerWorld, worldIndex) => {
      compilerWorld.resourceScope.resources.forEach((visibleResource, resourceIndex) => {
        const definition = visibleResource.definition;
        if (!(definition instanceof CustomElementDefinition)) {
          return;
        }
        const localKey = templateResourceCompilationLocalKey(worldIndex, resourceIndex, definition);
        const result = compilerWorld.templateCompiler.compile(
          new TemplateCompilerCompileRequest(localKey, definition),
          new ProjectTemplateCompilerHost(this, compilerWorld, typeSystem),
        );
        if (result.output != null) {
          compilations.push(result.output);
        }
      });
    });

    const projectContext = new TemplateRuntimeAnalysisProjectContext(compilations.flatMap((compilation) =>
      compilation.definition.productHandle == null
        ? []
        : [new TemplateRuntimeAnalysisResource(
          compilation.definition.productHandle,
          compilation.compiledTemplate.compiledTemplate.productHandle,
        )]
    ));
    const resources = compilations.map((compilation) =>
      new TemplateResourceRuntimeAnalysisEmission(
        compilation,
        this.analyzeResource(compilation, projectContext, typeSystem),
      )
    );

    return new TemplateCompilationProjectEmission(appWorld, resources);
  }

  compileResource(
    compilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    localKey: string,
    typeSystem: TypeSystemProject | null,
  ): TemplateResourceCompilationEmission | null {
    const sourceKind = templateSourceKind(definition);
    if (sourceKind == null) {
      return null;
    }

    const owner = new TemplateSourceOwnerReference(
      definition.productHandle,
      definition.identityHandle,
      ResourceDefinitionKind.CustomElement,
      definition.name,
      definition.sourceAddressHandle,
    );
    const sourceAddressHandle = definition.template?.addressHandle ?? definition.sourceAddressHandle;
    const unit = this.unitMaterializer.construct(new TemplateCompilationUnitConstructionRequest(
      localKey,
      TemplateCompilationUnitKind.CustomElement,
      compilerWorld,
      owner,
      sourceKind,
      definition.template?.markup ?? null,
      sourceAddressHandle,
      definition.template?.sourceMap ?? null,
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
    const valueSites = this.valueSites.materialize(new TemplateValueSiteInput(
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
    const compiledTemplate = this.compiledTemplate.materialize(new CompiledTemplateMaterializationInput(
      localKey,
      unit.compilationUnit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      compilerWorld,
    ));
    return new TemplateResourceCompilationEmission(
      localKey,
      compilerWorld,
      definition,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      compiledTemplate,
    );
  }

  analyzeResource(
    compilation: TemplateResourceCompilationEmission,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    typeSystem: TypeSystemProject | null,
  ): TemplateRuntimeAnalysisEmission {
    return this.runtimeAnalysis.materialize(new TemplateRuntimeAnalysisRequest(
      compilation.localKey,
      compilation.definition,
      compilation.compiledTemplate,
      compilation.attributeSyntax,
      compilation.compilerWorld,
      projectContext,
      typeSystem,
    ));
  }
}

class ProjectTemplateCompilerHost implements TemplateCompilerCompileHost<TemplateResourceCompilationEmission | null> {
  constructor(
    private readonly pass: TemplateCompilationProjectPass,
    private readonly compilerWorld: TemplateCompilerWorldEmission,
    private readonly typeSystem: TypeSystemProject | null,
  ) {}

  compile(
    request: TemplateCompilerCompileRequest,
    _compiler: TemplateCompilerService,
  ): TemplateResourceCompilationEmission | null {
    return this.pass.compileResource(
      this.compilerWorld,
      request.definition,
      request.localKey,
      this.typeSystem,
    );
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
