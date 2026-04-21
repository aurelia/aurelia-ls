import {
  CompiledTemplateRef,
  type TemplateRef,
} from './refs.js';
import type { CompilerConsultedWorld } from './compiler/index.js';
import {
  AuthoredTemplate,
  AuthoredTemplateParser,
  Controller,
  type CompiledElementNode,
  CompiledTemplate,
  CompilationContext,
  type CustomAttributePreparation,
  type CustomElementPreparation,
  ElementController,
  TemplateControllerPreparation,
  TemplateCompilationEngine,
} from './compiler/index.js';
import type { CustomElementDefinition } from './resources/index.js';
import type {
  CompilerAuthoredAttribute,
  CompilerElementAttributeClassification,
} from './compiler/index.js';

// This stays intentionally narrow for now, but it now reads a compiler-facing
// consulted world that looks much closer to the real JIT compiler's moving
// parts than the old world+resource-resolver stub did.
export class TemplateCompiler {
  readonly world: CompilerConsultedWorld;
  private readonly authoredTemplateParser = new AuthoredTemplateParser();

  constructor(
    world: CompilerConsultedWorld,
  ) {
    this.world = world;
  }

  createCompilationContext(): CompilationContext {
    return new CompilationContext(this.world);
  }

  classifyElementAttributes(
    elementName: string,
    authoredAttributes: readonly CompilerAuthoredAttribute[],
  ): CompilerElementAttributeClassification {
    return this.createCompilationContext().classifyElementAttributes(elementName, authoredAttributes);
  }

  parseAuthoredTemplate(
    template: TemplateRef,
    rawText: string,
  ): AuthoredTemplate {
    return this.authoredTemplateParser.parse(template, rawText);
  }

  compileAuthoredTemplate(
    template: TemplateRef,
    rawText: string,
  ): CompiledTemplate {
    const authored = this.parseAuthoredTemplate(template, rawText);
    return this.compileParsedTemplate(authored);
  }

  compileParsedTemplate(
    template: AuthoredTemplate,
  ): CompiledTemplate {
    const engine = new TemplateCompilationEngine(this.createCompilationContext());
    return engine.compile(template);
  }

  compile(
    template: TemplateRef,
  ): CompiledTemplateRef {
    return new CompiledTemplateRef(
      `compiled:${template.id}`,
      template,
      this.world.world,
    );
  }

  createElementController(
    definition: CustomElementDefinition | null = null,
    parent: Controller | null = null,
    hostElement: CompiledElementNode | null = null,
  ): ElementController {
    return Controller.$el(this.world, definition, parent, hostElement);
  }

  prepareCustomElement(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): CustomElementPreparation | null {
    return this.world.rendering.prepareCustomElement(parentController, hostElement);
  }

  prepareCustomAttributes(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): readonly CustomAttributePreparation[] {
    return this.world.rendering.prepareCustomAttributes(parentController, hostElement);
  }

  prepareTemplateController(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    return this.world.rendering.prepareTemplateController(parentController, hostElement);
  }

  // NOTE: kept as a temporary alias while the generic TC path is renamed from
  // "hydration" to the more honest "preparation" terminology. The generic
  // compiler/runtime bridge does not create synthetic views yet.
  prepareTemplateControllerHydration(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    return this.prepareTemplateController(parentController, hostElement);
  }
}
