import fs from "node:fs";
import path from "node:path";
import {
  canonicalTypeSystemPath,
  parseSemanticWorkspaceDescriptor,
  type SemanticWorkspaceDescriptor,
} from "@aurelia-ls/semantic-runtime";

export const EXTENSION_HOST_OBSERVATION_ENVIRONMENT =
  "AURELIA_LS_EXTENSION_HOST_OBSERVATION" as const;
export const RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT =
  "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE" as const;
export const RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT =
  "AURELIA_LS_RESOURCE_DISCOVERY_HOST_DESCRIPTOR" as const;
export const MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES = 1_048_576;

type ExtensionHostTestTopologyEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Load the explicit semantic topology for the one gated Resource Discovery host-acceptance root.
 * Ordinary sessions do no descriptor I/O, and valid descriptors for other roots remain inert.
 */
export function loadExtensionHostTestSemanticWorkspaceDescriptor(
  sessionWorkspaceRoot: string | null,
  environment: ExtensionHostTestTopologyEnvironment = process.env,
): SemanticWorkspaceDescriptor | null {
  if (
    environment[EXTENSION_HOST_OBSERVATION_ENVIRONMENT] !== "1"
    || environment[RESOURCE_DISCOVERY_HOST_ACCEPTANCE_ENVIRONMENT] !== "1"
    || sessionWorkspaceRoot == null
  ) {
    return null;
  }

  const descriptorPath = environment[RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT];
  if (descriptorPath == null || descriptorPath.length === 0) {
    throw topologyError(
      `Missing ${RESOURCE_DISCOVERY_HOST_DESCRIPTOR_ENVIRONMENT} for the gated host-acceptance session.`,
    );
  }
  if (!path.isAbsolute(descriptorPath)) {
    throw topologyError("The gated host-acceptance descriptor path must be absolute.");
  }

  const normalizedDescriptorPath = path.normalize(descriptorPath);
  const descriptorText = readBoundedRegularFile(normalizedDescriptorPath);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(descriptorText) as unknown;
  } catch (error) {
    throw topologyError("The gated host-acceptance descriptor is not valid JSON.", error);
  }

  let descriptor: SemanticWorkspaceDescriptor;
  try {
    descriptor = parseSemanticWorkspaceDescriptor(parsedJson);
  } catch (error) {
    throw topologyError("The gated host-acceptance semantic workspace descriptor is invalid.", error);
  }
  if (descriptor.projectTopology.kind !== "explicit") {
    throw topologyError("The gated host-acceptance semantic workspace topology must be explicit.");
  }

  assertContainedHostPath(
    normalizedDescriptorPath,
    descriptor.workspaceRoot,
    "descriptor path",
  );
  const realWorkspaceRoot = realWorkspaceRootForDescriptor(
    normalizedDescriptorPath,
    descriptor.workspaceRoot,
  );

  const normalizedSessionRoot = path.normalize(path.resolve(sessionWorkspaceRoot));
  if (!sameHostPath(descriptor.workspaceRoot, normalizedSessionRoot)) {
    return null;
  }

  for (const excludedRoot of descriptor.excludedWorkspaceRoots) {
    assertDescriptorHostPathContained(
      excludedRoot,
      descriptor.workspaceRoot,
      realWorkspaceRoot,
      "excluded workspace root",
    );
  }
  for (const project of descriptor.projectTopology.projects) {
    assertDescriptorHostPathContained(
      project.rootDir,
      descriptor.workspaceRoot,
      realWorkspaceRoot,
      `project '${project.projectKey}' root`,
    );
    for (const excludedRoot of project.excludedSourceRoots) {
      assertDescriptorHostPathContained(
        excludedRoot,
        descriptor.workspaceRoot,
        realWorkspaceRoot,
        `project '${project.projectKey}' excluded source root`,
      );
    }
    if (project.sourceInput.kind === "supplied") {
      for (const source of project.sourceInput.files) {
        assertDescriptorHostPathContained(
          source.path,
          descriptor.workspaceRoot,
          realWorkspaceRoot,
          `project '${project.projectKey}' supplied source`,
        );
      }
    }
  }

  return descriptor;
}

function readBoundedRegularFile(filePath: string): string {
  let descriptorHandle: number;
  try {
    descriptorHandle = fs.openSync(filePath, "r");
  } catch (error) {
    throw topologyError("The gated host-acceptance descriptor could not be opened.", error);
  }
  try {
    const file = fs.fstatSync(descriptorHandle);
    if (!file.isFile()) {
      throw topologyError("The gated host-acceptance descriptor must be a regular file.");
    }
    if (file.size <= 0 || file.size > MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES) {
      throw topologyError(
        `The gated host-acceptance descriptor must contain 1 to ${MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES} bytes.`,
      );
    }
    const text = fs.readFileSync(descriptorHandle, "utf8");
    if (Buffer.byteLength(text, "utf8") > MAX_EXTENSION_HOST_TEST_TOPOLOGY_BYTES) {
      throw topologyError("The gated host-acceptance descriptor exceeded its read bound.");
    }
    return text;
  } finally {
    fs.closeSync(descriptorHandle);
  }
}

function realWorkspaceRootForDescriptor(descriptorPath: string, workspaceRoot: string): string {
  let realDescriptorPath: string;
  let realWorkspaceRoot: string;
  try {
    realDescriptorPath = fs.realpathSync.native(descriptorPath);
    realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
  } catch (error) {
    throw topologyError("The gated host-acceptance descriptor root could not be resolved.", error);
  }
  assertContainedHostPath(realDescriptorPath, realWorkspaceRoot, "real descriptor path");
  return realWorkspaceRoot;
}

function assertDescriptorHostPathContained(
  candidate: string,
  workspaceRoot: string,
  realWorkspaceRoot: string,
  label: string,
): void {
  assertContainedHostPath(candidate, workspaceRoot, label);
  if (!fs.existsSync(candidate)) return;
  let realCandidate: string;
  try {
    realCandidate = fs.realpathSync.native(candidate);
  } catch (error) {
    throw topologyError(`The gated host-acceptance ${label} could not be resolved.`, error);
  }
  assertContainedHostPath(realCandidate, realWorkspaceRoot, `real ${label}`);
}

function assertContainedHostPath(candidate: string, workspaceRoot: string, label: string): void {
  const relative = path.relative(path.resolve(workspaceRoot), path.resolve(candidate));
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw topologyError(`The gated host-acceptance ${label} must remain inside its semantic workspace.`);
  }
}

function sameHostPath(left: string, right: string): boolean {
  return canonicalTypeSystemPath(left) === canonicalTypeSystemPath(right);
}

function topologyError(message: string, cause?: unknown): Error {
  return new Error(
    `Resource Discovery host-acceptance topology rejected: ${message}`,
    cause === undefined ? undefined : { cause },
  );
}
