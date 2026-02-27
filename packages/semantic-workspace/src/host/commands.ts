// Command Vocabulary — L2 Semantic Authority Host
//
// The command dispatcher for the AI-facing host surface.
// Each command receives a typed input, executes against the workspace,
// and returns a ResponseEnvelope.
//
// Command families:
//   session.* — session lifecycle
//   query.*   — semantic queries (hover, completions, diagnostics, navigation)
//   pressure.* — empirical pressure testing
//   verify.*  — determinism and parity verification
//   replay.*  — replay log export and execution
//
// L2 reference: models/attractor/l2/semantic-authority-api.md

import type { ResponseEnvelope, PolicyProfile } from "./envelope.js";

// ============================================================================
// Command Input Types
// ============================================================================

export interface SessionOpenInput {
  readonly workspaceRoot: string;
  readonly tsconfigPath?: string;
}

export interface QueryInput {
  readonly uri: string;
  readonly position?: { line: number; character: number };
}

export interface PressureScenarioInput {
  readonly target: string;
  readonly surfaces?: readonly string[];
  readonly bounded?: boolean;
}

// ============================================================================
// Command Registry
// ============================================================================

export type CommandName =
  | 'session.open'
  | 'session.refresh'
  | 'session.close'
  | 'session.status'
  | 'query.snapshot'
  | 'query.completions'
  | 'query.hover'
  | 'query.diagnostics'
  | 'query.navigation'
  | 'pressure.runScenario';

export interface CommandDescriptor<TInput = unknown, TResult = unknown> {
  readonly name: CommandName;
  readonly description: string;
  readonly execute: (input: TInput, context: CommandContext) => Promise<ResponseEnvelope<TResult>>;
}

export interface CommandContext {
  readonly profile: PolicyProfile;
  readonly workspaceFingerprint: string;
}

// ============================================================================
// Command Registry Builder
// ============================================================================

export class CommandRegistry {
  readonly #commands = new Map<CommandName, CommandDescriptor>();

  register<TInput, TResult>(descriptor: CommandDescriptor<TInput, TResult>): void {
    this.#commands.set(descriptor.name, descriptor as CommandDescriptor);
  }

  get(name: CommandName): CommandDescriptor | undefined {
    return this.#commands.get(name);
  }

  has(name: CommandName): boolean {
    return this.#commands.has(name);
  }

  names(): CommandName[] {
    return Array.from(this.#commands.keys());
  }
}

/**
 * Create the default command registry with all V1 commands registered.
 *
 * Commands are stubs that will be wired to workspace methods.
 * The registry pattern enables extension (ai.product commands,
 * pressure commands, verification commands) without modifying core.
 */
export function createDefaultCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  // Session commands — stubs for now
  registry.register({
    name: 'session.open',
    description: 'Open a workspace session',
    execute: async (_input, _ctx) => ({ schemaVersion: 'v1alpha1' as const, command: 'session.open', status: 'ok' as const, result: {}, policy: { profile: _ctx.profile }, epistemic: { confidence: 'high' as const, gaps: [], provenanceRefs: [] }, meta: { workspaceFingerprint: _ctx.workspaceFingerprint, isIncomplete: false, durationMs: 0 }, errors: [] }),
  });

  registry.register({
    name: 'session.refresh',
    description: 'Refresh the workspace (re-analyze changed files)',
    execute: async (_input, _ctx) => ({ schemaVersion: 'v1alpha1' as const, command: 'session.refresh', status: 'ok' as const, result: {}, policy: { profile: _ctx.profile }, epistemic: { confidence: 'high' as const, gaps: [], provenanceRefs: [] }, meta: { workspaceFingerprint: _ctx.workspaceFingerprint, isIncomplete: false, durationMs: 0 }, errors: [] }),
  });

  registry.register({
    name: 'session.status',
    description: 'Get workspace status (model fingerprint, template count, etc.)',
    execute: async (_input, _ctx) => ({ schemaVersion: 'v1alpha1' as const, command: 'session.status', status: 'ok' as const, result: {}, policy: { profile: _ctx.profile }, epistemic: { confidence: 'high' as const, gaps: [], provenanceRefs: [] }, meta: { workspaceFingerprint: _ctx.workspaceFingerprint, isIncomplete: false, durationMs: 0 }, errors: [] }),
  });

  return registry;
}
