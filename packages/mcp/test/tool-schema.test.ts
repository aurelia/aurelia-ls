import { describe, expect, test } from 'vitest';
import { z } from 'zod/v4';

import {
  appQueryBatchInputSchema,
  appQueryInputSchema,
  templateCursorInfoInputSchema,
  templateDiagnosticsInputSchema,
} from '../src/tool-schemas.js';

describe('MCP application entrypoint policy inputs', () => {
  test('admits the explicit aggregate policy on every app-opening tool family', () => {
    const applicationEntrypointPolicy = 'aggregate-independent-graphs';
    expect(z.object(appQueryInputSchema).strict().parse({
      workspaceRoot: 'C:/workspace',
      queryKind: 'app-topology',
      applicationEntrypointPolicy,
    })).toMatchObject({ applicationEntrypointPolicy });
    expect(z.object(appQueryBatchInputSchema).strict().parse({
      workspaceRoot: 'C:/workspace',
      queries: [{ kind: 'app-topology' }],
      applicationEntrypointPolicy,
    })).toMatchObject({ applicationEntrypointPolicy });
    expect(z.object(templateCursorInfoInputSchema).strict().parse({
      workspaceRoot: 'C:/workspace',
      cursor: { filePath: 'src/app.html', line: 0, character: 0 },
      applicationEntrypointPolicy,
    })).toMatchObject({ applicationEntrypointPolicy });
    expect(z.object(templateDiagnosticsInputSchema).strict().parse({
      workspaceRoot: 'C:/workspace',
      applicationEntrypointPolicy,
    })).toMatchObject({ applicationEntrypointPolicy });
  });

  test('rejects an unknown entrypoint policy', () => {
    expect(() => z.object(appQueryInputSchema).strict().parse({
      workspaceRoot: 'C:/workspace',
      queryKind: 'app-topology',
      applicationEntrypointPolicy: 'merge-everything',
    })).toThrow();
  });
});
