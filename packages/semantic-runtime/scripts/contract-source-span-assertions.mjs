export function exactObservedDependencySourceSpanFailures(rows, specs) {
  const failures = [];
  for (const spec of specs) {
    const row = rows.find((candidate) => matchesObservedDependencySourceSpanSpec(candidate, spec));
    if (row == null) {
      failures.push(`${spec.summary} No matching row was published.`);
      continue;
    }
    const occurrence = row.occurrence;
    if (occurrence.source?.kind !== 'source-span-address') {
      failures.push(`${spec.summary} Source kind was ${occurrence.source?.kind ?? 'null'}.`);
      continue;
    }
    if (occurrence.source.path !== spec.path) {
      failures.push(`${spec.summary} Source path was ${occurrence.source.path ?? 'null'}.`);
    }
    const expectedSource = spec.sourceSpan ?? {
      start: occurrence.spanStart,
      end: occurrence.spanEnd,
    };
    if (
      occurrence.source.start !== expectedSource.start
      || occurrence.source.end !== expectedSource.end
    ) {
      failures.push(
        `${spec.summary} Source span was ${occurrence.source.start}..${occurrence.source.end}; expected ${expectedSource.start}..${expectedSource.end}.`,
      );
    }
    const accessSource = occurrence.accessUse?.source;
    if (
      accessSource?.kind !== 'source-span-address'
      || accessSource.path !== occurrence.source.path
      || accessSource.start !== occurrence.source.start
      || accessSource.end !== occurrence.source.end
    ) {
      failures.push(
        `${spec.summary} Occurrence source did not match the inducing access-use source.`,
      );
    }
    if (spec.memberTokenSpan != null && (
      occurrence.memberTokenSource?.kind !== 'source-span-address'
      || occurrence.memberTokenSource.path !== spec.path
      || occurrence.memberTokenSource.start !== spec.memberTokenSpan.start
      || occurrence.memberTokenSource.end !== spec.memberTokenSpan.end
    )) {
      failures.push(
        `${spec.summary} Member token span was ${
          occurrence.memberTokenSource?.start ?? 'null'
        }..${occurrence.memberTokenSource?.end ?? 'null'}; expected ${
          spec.memberTokenSpan.start
        }..${spec.memberTokenSpan.end}.`,
      );
    }
  }
  return failures;
}

function matchesObservedDependencySourceSpanSpec(row, spec) {
  return matchesFields(row, spec.owner ?? {})
    && matchesFields(row.occurrence, spec.occurrence);
}

function matchesFields(row, fields) {
  return Object.entries(fields).every(([field, value]) => row[field] === value);
}
