import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "packages/language-server/test/integration/diagnostic-pull-lifecycle.test.ts",
      "packages/language-server/test/unit/request-guard.test.ts",
      "packages/vscode/test/support-report.test.ts",
    ],
    // The developer command already built this package. Load its ESM directly, as both servers do.
    server: { deps: { external: [/[/\\]packages[/\\]semantic-runtime[/\\]out[/\\]/u] } },
  },
});
