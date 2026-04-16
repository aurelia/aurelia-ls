import { describe, expect, it } from 'vitest';

import {
  createSourceAnalysisPackageStructuralDiagnostics,
  getSourceAnalysisStructuralFilesByFunctionRole,
} from '../src/index.js';

describe('Source-analysis structural diagnostics', () => {
  it('extracts reusable structural facts beyond coordination-only findings', () => {
    const diagnostics = createSourceAnalysisPackageStructuralDiagnostics(process.cwd(), [
      'packages/source-analysis/src/audit.ts',
      'packages/source-analysis/src/navigation.ts',
      'packages/source-analysis/src/route-witness.ts',
    ]);

    const policyFiles = getSourceAnalysisStructuralFilesByFunctionRole(diagnostics, 'policy-resolver')
      .map((file) => file.filePath);
    const documentFiles = getSourceAnalysisStructuralFilesByFunctionRole(diagnostics, 'answer-document-builder')
      .map((file) => file.filePath);

    expect(policyFiles).toContain('packages/source-analysis/src/audit.ts');
    expect(policyFiles).toContain('packages/source-analysis/src/navigation.ts');
    expect(policyFiles).toContain('packages/source-analysis/src/route-witness.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/audit.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/navigation.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/route-witness.ts');
  });
});
