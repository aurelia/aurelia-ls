import type {
  CustomAttributeDefinition,
  CustomElementDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { BindingCommandDefinition } from '../resources/index.js';
import type {
  CompilerAttributeParseResult,
  CompilerConsultedWorld,
  CompilerResourceAdmissionProvenance,
} from './compiler-consulted-world.js';
import type { TemplateCompilerHookCapability } from './compiler-capability.js';
import {
  CompilerAttributeClassifier,
  CompilerAuthoredAttribute,
  type CompilerElementAttributeClassification,
} from './attribute-classification.js';

// This mirrors the runtime template-compiler shape more closely than the old
// world+resolver stub: a compilation context reads the consulted world through
// dedicated access surfaces instead of rummaging through a generic container
// model directly.
export class CompilationContext {
  readonly root: CompilationContext;
  private readonly attributeClassifier: CompilerAttributeClassifier;

  constructor(
    readonly world: CompilerConsultedWorld,
    readonly parent: CompilationContext | null = null,
  ) {
    this.root = parent?.root ?? this;
    this.attributeClassifier = new CompilerAttributeClassifier(this);
  }

  createChild(): CompilationContext {
    return new CompilationContext(this.world, this);
  }

  findElement(
    name: string,
  ): CustomElementDefinition | null {
    return this.world.resourceResolver.findElement(name);
  }

  findAttribute(
    name: string,
  ): CustomAttributeDefinition | TemplateControllerDefinition | null {
    return this.world.resourceResolver.findAttribute(name);
  }

  findTemplateController(
    name: string,
  ): TemplateControllerDefinition | null {
    return this.world.resourceResolver.findTemplateController(name);
  }

  getCommand(
    name: string,
  ): BindingCommandDefinition | null {
    return this.world.bindingCommands.get(name);
  }

  parseAttribute(
    rawName: string,
    rawValue: string,
  ): CompilerAttributeParseResult {
    return this.world.attributeParser.parse(rawName, rawValue);
  }

  readTemplateCompilerHooks(): readonly TemplateCompilerHookCapability[] {
    return this.world.templateCompilerHooks.findAll();
  }

  hasService(
    debugName: string,
  ): boolean {
    return this.world.services.has(debugName);
  }

  readResourceAdmission(
    definition: CustomElementDefinition | CustomAttributeDefinition | TemplateControllerDefinition,
  ): CompilerResourceAdmissionProvenance | null {
    return this.world.resourceResolver.readAdmission(definition);
  }

  readBindingCommandAdmission(
    definition: BindingCommandDefinition,
  ): CompilerResourceAdmissionProvenance | null {
    return this.world.bindingCommands.readAdmission(definition);
  }

  classifyElementAttributes(
    elementName: string,
    authoredAttributes: readonly CompilerAuthoredAttribute[],
  ): CompilerElementAttributeClassification {
    return this.attributeClassifier.classifyElement(elementName, authoredAttributes);
  }
}
