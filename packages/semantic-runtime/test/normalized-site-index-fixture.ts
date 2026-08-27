import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSemanticRuntime } from '../src/api/runtime.js';
import type { ProductHandle } from '../src/kernel/handles.js';
import { MaterializedProduct } from '../src/kernel/materialization.js';
import { bindProductDetailEnvelope, readProductDetailEnvelope } from '../src/kernel/product-details.js';
import type { AttributeClassificationEmission } from '../src/template/attribute-classification-materializer.js';
import type { AttributeSyntaxParseEmission } from '../src/template/attribute-syntax-materializer.js';
import { AttributeSyntax } from '../src/template/attribute-syntax.js';
import {
  MultiBindingSegment,
} from '../src/template/binding-command-execution.js';
import { BindingCommandLoweringEmission } from '../src/template/binding-command-lowering-materializer.js';
import { CompiledTemplateEmission } from '../src/template/compiled-template-materializer.js';
import { HtmlElement, type HtmlNodeReference } from '../src/template/html-ir.js';
import { HtmlParseEmission } from '../src/template/html-parse-materializer.js';
import {
  InterpolationInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
  SetPropertyInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';
import { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import {
  TemplateValueSite,
  type TemplateValueSiteKind,
  type TemplateValueSiteReference,
} from '../src/template/value-site.js';
import {
  TemplateValueSiteEmission,
} from '../src/template/value-site-materializer.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function fixtureCompilation(
  fixtureName: string,
  definitionName: string,
): Promise<TemplateResourceCompilationEmission> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure', fixtureName),
    storeKey: `contract:template-compiler-normalized-site-index:${fixtureName}`,
  });
  const app = await runtime.openApp();
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === definitionName
  );
  if (resource == null) throw new Error(`Expected compilation '${definitionName}' in fixture '${fixtureName}'.`);
  return resource.compilation;
}

interface CompilationOverrides {
  readonly compilerWorld?: TemplateResourceCompilationEmission['compilerWorld'];
  readonly definition?: TemplateResourceCompilationEmission['definition'];
  readonly html?: HtmlParseEmission;
  readonly attributeSyntax?: AttributeSyntaxParseEmission;
  readonly attributeClassification?: AttributeClassificationEmission;
  readonly valueSites?: TemplateValueSiteEmission;
  readonly bindingCommandLowering?: BindingCommandLoweringEmission;
  readonly compiledTemplate?: CompiledTemplateEmission;
}

type ValueSiteEmissionOverrides = Partial<Pick<TemplateValueSiteEmission, 'sites' | 'parses' | 'expectations'>>;

type HtmlEmissionOverrides = Partial<Pick<HtmlParseEmission, 'nodes' | 'attributes'>>;

export function htmlEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: HtmlEmissionOverrides,
): HtmlParseEmission {
  return new HtmlParseEmission(
    compilation.html.draft,
    compilation.html.document,
    overrides.nodes ?? compilation.html.nodes,
    overrides.attributes ?? compilation.html.attributes,
    compilation.html.nodeDraftBindings,
    compilation.html.attributeDraftBindings,
    compilation.html.recoveries,
    compilation.html.records,
  );
}

export function valueSiteEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: ValueSiteEmissionOverrides,
): TemplateValueSiteEmission {
  return new TemplateValueSiteEmission(
    overrides.sites ?? compilation.valueSites.sites,
    overrides.parses ?? compilation.valueSites.parses,
    compilation.valueSites.records,
    overrides.expectations ?? compilation.valueSites.expectations,
  );
}

export function valueSiteWithNode(site: TemplateValueSite, node: HtmlNodeReference): TemplateValueSite {
  return valueSiteWith(site, { node });
}

export function valueSiteWith(
  site: TemplateValueSite,
  overrides: {
    readonly node?: HtmlNodeReference;
    readonly syntax?: AttributeSyntax;
    readonly siteKind?: TemplateValueSiteKind;
    readonly rawValue?: string;
    readonly sourceAddressHandle?: TemplateValueSite['sourceAddressHandle'];
  },
): TemplateValueSite {
  const envelope = readProductDetailEnvelope(site);
  if (envelope == null) throw new Error('Expected the value-site product envelope.');
  const targetEnvelope = 'sourceAddressHandle' in overrides
    ? new MaterializedProduct(
        envelope.handle,
        envelope.productKindKey,
        envelope.identityHandle,
        overrides.sourceAddressHandle ?? null,
        envelope.provenanceHandle,
      )
    : envelope;
  return bindProductDetailEnvelope(new TemplateValueSite(
    overrides.siteKind ?? site.siteKind,
    overrides.rawValue ?? site.rawValue,
    site.entryFamily,
    overrides.node ?? site.node,
    site.attribute,
    overrides.syntax ?? site.syntax,
    site.classification,
    site.bindingCommand,
    site.bindable,
    site.fieldProvenance,
  ), targetEnvelope);
}

export function equivalentAttributeSyntax(
  syntax: AttributeSyntax,
  overrides: {
    readonly runtimeRawName?: string;
    readonly rawName?: string;
    readonly rawValue?: string;
    readonly command?: string | null;
  } = {},
): AttributeSyntax {
  const envelope = readProductDetailEnvelope(syntax);
  if (envelope == null) throw new Error('Expected the attribute-syntax product envelope.');
  return bindProductDetailEnvelope(new AttributeSyntax(
    syntax.syntaxKind,
    overrides.rawName ?? syntax.rawName,
    overrides.runtimeRawName ?? syntax.runtimeRawName,
    syntax.nameSourceAddressHandle,
    overrides.rawValue ?? syntax.rawValue,
    syntax.target,
    syntax.targetSourceAddressHandle,
    'command' in overrides ? overrides.command ?? null : syntax.command,
    syntax.commandSourceAddressHandle,
    syntax.parts,
    syntax.patternParts,
    syntax.pattern,
    syntax.compiledPatternProductHandle,
    syntax.patternLiterals,
    syntax.attribute,
    syntax.fieldProvenance,
  ), envelope);
}

export function equivalentHtmlElement(
  element: HtmlElement,
  overrides: { readonly attributes?: HtmlElement['attributes'] },
): HtmlElement {
  const envelope = readProductDetailEnvelope(element);
  if (envelope == null) throw new Error('Expected the html-element product envelope.');
  return bindProductDetailEnvelope(new HtmlElement(
    element.tagName,
    element.namespace,
    overrides.attributes ?? element.attributes,
    element.children,
    element.selfClosing,
    element.tagNameAddressHandle,
    element.closingTagNameAddressHandle,
    element.recoveries,
    element.fieldProvenance,
  ), envelope);
}

export function segmentWithSyntax(
  segment: MultiBindingSegment,
  syntaxProductHandle: MultiBindingSegment['syntaxProductHandle'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    segment.site,
    segment.attribute,
    syntaxProductHandle,
    segment.bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    segment.sourceAddressHandle,
    segment.fieldProvenance,
  );
}

export function segmentWithBindable(
  segment: MultiBindingSegment,
  bindable: MultiBindingSegment['bindable'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    segment.site,
    segment.attribute,
    segment.syntaxProductHandle,
    bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    segment.sourceAddressHandle,
    segment.fieldProvenance,
  );
}

export function segmentWithSource(
  segment: MultiBindingSegment,
  sourceAddressHandle: MultiBindingSegment['sourceAddressHandle'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    segment.site,
    segment.attribute,
    segment.syntaxProductHandle,
    segment.bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    sourceAddressHandle,
    segment.fieldProvenance,
  );
}

export function segmentWithSiteAndSource(
  segment: MultiBindingSegment,
  site: TemplateValueSiteReference,
  sourceAddressHandle: MultiBindingSegment['sourceAddressHandle'],
): MultiBindingSegment {
  return new MultiBindingSegment(
    segment.productHandle,
    segment.identityHandle,
    site,
    segment.attribute,
    segment.syntaxProductHandle,
    segment.bindable,
    segment.command,
    segment.segmentIndex,
    segment.rawName,
    segment.rawValue,
    segment.targetSourceAddressHandle,
    sourceAddressHandle,
    segment.fieldProvenance,
  );
}

export function iteratorWith(
  instruction: IteratorBindingInstruction,
  overrides: {
    readonly iterableExpressionProductHandle?: ProductHandle;
    readonly tailInstructionProductHandles?: readonly ProductHandle[];
  },
): IteratorBindingInstruction {
  return new IteratorBindingInstruction(
    instruction.productHandle,
    instruction.identityHandle,
    instruction.node,
    instruction.attribute,
    instruction.targetProperty,
    instruction.localNames,
    instruction.objectBindingSourceKeys,
    overrides.iterableExpressionProductHandle ?? instruction.iterableExpressionProductHandle,
    overrides.tailInstructionProductHandles ?? instruction.tailInstructionProductHandles,
    instruction.sourceAddressHandle,
    instruction.fieldProvenance,
  );
}

export function multiAttrWithExpression(
  instruction: MultiAttrInstruction,
  expressionProductHandle: ProductHandle,
): MultiAttrInstruction {
  return new MultiAttrInstruction(
    instruction.productHandle,
    instruction.identityHandle,
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction.command,
    instruction.value,
    expressionProductHandle,
    instruction.sourceAddressHandle,
    instruction.fieldProvenance,
  );
}

export function instructionWithSource(
  instruction: TemplateInstruction,
  sourceAddressHandle: TemplateInstruction['sourceAddressHandle'],
): TemplateInstruction {
  if (instruction instanceof SetPropertyInstruction) {
    return new SetPropertyInstruction(
      instruction.productHandle,
      instruction.identityHandle,
      instruction.node,
      instruction.attribute,
      instruction.targetProperty,
      instruction.value,
      sourceAddressHandle,
      instruction.fieldProvenance,
    );
  }
  if (instruction instanceof InterpolationInstruction) {
    return new InterpolationInstruction(
      instruction.productHandle,
      instruction.identityHandle,
      instruction.node,
      instruction.attribute,
      instruction.target,
      instruction.expressionProductHandles,
      sourceAddressHandle,
      instruction.fieldProvenance,
    );
  }
  throw new Error(`Expected a plain multi-binding direct instruction; received ${instruction.instructionKind}.`);
}

export function instructionWithNode(
  instruction: TemplateInstruction,
  node: HtmlNodeReference,
): TemplateInstruction {
  if (instruction instanceof SetPropertyInstruction) {
    return new SetPropertyInstruction(
      instruction.productHandle,
      instruction.identityHandle,
      node,
      instruction.attribute,
      instruction.targetProperty,
      instruction.value,
      instruction.sourceAddressHandle,
      instruction.fieldProvenance,
    );
  }
  if (instruction instanceof InterpolationInstruction) {
    return new InterpolationInstruction(
      instruction.productHandle,
      instruction.identityHandle,
      node,
      instruction.attribute,
      instruction.target,
      instruction.expressionProductHandles,
      instruction.sourceAddressHandle,
      instruction.fieldProvenance,
    );
  }
  throw new Error(`Expected a plain multi-binding direct instruction; received ${instruction.instructionKind}.`);
}

export function setPropertyWithOutput(
  identity: SetPropertyInstruction,
  output: SetPropertyInstruction,
): SetPropertyInstruction {
  return new SetPropertyInstruction(
    identity.productHandle,
    identity.identityHandle,
    output.node,
    output.attribute,
    output.targetProperty,
    output.value,
    output.sourceAddressHandle,
    identity.fieldProvenance,
  );
}

export function compilationWith(
  compilation: TemplateResourceCompilationEmission,
  overrides: CompilationOverrides,
): TemplateResourceCompilationEmission {
  return new TemplateResourceCompilationEmission(
    compilation.localKey,
    compilation.familyOwnerHandle,
    compilation.analysisContextProductHandle,
    compilation.appRootDefinitionProductHandle,
    compilation.parentCompilerWorld,
    overrides.compilerWorld ?? compilation.compilerWorld,
    overrides.definition ?? compilation.definition,
    compilation.unit,
    overrides.html ?? compilation.html,
    overrides.attributeSyntax ?? compilation.attributeSyntax,
    overrides.attributeClassification ?? compilation.attributeClassification,
    overrides.valueSites ?? compilation.valueSites,
    overrides.bindingCommandLowering ?? compilation.bindingCommandLowering,
    overrides.compiledTemplate ?? compilation.compiledTemplate,
    compilation.registeredReads,
  );
}

type LoweringEmissionOverrides = Partial<Pick<BindingCommandLoweringEmission,
  | 'buildInputs'
  | 'lowerings'
  | 'attributeSyntaxes'
  | 'multiBindingSegments'
  | 'multiBindingLowerings'
  | 'instructions'
  | 'valueSites'
  | 'expressionParses'
>>;

export function loweringEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: LoweringEmissionOverrides,
): BindingCommandLoweringEmission {
  const lowering = compilation.bindingCommandLowering;
  return new BindingCommandLoweringEmission(
    overrides.buildInputs ?? lowering.buildInputs,
    overrides.lowerings ?? lowering.lowerings,
    lowering.issues,
    overrides.attributeSyntaxes ?? lowering.attributeSyntaxes,
    overrides.multiBindingSegments ?? lowering.multiBindingSegments,
    overrides.multiBindingLowerings ?? lowering.multiBindingLowerings,
    overrides.instructions ?? lowering.instructions,
    overrides.valueSites ?? lowering.valueSites,
    overrides.expressionParses ?? lowering.expressionParses,
    lowering.openSeams,
    lowering.records,
  );
}

type CompiledTemplateEmissionOverrides = Partial<Pick<
  CompiledTemplateEmission,
  'instructions' | 'createdInstructions'
>>;

export function compiledTemplateEmission(
  compilation: TemplateResourceCompilationEmission,
  overrides: CompiledTemplateEmissionOverrides,
): CompiledTemplateEmission {
  const compiled = compilation.compiledTemplate;
  return new CompiledTemplateEmission(
    compiled.compiledTemplate,
    compiled.compiledTemplates,
    overrides.instructions ?? compiled.instructions,
    overrides.createdInstructions ?? compiled.createdInstructions,
    compiled.instructionSequences,
    compiled.targetPlan,
    compiled.issues,
    compiled.openSeams,
    compiled.records,
  );
}

export function tracked<T>(values: readonly T[], reads: { count: number }): readonly T[] {
  return new Proxy(values, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string' && /^\d+$/u.test(property)) reads.count++;
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
}

export function sortedHandles(handles: readonly string[]): readonly string[] {
  return [...handles].sort();
}


