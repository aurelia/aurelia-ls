import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { CompiledNativeSlotNameKind } from '../src/template/compiled-template.js';
import {
  decideTemplateCompilerNativeSlotName,
  TemplateCompilerNativeSlotNameInput,
} from '../src/template/native-slot-compiler-semantics.js';

describe('native slot compiler semantics', () => {
  test('distinguishes default, retained static, valueless static, and proved runtime-controlled names', () => {
    const handles = new KernelHandleFactory('native-slot-name-semantics');
    const source = handles.address('name-value');

    expect(decideTemplateCompilerNativeSlotName(
      new TemplateCompilerNativeSlotNameInput(false, null, false, null),
    )).toEqual(expect.objectContaining({
      nameKind: CompiledNativeSlotNameKind.Default,
      name: '',
      sourceAddressHandle: null,
    }));
    expect(decideTemplateCompilerNativeSlotName(
      new TemplateCompilerNativeSlotNameInput(true, 'named', false, source),
    )).toEqual(expect.objectContaining({
      nameKind: CompiledNativeSlotNameKind.Static,
      name: 'named',
      sourceAddressHandle: source,
    }));
    expect(decideTemplateCompilerNativeSlotName(
      new TemplateCompilerNativeSlotNameInput(true, '', false, null),
    )).toEqual(expect.objectContaining({
      nameKind: CompiledNativeSlotNameKind.Static,
      name: '',
      sourceAddressHandle: null,
    }));
    expect(decideTemplateCompilerNativeSlotName(
      new TemplateCompilerNativeSlotNameInput(false, null, true, source),
    )).toEqual(expect.objectContaining({
      nameKind: CompiledNativeSlotNameKind.Dynamic,
      name: null,
      sourceAddressHandle: source,
    }));
  });
});
