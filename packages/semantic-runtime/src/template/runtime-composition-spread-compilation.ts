import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { bindProductDetailEnvelope } from '../kernel/product-details.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializationRecord, MaterializedProduct } from '../kernel/materialization.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { CustomElementCaptureKind, type CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import { HtmlElement, HtmlNamespaceKind } from './html-ir.js';
import type { HydrateElementInstruction, TemplateInstruction } from './instruction-ir.js';
import { TemplateCompilerSpreadCompileRequest, TemplateCompilerSpreadCompileState } from './compiler-world.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { CompositionContext } from './runtime-composition.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import { RuntimeBindingIssuePublisher, type RuntimeBindingIssue } from './runtime-binding-issue.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
import type { TemplateExpressionParse, TemplateValueSite } from './value-site.js';
import { TemplateProductDetails } from './product-details.js';
import { RuntimeTemplateCompilerSpreadCompileHost } from './runtime-spread-compile-host.js';
import { RuntimeSpreadCompilation, indexRuntimeSpreadInstructionOrigins } from './runtime-spread-compilation.js';
import type { ProductHandle } from '../kernel/handles.js';
import { RuntimeRendererSpreadCompileState } from './runtime-renderer.js';
import { runtimeLocalName } from './runtime-dom-name.js';

/** Compiler invocations induced by composition; these do not claim composed binding activation or DOM execution. */
export class RuntimeCompositionSpreadEmission {
  static readonly empty = new RuntimeCompositionSpreadEmission();
  readonly compilations: RuntimeSpreadCompilation[] = [];
  readonly hosts: HtmlElement[] = [];
  readonly instructions: TemplateInstruction[] = [];
  readonly valueSites: TemplateValueSite[] = [];
  readonly expressionParses: TemplateExpressionParse[] = [];
  readonly compilerIssues: TemplateCompilerIssue[] = [];
  readonly bindingIssues: RuntimeBindingIssue[] = [];
  readonly records: KernelStoreRecord[] = [];
  readonly origins = new Map<ProductHandle, ProductHandle>();
}

export interface RuntimeCompositionSpreadRequest {
  readonly localKey: string;
  readonly context: CompositionContext;
  readonly controller: RuntimeControllerFrame;
  readonly instruction: HydrateElementInstruction;
  readonly definition: CustomElementDefinition;
  /** Compiler services and resource lookups for AuCompose's own container, not the composed CE's scope. */
  readonly world: TemplateCompilerWorldEmission;
  readonly source: RuntimeRenderingSourceSet;
}

/** Mirror AuCompose's capture partition and invoke the existing captured-attribute compiler. */
export class RuntimeCompositionSpreadCompiler {
  constructor(private readonly store: KernelStore, private readonly publication: KernelPublicationContext) {}

  compile(request: RuntimeCompositionSpreadRequest, output: RuntimeCompositionSpreadEmission): void {
    const { context, controller, instruction, definition, world, source } = request;
    if (instruction.captureSyntaxProductHandles.length === 0) return;
    const local = `${request.localKey}:composition-spread`;
    const recordStart = output.records.length;
    const identity = this.store.handles.identity(`${local}:host`);
    const product = new MaterializedProduct(this.store.handles.product(`${local}:host`),
      KernelVocabulary.Template.HtmlNode.key, identity, null, source.provenanceHandle);
    const host = bindProductDetailEnvelope(new HtmlElement(
      runtimeLocalName(definition.name, HtmlNamespaceKind.Html), HtmlNamespaceKind.Html, [], [], false, null, null,
    ), product);
    output.hosts.push(host);
    output.records.push(new CompilerIdentity(identity, KernelVocabulary.Template.HtmlNode.key,
      context.identityHandle, null, 'composition-host'), product,
    new MaterializationRecord(this.store.handles.materialization(`${local}:host`), identity, [product.handle], []));

    const captures = instruction.captureSyntaxProductHandles.map(handle =>
      this.publication.readProductDetail(TemplateProductDetails.AttributeSyntax, handle));
    const retained: AttributeSyntax[] = [];
    const transferred: AttributeSyntax[] = [];
    let summary: string | null = null;
    if (captures.some(syntax => syntax == null)) {
      summary = 'AuCompose capture partition lost an original AttrSyntax product.';
    } else if (definition.capture.kind === CustomElementCaptureKind.Predicate
      || definition.capture.kind === CustomElementCaptureKind.Open) {
      summary = 'AuCompose capture partition requires an exact result for its runtime capture predicate.';
    } else {
      for (const syntax of captures as AttributeSyntax[]) {
        // Native partition uses property-name keys, NOT the compiler's bindable attribute alias lookup.
        // Bindable.from produces an ordinary object in RC2, so its inherited keys participate in `in` too.
        const isBindableKey = definition.bindables.some(bindable => bindable.name === syntax.target)
          || syntax.target in Object.prototype;
        const capture = !isBindableKey
          && definition.capture.kind === CustomElementCaptureKind.All;
        (capture ? retained : transferred).push(syntax);
      }
    }
    const parseStart = output.expressionParses.length;
    const compiled = summary == null ? world.templateCompiler.compileSpread(new TemplateCompilerSpreadCompileRequest(
      local, controller.definitionProductHandle, transferred,
      { kind: 'composition-host', instruction, target: host }, definition.productHandle,
    ), new RuntimeTemplateCompilerSpreadCompileHost(
      this.store, this.publication, world, source, new RuntimeBindingIssuePublisher(this.store), null,
      output.records, output.bindingIssues, output.compilerIssues, output.instructions, output.valueSites,
      output.expressionParses, instruction.productHandle, controller.productHandle,
    )) : null;
    const state = compiled == null ? RuntimeRendererSpreadCompileState.Open
      : compiled.state === TemplateCompilerSpreadCompileState.Compiled ? RuntimeRendererSpreadCompileState.Compiled
        : compiled.state === TemplateCompilerSpreadCompileState.NoCapturedAttributes ? RuntimeRendererSpreadCompileState.NoCapturedAttributes
          : compiled.state === TemplateCompilerSpreadCompileState.Invalid ? RuntimeRendererSpreadCompileState.Invalid
            : RuntimeRendererSpreadCompileState.Open;
    const requestor = controller.definitionProductHandle == null ? null
      : this.publication.readProductDetail(ResourceProductDetails.Definition, controller.definitionProductHandle);
    const hydration = controller.readHydrationContext();
    output.compilations.push(new RuntimeSpreadCompilation({
      state,
      origin: { kind: 'composition-host', contextProductHandle: context.productHandle,
        contextIdentityHandle: context.identityHandle, host,
        retainedCaptureSyntaxProductHandles: retained.map(syntax => syntax.productHandle) },
      requestorDefinitionProductHandle: controller.definitionProductHandle,
      requestorDefinitionIdentityHandle: requestor?.identityHandle ?? null,
      spreadInstructionProductHandle: instruction.productHandle,
      spreadInstructionIdentityHandle: instruction.identityHandle,
      capturedAttributeContextInstructionProductHandle: instruction.productHandle,
      capturedAttributeContextInstructionIdentityHandle: instruction.identityHandle,
      capturedAttributeContextControllerProductHandle: controller.productHandle,
      capturedAttributeContextControllerIdentityHandle: controller.identityHandle,
      hydrationContextProductHandle: hydration?.productHandle ?? null,
      hydrationContextIdentityHandle: hydration?.identityHandle ?? null,
      targetHtmlNodeProductHandle: host.productHandle,
      targetHtmlNodeIdentityHandle: host.identityHandle,
      targetDefinitionExplicit: true,
      targetDefinitionProductHandle: definition.productHandle,
      targetDefinitionIdentityHandle: definition.identityHandle,
      capturedSyntaxProductHandles: transferred.map(syntax => syntax.productHandle),
      rootInstructionProductHandles: compiled?.instructions.map(value => value.productHandle) ?? [],
      createdInstructionProductHandles: compiled?.createdInstructions.map(value => value.productHandle) ?? [],
      expressionParseProductHandles: output.expressionParses.slice(parseStart).map(value => value.productHandle),
      summary: summary ?? compiled?.summary ?? null,
      reasonKinds: summary == null ? compiled?.reasonKinds ?? [] : [OpenSeamReasonKind.FeatureNotYetModeled],
    }));
    indexRuntimeSpreadInstructionOrigins(output.records.slice(recordStart), output.origins);
  }
}
