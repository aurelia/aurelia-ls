import type { DepsOutput } from './deps/schema.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

export interface CrossSubsystemTypeRefSummary {
  from: string;
  to: string;
  refCount: number;
  typeNames: string[];
}

export interface BindingSeamSummary {
  from: string;
  to: string;
  edgeCount: number;
  typeOnlyCount: number;
  bindings: string[];
}

export interface SubsystemCouplingPressure<TSeam> {
  subsystem: string;
  outgoingCount: number;
  incomingCount: number;
  outgoingCounterparts: string[];
  incomingCounterparts: string[];
  topOutgoingSeams: TSeam[];
  topIncomingSeams: TSeam[];
}

function getSubsystem(file: string): string | null {
  const parts = file.split('/');
  if (parts[0] === 'packages' && parts[2] === 'src' && parts.length >= 5) {
    return `${parts[0]}/${parts[1]}/src/${parts[3]}`;
  }

  return null;
}

function inScope(path: string, scopePrefix?: string): boolean {
  return !scopePrefix || path.startsWith(scopePrefix);
}

function collectSubsystemPressure<TSeam extends { from: string; to: string }>(
  seams: TSeam[],
  countOf: (seam: TSeam) => number,
): SubsystemCouplingPressure<TSeam>[] {
  const subsystemIds = [...new Set(seams.flatMap((seam) => [seam.from, seam.to]))];
  const pressures = subsystemIds.map((subsystem) => {
    const outgoing = seams.filter((seam) => seam.from === subsystem);
    const incoming = seams.filter((seam) => seam.to === subsystem);

    const outgoingCounterparts = [...new Map(
      outgoing.map((seam) => [seam.to, 0]),
    ).keys()]
      .sort((left, right) =>
        outgoing
          .filter((seam) => seam.to === right)
          .reduce((sum, seam) => sum + countOf(seam), 0)
        - outgoing
          .filter((seam) => seam.to === left)
          .reduce((sum, seam) => sum + countOf(seam), 0)
        || left.localeCompare(right),
      );
    const incomingCounterparts = [...new Map(
      incoming.map((seam) => [seam.from, 0]),
    ).keys()]
      .sort((left, right) =>
        incoming
          .filter((seam) => seam.from === right)
          .reduce((sum, seam) => sum + countOf(seam), 0)
        - incoming
          .filter((seam) => seam.from === left)
          .reduce((sum, seam) => sum + countOf(seam), 0)
        || left.localeCompare(right),
      );

    return {
      subsystem,
      outgoingCount: outgoing.reduce((sum, seam) => sum + countOf(seam), 0),
      incomingCount: incoming.reduce((sum, seam) => sum + countOf(seam), 0),
      outgoingCounterparts,
      incomingCounterparts,
      topOutgoingSeams: [...outgoing].sort((left, right) =>
        countOf(right) - countOf(left)
        || left.to.localeCompare(right.to),
      ),
      topIncomingSeams: [...incoming].sort((left, right) =>
        countOf(right) - countOf(left)
        || left.from.localeCompare(right.from),
      ),
    } satisfies SubsystemCouplingPressure<TSeam>;
  });

  return pressures.sort((left, right) =>
    right.outgoingCount + right.incomingCount - (left.outgoingCount + left.incomingCount)
    || left.subsystem.localeCompare(right.subsystem),
  );
}

export function collectCrossSubsystemTypeRefSummaries(
  typeRefs: TypeRefsOutput,
  scopePrefix?: string,
): CrossSubsystemTypeRefSummary[] {
  const groups = new Map<string, { from: string; to: string; refCount: number; typeNames: Set<string> }>();

  for (const declaration of typeRefs.declarations) {
    const fromSubsystem = getSubsystem(declaration.file);
    if (!fromSubsystem || !inScope(fromSubsystem, scopePrefix)) continue;

    for (const ref of declaration.refs) {
      const toSubsystem = getSubsystem(ref.target_file);
      if (!toSubsystem || !inScope(toSubsystem, scopePrefix) || toSubsystem === fromSubsystem) continue;

      const key = `${fromSubsystem}\0${toSubsystem}`;
      if (!groups.has(key)) {
        groups.set(key, {
          from: fromSubsystem,
          to: toSubsystem,
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
      || left.from.localeCompare(right.from)
      || left.to.localeCompare(right.to),
    );
}

export function collectBindingSeams(
  deps: DepsOutput,
  scopePrefix?: string,
): BindingSeamSummary[] {
  const groups = new Map<string, { from: string; to: string; edgeCount: number; typeOnlyCount: number; bindings: Set<string> }>();

  for (const edge of deps.edges) {
    const fromSubsystem = getSubsystem(edge.source);
    const toSubsystem = getSubsystem(edge.target);
    if (!fromSubsystem || !toSubsystem || fromSubsystem === toSubsystem) continue;
    if (!inScope(fromSubsystem, scopePrefix) || !inScope(toSubsystem, scopePrefix)) continue;

    const key = `${fromSubsystem}\0${toSubsystem}`;
    if (!groups.has(key)) {
      groups.set(key, {
        from: fromSubsystem,
        to: toSubsystem,
        edgeCount: 0,
        typeOnlyCount: 0,
        bindings: new Set<string>(),
      });
    }

    const group = groups.get(key)!;
    group.edgeCount += 1;
    if (edge.type_only) group.typeOnlyCount += 1;
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
      || left.from.localeCompare(right.from)
      || left.to.localeCompare(right.to),
    );
}

export function collectSubsystemTypeRefPressure(
  typeRefs: TypeRefsOutput,
  scopePrefix?: string,
): SubsystemCouplingPressure<CrossSubsystemTypeRefSummary>[] {
  return collectSubsystemPressure(
    collectCrossSubsystemTypeRefSummaries(typeRefs, scopePrefix),
    (seam) => seam.refCount,
  );
}

export function collectSubsystemBindingPressure(
  deps: DepsOutput,
  scopePrefix?: string,
): SubsystemCouplingPressure<BindingSeamSummary>[] {
  return collectSubsystemPressure(
    collectBindingSeams(deps, scopePrefix),
    (seam) => seam.edgeCount,
  );
}
