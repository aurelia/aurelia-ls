import type {
  SourceNodeRef,
  SymbolRef,
} from '../refs.js';
import {
  CompilerConsultedWorld,
  CompilerWorldOpenSeam,
} from './compiler-consulted-world.js';

export const COMPILER_CHILD_WORLD_REQUEST_MODE_KINDS = [
  'reuse-parent-world',
  'child-world',
  'child-world-inherit-parent-resources',
  'child-world-use-projection-owner-resources',
] as const;

export type CompilerChildWorldRequestModeKind =
  typeof COMPILER_CHILD_WORLD_REQUEST_MODE_KINDS[number];

export const COMPILER_CHILD_WORLD_FORMATION_OPEN_SEAM_KINDS = [
  'resource-map-topology-open',
  'dependency-registration-open',
] as const;

export type CompilerChildWorldFormationOpenSeamKind =
  typeof COMPILER_CHILD_WORLD_FORMATION_OPEN_SEAM_KINDS[number];

export class CompilerChildWorldFormationOpenSeam {
  constructor(
    readonly kind: CompilerChildWorldFormationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CompilerChildWorldFormation {
  constructor(
    readonly requestedMode: CompilerChildWorldRequestModeKind,
    readonly parentWorld: CompilerConsultedWorld,
    readonly resultWorld: CompilerConsultedWorld,
    readonly resourceSourceWorld: CompilerConsultedWorld | null = null,
    readonly owner: SymbolRef | SourceNodeRef | null = null,
    readonly openSeams: readonly CompilerChildWorldFormationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerChildWorldBuilder {
  create(
    parentWorld: CompilerConsultedWorld,
    options: {
      readonly suffix: string;
      readonly owner: SymbolRef | SourceNodeRef | null;
      readonly mode: CompilerChildWorldRequestModeKind;
      readonly resourceSourceWorld?: CompilerConsultedWorld | null;
      readonly note?: string | null;
      readonly includeDependencyOpenSeam?: boolean;
    },
  ): CompilerChildWorldFormation {
    if (options.mode === 'reuse-parent-world') {
      return new CompilerChildWorldFormation(
        options.mode,
        parentWorld,
        parentWorld,
        null,
        options.owner,
        [],
        options.note ?? 'Requested world formation reuses the parent consulted world.',
      );
    }

    const openSeams: CompilerChildWorldFormationOpenSeam[] = [
      new CompilerChildWorldFormationOpenSeam(
        'resource-map-topology-open',
        options.mode === 'child-world-inherit-parent-resources'
          ? 'Runtime child containers can distinguish local inherited resources from root fallback. The current clean-room still clones a flat visible-resource surface, so the branch intent is preserved explicitly here instead of being overclaimed as full resource-map topology.'
          : options.mode === 'child-world-use-projection-owner-resources'
            ? 'Projected content creates a child container from the current owning element but also reuses resources from the projection declaration site. The clean-room merges those visible resources flatly and records the dual-source intent here instead of claiming full container/resource topology parity.'
            : 'Runtime child containers can diverge in local-vs-root resource map content. The current clean-room keeps a flat visible-resource surface, so this child world preserves the branch boundary without yet modeling the full local/root split.',
      ),
    ];

    if (options.includeDependencyOpenSeam === true) {
      openSeams.push(new CompilerChildWorldFormationOpenSeam(
        'dependency-registration-open',
        'Definition.dependencies are known to register into some controller-owned child worlds at runtime, but their later registration-subject consequence is still provisional in the clean-room model.',
      ));
    }

    // TODO: once consulted worlds distinguish local resource maps from root
    // fallback explicitly, this builder should stop cloning the parent visible
    // surface blindly and instead materialize the requested local-map delta.
    const resourceSourceWorld = options.resourceSourceWorld ?? null;
    const childWorld = parentWorld.createChild({
      suffix: options.suffix,
      owner: options.owner,
      resources: resourceSourceWorld == null
        ? parentWorld.resources
        : mergeResources(parentWorld, resourceSourceWorld),
      resourceAdmissions: resourceSourceWorld == null
        ? parentWorld.resourceResolver.readAdmissions()
        : mergeAdmissions(parentWorld, resourceSourceWorld),
      openSeams: [
        new CompilerWorldOpenSeam(
          'resource-map-topology-open',
          `${parentWorld.world.id}/${options.suffix}`,
          openSeams[0]?.note ?? null,
        ),
      ],
    });

    return new CompilerChildWorldFormation(
      options.mode,
      parentWorld,
      childWorld,
      resourceSourceWorld,
      options.owner,
      openSeams,
      options.note ?? 'Requested world formation created a child consulted world.',
    );
  }
}

function mergeResources(
  parentWorld: CompilerConsultedWorld,
  resourceSourceWorld: CompilerConsultedWorld,
) {
  const seen = new Set<string>();
  const merged = [];
  for (const current of [...parentWorld.resources, ...resourceSourceWorld.resources]) {
    if (seen.has(current.id)) {
      continue;
    }
    seen.add(current.id);
    merged.push(current);
  }
  return merged;
}

function mergeAdmissions(
  parentWorld: CompilerConsultedWorld,
  resourceSourceWorld: CompilerConsultedWorld,
) {
  const seen = new Set<string>();
  const merged = [];
  for (const current of [
    ...parentWorld.resourceResolver.readAdmissions(),
    ...resourceSourceWorld.resourceResolver.readAdmissions(),
  ]) {
    if (seen.has(current.definition.id)) {
      continue;
    }
    seen.add(current.definition.id);
    merged.push(current);
  }
  return merged;
}
