import type {
  TemplateCompilerCompiledHandoffInstructionValue,
  TemplateCompilerCompiledHandoffValue,
} from '@aurelia-ls/semantic-runtime/browser-template';

/** Visit each stored instruction, including residual spread cases; definition references use the flat family. */
export function visitCompiledHandoffInstructions(
  handoff: TemplateCompilerCompiledHandoffValue,
  visit: (instruction: TemplateCompilerCompiledHandoffInstructionValue) => void,
): void {
  const walk = (instruction: TemplateCompilerCompiledHandoffInstructionValue): void => {
    visit(instruction);
    if ('props' in instruction) instruction.props.forEach(walk);
    if ('instructions' in instruction) instruction.instructions.forEach(walk);
    if ('instruction' in instruction) walk(instruction.instruction);
    if ('spreadPlan' in instruction && instruction.spreadPlan != null) {
      for (const spreadCase of instruction.spreadPlan.cases) spreadCase.instructions.forEach(walk);
    }
  };
  for (const definition of handoff.definitions) {
    for (const row of definition.rows) for (const instruction of row) walk(instruction.value);
    for (const instruction of definition.surrogates) walk(instruction.value);
  }
}
