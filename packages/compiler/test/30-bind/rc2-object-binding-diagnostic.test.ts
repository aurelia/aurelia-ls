import { describe, expect, it } from 'vitest';
import { lowerDocument } from '../../out/analysis/10-lower/lower.js';
import { linkTemplateSemantics } from '../../out/analysis/20-link/resolve.js';
import { bindScopes } from '../../out/analysis/30-bind/bind.js';
import { buildSemanticsSnapshot } from '../../out/schema/snapshot.js';
import { createCompilerContext, lowerOpts } from '../_helpers/vector-runner.js';
import { noopModuleResolver } from '../_helpers/test-utils.js';

describe('RC2 object binding diagnostics', () => {
  it.each([
    ['{ id: value, name: value } of items', 'AUR0177'],
    ['{ id, ...rest } of items', 'AUR0164'],
    ['{ id name } of items', 'AUR0167'],
  ])('carries %s parser authority into the bind diagnostic', (header, frameworkErrorCode) => {
    const markup = `<div repeat.for="${header}"></div>`;
    const ctx = createCompilerContext({ name: header, markup });
    const ir = lowerDocument(markup, lowerOpts(ctx));
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(ctx.sem), {
      moduleResolver: noopModuleResolver,
      templateFilePath: 'mem.html',
      diagnostics: ctx.diagnostics.forSource('link'),
    });
    bindScopes(linked, { diagnostics: ctx.diagnostics.forSource('bind') });

    const diagnostic = ctx.diagnostics.all.find((candidate) =>
      candidate.stage === 'bind' && candidate.code === 'aurelia/invalid-binding-pattern'
    );
    expect(diagnostic?.data).toMatchObject({ aurCode: frameworkErrorCode });
  });
});
