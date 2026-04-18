import { describe, expect, it } from './test-harness.js';

import {
  createPackageStructuralDiagnostics,
  getStructuralFilesByFunctionRole,
} from '../src/structural-diagnostics.js';

describe('Source-analysis structural diagnostics', () => {
  it('extracts reusable structural facts beyond coordination-only findings', () => {
    const diagnostics = createPackageStructuralDiagnostics(process.cwd(), [
      'packages/source-analysis/src/audit.ts',
      'packages/source-analysis/src/navigation.ts',
      'packages/source-analysis/src/route-witness.ts',
    ]);

    const policyFiles = getStructuralFilesByFunctionRole(diagnostics, 'policy-resolver')
      .map((file) => file.filePath);
    const documentFiles = getStructuralFilesByFunctionRole(diagnostics, 'answer-document-builder')
      .map((file) => file.filePath);

    expect(policyFiles).toContain('packages/source-analysis/src/audit.ts');
    expect(policyFiles).toContain('packages/source-analysis/src/navigation.ts');
    expect(policyFiles).toContain('packages/source-analysis/src/route-witness.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/audit.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/navigation.ts');
    expect(documentFiles).toContain('packages/source-analysis/src/route-witness.ts');
  });
});
