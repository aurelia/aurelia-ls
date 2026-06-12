export function exactSourceSpanFailures(rows, specs) {
  const failures = [];
  for (const spec of specs) {
    const row = rows.find((candidate) => matchesSourceSpanSpec(candidate, spec));
    if (row == null) {
      failures.push(`${spec.summary} No matching row was published.`);
      continue;
    }
    if (row.source?.kind !== 'source-span-address') {
      failures.push(`${spec.summary} Source kind was ${row.source?.kind ?? 'null'}.`);
      continue;
    }
    if (row.source.path !== spec.path) {
      failures.push(`${spec.summary} Source path was ${row.source.path ?? 'null'}.`);
    }
    if (row.source.start !== row.spanStart || row.source.end !== row.spanEnd) {
      failures.push(`${spec.summary} Source span was ${row.source.start}..${row.source.end}; dependency span was ${row.spanStart}..${row.spanEnd}.`);
    }
  }
  return failures;
}

function matchesSourceSpanSpec(row, spec) {
  const match = spec.match ?? {
    sourceName: spec.sourceName,
    ...(spec.methodName === undefined ? {} : { methodName: spec.methodName }),
  };
  return Object.entries(match).every(([field, value]) => row[field] === value);
}
