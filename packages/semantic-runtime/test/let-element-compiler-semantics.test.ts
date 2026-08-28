import { describe, expect, test } from 'vitest';

import {
  decideTemplateCompilerLetAttribute,
  TemplateCompilerLetAttributeKind,
} from '../src/template/let-element-compiler-semantics.js';

describe('let element compiler semantics', () => {
  test('separates context flag, property, interpolation/literal, invalid command, and target normalization', () => {
    expect(decideTemplateCompilerLetAttribute('to-binding-context', '', 'to-binding-context', null)).toMatchObject({
      decisionKind: TemplateCompilerLetAttributeKind.ToBindingContext,
      target: null,
    });
    expect(decideTemplateCompilerLetAttribute('my-value.bind', 'source', 'my-value', 'bind')).toMatchObject({
      decisionKind: TemplateCompilerLetAttributeKind.PropertyBinding,
      target: 'myValue',
    });
    expect(decideTemplateCompilerLetAttribute('my_value-name', '${source}', 'my_value-name', null)).toMatchObject({
      decisionKind: TemplateCompilerLetAttributeKind.InterpolationOrLiteral,
      target: 'my_valueName',
    });
    expect(decideTemplateCompilerLetAttribute('value.trigger', 'source', 'value', 'trigger')).toMatchObject({
      decisionKind: TemplateCompilerLetAttributeKind.InvalidCommand,
      target: null,
      command: 'trigger',
    });
  });
});
