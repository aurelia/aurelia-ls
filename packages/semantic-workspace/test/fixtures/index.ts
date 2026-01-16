import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "./registry.js";
import type { FixtureDescriptor, FixtureId, FixtureRootSpec, ScenarioId } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localFixturesRoot = __dirname.includes("out")
  ? resolvePath(__dirname, "..", "..", "..", "test", "fixtures")
  : __dirname;

let cachedRepoRoot: string | null = null;

function readPackageName(pkgPath: string): string | undefined {
  const pkgJsonPath = join(pkgPath, "package.json");
  if (!existsSync(pkgJsonPath)) return undefined;
  try {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as { name?: string };
    return pkg.name;
  } catch {
    return undefined;
  }
}

export function resolveRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot;
  const explicit = process.env.AURELIA_HARNESS_REPO_ROOT;
  if (explicit) {
    cachedRepoRoot = resolvePath(explicit);
    return cachedRepoRoot;
  }

  let current = resolvePath(process.cwd());
  while (true) {
    const pkgName = readPackageName(current);
    if (pkgName === "aurelia-ls") {
      cachedRepoRoot = current;
      return cachedRepoRoot;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  cachedRepoRoot = resolvePath(process.cwd());
  return cachedRepoRoot;
}

export function resolveFixtureRootSpec(spec: FixtureRootSpec): string {
  if (spec.kind === "local") {
    return resolvePath(localFixturesRoot, spec.path);
  }
  return resolvePath(resolveRepoRoot(), spec.path);
}

export function resolveFixtureRoot(fixture: FixtureDescriptor): string | null {
  const root = resolveFixtureRootSpec(fixture.root);
  if (existsSync(root)) return root;
  if (fixture.optional) return null;
  throw new Error(`Fixture root not found for ${fixture.id}: ${root}`);
}

export function getFixture(id: FixtureId): FixtureDescriptor {
  const fixture = fixtures.find((entry) => entry.id === id);
  if (!fixture) {
    throw new Error(`Unknown fixture id: ${id}`);
  }
  return fixture;
}

export function getFixtureOptional(id: FixtureId): FixtureDescriptor | undefined {
  return fixtures.find((entry) => entry.id === id);
}

export function fixturesForScenario(scenario: ScenarioId): FixtureDescriptor[] {
  return fixtures.filter((fixture) => fixture.scenarios.includes(scenario));
}

export { fixtures } from "./registry.js";
export type {
  ArtifactKind,
  DeclarationForm,
  FixtureCoverage,
  FixtureDescriptor,
  FixtureId,
  FixtureOrigin,
  FixtureRootSpec,
  FixtureSuite,
  ResourceKind,
  ScenarioId,
  ScopeKind,
  TemplateFeature,
  WorkspaceDiagnosticKind,
  WorkspaceQueryKind,
  WorkspaceRefactorKind,
} from "./types.js";
export { asFixtureId } from "./types.js";
