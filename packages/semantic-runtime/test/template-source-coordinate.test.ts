import { describe, expect, test } from 'vitest';

import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../src/kernel/address.js';
import type { AddressHandle } from '../src/kernel/handles.js';
import type { KernelStoreReadView } from '../src/kernel/store.js';
import { TemplateSourceOffsetMap } from '../src/resources/custom-element-definition.js';
import {
  mapDecodedTemplateSourceRange,
  sourceSpanSiteForDecodedTemplateRange,
} from '../src/template/template-source-coordinate.js';

describe('template source coordinates', () => {
  test('maps proven decoded ranges without confusing them with parser envelopes', () => {
    const sourceAddressHandle = 'address:template' as AddressHandle;
    const sourceFileAddressHandle = 'address:file' as AddressHandle;
    const sourceAddress = new SourceSpanAddress(
      sourceAddressHandle,
      sourceFileAddressHandle,
      100,
      110,
      SourceSpanRole.Value,
    );
    const store = {
      read: (handle: AddressHandle) => handle === sourceAddressHandle ? sourceAddress : null,
    } as unknown as KernelStoreReadView;

    expect(sourceSpanSiteForDecodedTemplateRange(store, {
      markup: 'abc',
      sourceAddressHandle,
      sourceMap: null,
    }, 1, 3)).toEqual({
      sourceFileAddressHandle,
      start: 101,
      end: 103,
    });

    expect(sourceSpanSiteForDecodedTemplateRange(store, {
      markup: 'abc',
      sourceAddressHandle,
      sourceMap: new TemplateSourceOffsetMap(3, [201, 202, 204, 205]),
    }, 1, 2)).toEqual({
      sourceFileAddressHandle,
      start: 202,
      end: 204,
    });

    expect(sourceSpanSiteForDecodedTemplateRange(store, {
      markup: null,
      sourceAddressHandle,
      sourceMap: null,
    }, 0, 0)).toEqual({
      sourceFileAddressHandle,
      start: 100,
      end: 100,
    });
  });

  test('fails closed for malformed maps and invalid decoded boundaries', () => {
    expect(mapDecodedTemplateSourceRange(
      new TemplateSourceOffsetMap(3, [10, 11, 12]),
      0,
      2,
    )).toBeNull();
    expect(mapDecodedTemplateSourceRange(
      new TemplateSourceOffsetMap(2, [10, 9, 11]),
      0,
      1,
    )).toBeNull();
    expect(mapDecodedTemplateSourceRange(
      new TemplateSourceOffsetMap(2, [10, 11, 12]),
      -1,
      1,
    )).toBeNull();
    expect(mapDecodedTemplateSourceRange(
      new TemplateSourceOffsetMap(2, [10, 11, 12]),
      1,
      3,
    )).toBeNull();
  });
});
