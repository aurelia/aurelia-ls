import type { AttributeParserParseResult } from './attribute-syntax.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import type { HtmlNamespaceKind } from './html-ir.js';
import { runtimeAttributeName } from './runtime-dom-name.js';

/** Which naming boundary supplied one attribute syntax parser input. */
export const enum AttributeSyntaxParseInputKind {
  /** Source spelling that still requires browser namespace normalization. */
  Authored = 'authored',
  /** Exact DOM/runtime spelling already reached by the compiler. */
  Runtime = 'runtime',
}

/** Product-free scalar input for one invocation of the compiler world's attribute parser. */
export class AttributeSyntaxSiteParseInput {
  private constructor(
    readonly inputKind: AttributeSyntaxParseInputKind,
    /** Exact spelling supplied by the caller's boundary. */
    readonly rawName: string,
    /** Exact DOM/runtime spelling that must be passed to IAttributeParser. */
    readonly runtimeRawName: string,
    readonly rawValue: string,
  ) {}

  /** Adapt authored spelling to the DOM name observed by TemplateCompiler. */
  static authored(
    rawName: string,
    rawValue: string,
    namespace: HtmlNamespaceKind | undefined,
  ): AttributeSyntaxSiteParseInput {
    return new AttributeSyntaxSiteParseInput(
      AttributeSyntaxParseInputKind.Authored,
      rawName,
      runtimeAttributeName(rawName, namespace),
      rawValue,
    );
  }

  /** Admit an exact live/runtime name without applying browser normalization again. */
  static runtime(
    rawName: string,
    rawValue: string,
  ): AttributeSyntaxSiteParseInput {
    return new AttributeSyntaxSiteParseInput(
      AttributeSyntaxParseInputKind.Runtime,
      rawName,
      rawName,
      rawValue,
    );
  }
}

/** Exact parser result and currentness receipt for one product-free attribute site. */
export class AttributeSyntaxSiteParseResult {
  constructor(
    readonly input: AttributeSyntaxSiteParseInput,
    readonly read: TemplateCompilerObservedValue<AttributeParserParseResult>,
  ) {}

  get parse(): AttributeParserParseResult {
    return this.read.value;
  }
}

/**
 * Parse one exact attribute site through the current compiler world.
 *
 * Name normalization belongs to the input factory. This operation always spends the exact parser name carried by the
 * input and retains the compiler-read receipt required by live compiler execution.
 */
export function parseAttributeSyntaxSite(
  compilerReads: Pick<TemplateCompilerReadView, 'readParsedAttribute'>,
  input: AttributeSyntaxSiteParseInput,
): AttributeSyntaxSiteParseResult {
  return new AttributeSyntaxSiteParseResult(
    input,
    compilerReads.readParsedAttribute(input.runtimeRawName, input.rawValue),
  );
}
