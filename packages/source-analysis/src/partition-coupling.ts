import type { DepsOutput, OutputEdge } from './deps/schema.js';
import type { AnalysisProfile, PartitionScheme } from './analysis-profile.js';
import { resolveAnalysisProfile } from './analysis-profile.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

export interface PartitionRef {
  readonly schemeId: string;
  readonly partitionId: string;
  readonly label: string;
  readonly captures: Readonly<Record<string, string>>;
}

export interface CrossPartitionTypeRefSummary {
  readonly from: PartitionRef;
  readonly to: PartitionRef;
  readonly refCount: number;
  readonly typeNames: readonly string[];
}

export interface PartitionBindingSeamSummary {
  readonly from: PartitionRef;
  readonly to: PartitionRef;
  readonly edgeCount: number;
  readonly typeOnlyCount: number;
  readonly bindings: readonly string[];
}

export interface PartitionCouplingPressure<TSeam> {
  readonly partition: PartitionRef;
  readonly outgoingCount: number;
  readonly incomingCount: number;
  readonly outgoingCounterparts: readonly PartitionRef[];
  readonly incomingCounterparts: readonly PartitionRef[];
  readonly topOutgoingSeams: readonly TSeam[];
  readonly topIncomingSeams: readonly TSeam[];
}

export interface PartitionCycleGroup<TSeam extends { from: PartitionRef; to: PartitionRef }> {
  readonly partitions: readonly PartitionRef[];
  readonly edgeCount: number;
  readonly edges: readonly TSeam[];
}

type DependencyEdgeCarrier = {
  readonly root: string;
  readonly edges: readonly OutputEdge[];
};

export function collectCrossPartitionTypeRefSummaries(
  typeRefs: TypeRefsOutput,
  schemeId: string,
  scopePrefix?: string,
  profile = resolveAnalysisProfile({ repoPath: typeRefs.root }),
): readonly CrossPartitionTypeRefSummary[] {
  const groups = new Map<string, {
    from: PartitionRef;
    to: PartitionRef;
    refCount: number;
    typeNames: Set<string>;
  }>();

  for (const declaration of typeRefs.declarations) {
    const fromPartition = resolvePartitionRef(profile, schemeId, declaration.file);
    if (!fromPartition || !inScope(fromPartition.partitionId, scopePrefix)) continue;

    for (const ref of declaration.refs) {
      const toPartition = resolvePartitionRef(profile, schemeId, ref.target_file);
      if (!toPartition || !inScope(toPartition.partitionId, scopePrefix)) continue;
      if (toPartition.partitionId === fromPartition.partitionId) continue;

      const key = `${fromPartition.partitionId}\0${toPartition.partitionId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          from: fromPartition,
          to: toPartition,
          refCount: 0,
          typeNames: new Set<string>(),
        });
      }

      const group = groups.get(key)!;
      group.refCount += 1;
      group.typeNames.add(ref.target);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      from: group.from,
      to: group.to,
      refCount: group.refCount,
      typeNames: [...group.typeNames].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) =>
      right.refCount - left.refCount
      || right.typeNames.length - left.typeNames.length
      || left.from.partitionId.localeCompare(right.from.partitionId)
      || left.to.partitionId.localeCompare(right.to.partitionId),
    );
}

export function collectPartitionBindingSeams(
  deps: DependencyEdgeCarrier,
  schemeId: string,
  scopePrefix?: string,
  profile = resolveAnalysisProfile({ repoPath: deps.root }),
): readonly PartitionBindingSeamSummary[] {
  const groups = new Map<string, {
    from: PartitionRef;
    to: PartitionRef;
    edgeCount: number;
    typeOnlyCount: number;
    bindings: Set<string>;
  }>();

  for (const edge of deps.edges) {
    const fromPartition = resolvePartitionRef(profile, schemeId, edge.source);
    const toPartition = resolvePartitionRef(profile, schemeId, edge.target);
    if (!fromPartition || !toPartition) continue;
    if (!inScope(fromPartition.partitionId, scopePrefix) || !inScope(toPartition.partitionId, scopePrefix)) continue;
    if (fromPartition.partitionId === toPartition.partitionId) continue;

    const key = `${fromPartition.partitionId}\0${toPartition.partitionId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        from: fromPartition,
        to: toPartition,
        edgeCount: 0,
        typeOnlyCount: 0,
        bindings: new Set<string>(),
      });
    }

    const group = groups.get(key)!;
    group.edgeCount += 1;
    if (edge.type_only) {
      group.typeOnlyCount += 1;
    }
    for (const binding of edge.bindings) {
      group.bindings.add(binding);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      from: group.from,
      to: group.to,
      edgeCount: group.edgeCount,
      typeOnlyCount: group.typeOnlyCount,
      bindings: [...group.bindings].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) =>
      right.edgeCount - left.edgeCount
      || right.bindings.length - left.bindings.length
      || left.from.partitionId.localeCompare(right.from.partitionId)
      || left.to.partitionId.localeCompare(right.to.partitionId),
    );
}

export function collectPartitionTypeRefPressure(
  typeRefs: TypeRefsOutput,
  schemeId: string,
  scopePrefix?: string,
  profile = resolveAnalysisProfile({ repoPath: typeRefs.root }),
): readonly PartitionCouplingPressure<CrossPartitionTypeRefSummary>[] {
  return collectPartitionPressure(
    collectCrossPartitionTypeRefSummaries(typeRefs, schemeId, scopePrefix, profile),
    (seam) => seam.refCount,
  );
}

export function collectPartitionBindingPressure(
  deps: DependencyEdgeCarrier,
  schemeId: string,
  scopePrefix?: string,
  profile = resolveAnalysisProfile({ repoPath: deps.root }),
): readonly PartitionCouplingPressure<PartitionBindingSeamSummary>[] {
  return collectPartitionPressure(
    collectPartitionBindingSeams(deps, schemeId, scopePrefix, profile),
    (seam) => seam.edgeCount,
  );
}

export function collectPartitionBindingCycles(
  deps: DependencyEdgeCarrier,
  schemeId: string,
  scopePrefix?: string,
  profile = resolveAnalysisProfile({ repoPath: deps.root }),
): readonly PartitionCycleGroup<PartitionBindingSeamSummary>[] {
  return collectPartitionCycles(
    collectPartitionBindingSeams(deps, schemeId, scopePrefix, profile),
    (seam) => seam.edgeCount,
  );
}

export function resolvePartitionRef(
  profile: AnalysisProfile,
  schemeId: string,
  filePath: string,
): PartitionRef | null {
  const scheme = profile.partitionSchemes.find((candidate) => candidate.id === schemeId);
  if (!scheme) {
    return null;
  }

  for (const rule of scheme.rules) {
    const captures = matchPattern(rule.pattern, filePath);
    if (!captures) {
      continue;
    }

    return {
      schemeId: scheme.id,
      partitionId: applyTemplate(rule.partitionTemplate, captures),
      label: applyTemplate(rule.labelTemplate ?? rule.partitionTemplate, captures),
      captures,
    };
  }

  return null;
}

function collectPartitionPressure<TSeam extends { from: PartitionRef; to: PartitionRef }>(
  seams: readonly TSeam[],
  countOf: (seam: TSeam) => number,
): readonly PartitionCouplingPressure<TSeam>[] {
  const partitionIds = [...new Set(seams.flatMap((seam) => [seam.from.partitionId, seam.to.partitionId]))];
  const pressures: PartitionCouplingPressure<TSeam>[] = [];

  for (const partitionId of partitionIds) {
    const outgoing = seams.filter((seam) => seam.from.partitionId === partitionId);
    const incoming = seams.filter((seam) => seam.to.partitionId === partitionId);
    const partition = outgoing[0]?.from ?? incoming[0]?.to;
    if (!partition) {
      continue;
    }

    pressures.push({
      partition,
      outgoingCount: outgoing.reduce((sum, seam) => sum + countOf(seam), 0),
      incomingCount: incoming.reduce((sum, seam) => sum + countOf(seam), 0),
      outgoingCounterparts: collectCounterparts(outgoing, 'to', countOf),
      incomingCounterparts: collectCounterparts(incoming, 'from', countOf),
      topOutgoingSeams: [...outgoing].sort((left, right) =>
        countOf(right) - countOf(left)
        || left.to.partitionId.localeCompare(right.to.partitionId),
      ),
      topIncomingSeams: [...incoming].sort((left, right) =>
        countOf(right) - countOf(left)
        || left.from.partitionId.localeCompare(right.from.partitionId),
      ),
    });
  }

  return pressures.sort((left, right) =>
    right.outgoingCount + right.incomingCount - (left.outgoingCount + left.incomingCount)
    || left.partition.partitionId.localeCompare(right.partition.partitionId),
  );
}

function collectPartitionCycles<TSeam extends { from: PartitionRef; to: PartitionRef }>(
  seams: readonly TSeam[],
  countOf: (seam: TSeam) => number,
): readonly PartitionCycleGroup<TSeam>[] {
  const nodes = new Map<string, PartitionRef>();
  const adjacency = new Map<string, Map<string, TSeam[]>>();

  for (const seam of seams) {
    nodes.set(seam.from.partitionId, seam.from);
    nodes.set(seam.to.partitionId, seam.to);

    const targets = adjacency.get(seam.from.partitionId) ?? new Map<string, TSeam[]>();
    const targetSeams = targets.get(seam.to.partitionId) ?? [];
    targetSeams.push(seam);
    targets.set(seam.to.partitionId, targetSeams);
    adjacency.set(seam.from.partitionId, targets);
  }

  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const components: string[][] = [];

  function strongConnect(nodeId: string): void {
    indices.set(nodeId, index);
    lowlinks.set(nodeId, index);
    index += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    const successors = adjacency.get(nodeId);
    if (successors) {
      for (const successorId of successors.keys()) {
        if (!indices.has(successorId)) {
          strongConnect(successorId);
          lowlinks.set(nodeId, Math.min(lowlinks.get(nodeId)!, lowlinks.get(successorId)!));
        } else if (onStack.has(successorId)) {
          lowlinks.set(nodeId, Math.min(lowlinks.get(nodeId)!, indices.get(successorId)!));
        }
      }
    }

    if (lowlinks.get(nodeId) === indices.get(nodeId)) {
      const component: string[] = [];
      let currentId: string;
      do {
        currentId = stack.pop()!;
        onStack.delete(currentId);
        component.push(currentId);
      } while (currentId !== nodeId);

      if (component.length > 1) {
        components.push(component);
      }
    }
  }

  for (const nodeId of nodes.keys()) {
    if (!indices.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  return components
    .map((component) => {
      const componentIds = new Set(component);
      const cycleEdges: TSeam[] = [];
      let edgeCount = 0;

      for (const sourceId of component) {
        const targets = adjacency.get(sourceId);
        if (!targets) continue;

        for (const [targetId, targetSeams] of targets) {
          if (!componentIds.has(targetId)) continue;
          cycleEdges.push(...targetSeams);
          edgeCount += targetSeams.reduce((sum, seam) => sum + countOf(seam), 0);
        }
      }

      return {
        partitions: component
          .map((partitionId) => nodes.get(partitionId)!)
          .sort((left, right) => left.partitionId.localeCompare(right.partitionId)),
        edgeCount,
        edges: cycleEdges.sort((left, right) =>
          countOf(right) - countOf(left)
          || left.from.partitionId.localeCompare(right.from.partitionId)
          || left.to.partitionId.localeCompare(right.to.partitionId),
        ),
      };
    })
    .sort((left, right) =>
      right.edgeCount - left.edgeCount
      || right.partitions.length - left.partitions.length
      || left.partitions[0]!.partitionId.localeCompare(right.partitions[0]!.partitionId),
    );
}

function collectCounterparts<TSeam extends { from: PartitionRef; to: PartitionRef }>(
  seams: readonly TSeam[],
  side: 'from' | 'to',
  countOf: (seam: TSeam) => number,
): readonly PartitionRef[] {
  const grouped = new Map<string, { ref: PartitionRef; weight: number }>();
  for (const seam of seams) {
    const ref = seam[side];
    const existing = grouped.get(ref.partitionId);
    if (existing) {
      existing.weight += countOf(seam);
    } else {
      grouped.set(ref.partitionId, {
        ref,
        weight: countOf(seam),
      });
    }
  }

  return [...grouped.values()]
    .sort((left, right) =>
      right.weight - left.weight
      || left.ref.partitionId.localeCompare(right.ref.partitionId),
    )
    .map((entry) => entry.ref);
}

function matchPattern(
  pattern: string,
  filePath: string,
): Readonly<Record<string, string>> | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const fileSegments = filePath.split('/').filter(Boolean);
  const captures: Record<string, string> = {};
  let fileIndex = 0;

  for (let patternIndex = 0; patternIndex < patternSegments.length; patternIndex += 1) {
    const patternSegment = patternSegments[patternIndex]!;
    if (patternSegment === '**') {
      return captures;
    }
    const fileSegment = fileSegments[fileIndex];
    if (!fileSegment) {
      return null;
    }
    const captureMatch = /^\{([^}]+)\}$/.exec(patternSegment);
    if (captureMatch) {
      captures[captureMatch[1]!] = fileSegment;
      fileIndex += 1;
      continue;
    }
    if (patternSegment !== fileSegment) {
      return null;
    }
    fileIndex += 1;
  }

  return fileIndex === fileSegments.length ? captures : null;
}

function applyTemplate(
  template: string,
  captures: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => captures[key] ?? `{${key}}`);
}

function inScope(
  partitionId: string,
  scopePrefix?: string,
): boolean {
  return !scopePrefix || partitionId.startsWith(scopePrefix);
}
