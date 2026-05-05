import {
  AttributeParserHandlerExecutionInput,
  type AttributeParserExecutionHost,
  AttributePatternExecutionResult,
} from './attribute-syntax.js';
import { executeBuiltInAttributePattern } from './built-in-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';

/** Executes built-in attribute-pattern handlers visible through one compiler world. */
export class BuiltInAttributeParserExecutionHost implements AttributeParserExecutionHost {
  constructor(
    private readonly world: TemplateCompilerWorldEmission,
  ) {}

  execute(input: AttributeParserHandlerExecutionInput): AttributePatternExecutionResult | null {
    const executableProductHandle = input.matchedPattern.executableProductHandle;
    if (executableProductHandle == null) {
      return null;
    }
    const emission = this.world.attributePatterns.find((candidate) =>
      candidate.executable.productHandle === executableProductHandle
    ) ?? null;
    if (emission == null) {
      return null;
    }
    return executeBuiltInAttributePattern(
      emission.handler,
      input.matchedPattern.pattern.pattern,
      input.rawName,
      input.rawValue,
      input.interpretation.parts,
    );
  }
}
