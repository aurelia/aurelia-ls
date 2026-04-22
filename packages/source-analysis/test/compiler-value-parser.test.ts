import { describe, expect, it } from './test-harness.js';

import {
  BindingCommandBuildBasis,
  BindingCommandDefinition,
  BindingCommandInstructionEmission,
  BindingCommandValueHandling,
  CompilerValueParser,
  ProgramRef,
  SelectedExpressionEntryFamily,
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
} from '../src/aurelia/index.js';

describe('compiler value parser', () => {
  it('normalizes legacy parser-entry seeds onto canonical parser selections', () => {
    const parser = new CompilerValueParser();
    const command = createBindingCommand('bind', 'compile-parse', 'etIsProperty');

    const result = parser.planForBindingCommand(command, 'person.address');

    expect(result.status).toBe('planned');
    expect(result.request?.entrySeed).toBe('etIsProperty');
    expect(result.request?.parserEntryFamily).toBe('IsProperty');
    expect(result.request?.parserSelection).toBeInstanceOf(SelectedExpressionEntryFamily);
    expect(result.request?.parserSelection?.entryFamily).toBe('IsProperty');
  });

  it('keeps unknown parser-entry seeds explicit instead of inventing parser selections', () => {
    const parser = new CompilerValueParser();
    const command = createBindingCommand('mystery', 'compile-parse', 'etUnknownShape');

    const result = parser.planForBindingCommand(command, 'value');

    expect(result.status).toBe('planned');
    expect(result.request?.entrySeed).toBe('etUnknownShape');
    expect(result.request?.parserEntryFamily).toBeNull();
    expect(result.request?.parserSelection).toBeNull();
  });
});

function createBindingCommand(
  name: string,
  valueHandlingKind: 'compile-parse' | 'raw-value-carry' | 'custom-expression-wrap' | 'not-applicable' | 'open',
  parserEntrySeed: string | null,
): BindingCommandDefinition {
  const program = new ProgramRef('test:program', 'C:/projects/aurelia-ls2', null);
  const file = new SourceFileRef(`test:file:${name}`, program, `C:/virtual/${name}.ts`);
  const node = new SourceNodeRef(
    `test:node:${name}`,
    file,
    'ClassDeclaration',
    new SourceSpan(0, 1),
  );

  return new BindingCommandDefinition(
    `binding-command:${name}`,
    node,
    null,
    name,
    [],
    null,
    new BindingCommandBuildBasis(
      null,
      null,
      new BindingCommandInstructionEmission(),
      new BindingCommandValueHandling(valueHandlingKind, parserEntrySeed),
      [],
      'Test build basis.',
    ),
  );
}
