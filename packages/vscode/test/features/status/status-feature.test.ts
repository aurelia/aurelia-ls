import { describe, expect, test } from "vitest";
import { StatusFeature } from "../../../out/features/status/status-feature.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

describe("StatusFeature", () => {
  test("owns transient status through workspace analysis notifications", () => {
    const { vscode, recorded } = createVscodeApi();
    let changed!: (payload: { domains: readonly string[] }) => void;
    let ready!: () => void;
    const activation = StatusFeature.activate({
      vscode,
      lsp: {
        onWorkspaceChanged(listener: typeof changed) {
          changed = listener;
          return { dispose() {} };
        },
        onAnalysisReady(listener: typeof ready) {
          ready = listener;
          return { dispose() {} };
        },
      },
    } as never) as { dispose(): void };

    const item = recorded.statusItems[0]!;
    expect(item.visible).toBe(false);
    changed({ domains: ["templates"] });
    expect(item.visible).toBe(true);
    ready();
    expect(item.visible).toBe(false);
    activation.dispose();
    expect(item.disposed).toBe(true);
  });
});
