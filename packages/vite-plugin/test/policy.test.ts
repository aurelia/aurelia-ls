import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { tmpdir } from "node:os";

import { createResolutionContext } from "../src/resolution.js";

type Workspace = {
  root: string;
  appRoot: string;
  tsconfigPath: string;
};

describe("policy diagnostics (vite plugin)", () => {
  it("logs policy diagnostics when enabled", async () => {
    const workspace = createWorkspace("policy-on");
    const messages = createLogger();
    try {
      const ctx = await createResolutionContext(workspace.tsconfigPath, messages.logger, {
        packagePath: workspace.appRoot,
        policy: {
          gaps: "error",
          confidence: { min: "high", severity: "warning" },
        },
      });

      expect(ctx).not.toBeNull();
      const output = [...messages.info, ...messages.warn, ...messages.error].join("\n");
      expect(output.includes("Policy:")).toBe(true);
    } finally {
      cleanupWorkspace(workspace.root);
    }
  });

  it("does not emit policy diagnostics when disabled", async () => {
    const workspace = createWorkspace("policy-off");
    const messages = createLogger();
    try {
      const ctx = await createResolutionContext(workspace.tsconfigPath, messages.logger, {
        packagePath: workspace.appRoot,
      });

      expect(ctx).not.toBeNull();
      const output = [...messages.info, ...messages.warn, ...messages.error].join("\n");
      expect(output.includes("Policy:")).toBe(false);
    } finally {
      cleanupWorkspace(workspace.root);
    }
  });
});

function createLogger() {
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];
  return {
    info,
    warn,
    error,
    logger: {
      info: (message: string) => info.push(message),
      warn: (message: string) => warn.push(message),
      error: (message: string) => error.push(message),
    },
  };
}

function createWorkspace(label: string): Workspace {
  const root = mkdtempSync(join(tmpdir(), `aurelia-policy-${label}-`));
  const appRoot = join(root, "app");

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "package.json"),
    JSON.stringify({ name: "vite-policy-test", version: "0.0.0" }, null, 2),
    "utf-8",
  );

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          experimentalDecorators: true,
          noEmit: true,
          strict: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
    "utf-8",
  );

  writeFileSync(join(appRoot, "src", "main.ts"), buildConditionalRegistration(), "utf-8");

  return {
    root,
    appRoot,
    tsconfigPath: resolvePath(appRoot, "tsconfig.json"),
  };
}

function buildConditionalRegistration(): string {
  return [
    "function customElement(name: string) {",
    "  return function(_target: unknown) {};",
    "}",
    "",
    "const Aurelia = { register: (..._args: unknown[]) => {} };",
    "",
    "@customElement(\"guarded-el\")",
    "export class GuardedElement {}",
    "",
    "if (__SSR__) {",
    "  Aurelia.register(GuardedElement);",
    "}",
    "",
  ].join("\n");
}

function cleanupWorkspace(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
