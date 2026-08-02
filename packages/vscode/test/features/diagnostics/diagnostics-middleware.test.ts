import { describe, expect, test, vi } from "vitest";
import { createMiddleware } from "../../../out/client-middleware.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

function diagnostic() {
  return {
    source: "aurelia",
    message: "Property title does not exist",
    data: {
      __aurelia: {
        diagnostics: {
          schema: "diagnostics-taxonomy/1",
          impact: "blocking",
          actionability: "guided",
        },
      },
    },
  };
}

describe("diagnostics middleware configuration", () => {
  test("applies taxonomy details only for the resource scope that enables them", () => {
    const { vscode: stubVscode } = createVscodeApi({
      workspaceConfiguration: {
        "file:///enabled": { "aurelia.diagnostics.includeTaxonomyDetails": true },
        "file:///quiet": { "aurelia.diagnostics.includeTaxonomyDetails": false },
      },
    });
    const middleware = createMiddleware(
      stubVscode as unknown as VscodeApi,
      { warn: vi.fn() } as never,
      { client: undefined },
    );
    const enabled = diagnostic();
    const quiet = diagnostic();
    const next = vi.fn();

    middleware.handleDiagnostics?.(stubVscode.Uri.parse("file:///enabled/app.html") as never, [enabled] as never, next);
    middleware.handleDiagnostics?.(stubVscode.Uri.parse("file:///quiet/app.html") as never, [quiet] as never, next);

    expect(enabled.message).toContain("Aurelia diagnostics: impact=blocking | actionability=guided");
    expect(quiet.message).toBe("Property title does not exist");
    expect(next).toHaveBeenCalledTimes(2);
  });
});
