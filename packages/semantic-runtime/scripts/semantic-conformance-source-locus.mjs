export function authoredSourceSpanForSpec(sourceFile, sourceText, spec) {
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error(`Source locus must be an object in ${sourceFile}.`);
  }
  if ((spec.startMarker == null) !== (spec.endMarker == null)) {
    throw new Error(`Source locus in ${sourceFile} must supply both startMarker and endMarker.`);
  }
  if (spec.offsetDelta != null && !Number.isInteger(spec.offsetDelta)) {
    throw new Error(`offsetDelta must be an integer in ${sourceFile}.`);
  }
  if (spec.startMarker != null) {
    const start = markerStartForSpec(
      sourceText,
      spec.startMarker,
      spec.startMarkerOccurrence,
      sourceFile,
      'startMarker',
    );
    const endMarkerStart = markerStartForSpec(
      sourceText,
      spec.endMarker,
      spec.endMarkerOccurrence,
      sourceFile,
      'endMarker',
      start + spec.startMarker.length,
    );
    const end = endMarkerStart + spec.endMarker.length + (spec.offsetDelta ?? 0);
    assertSpanBounds(sourceFile, sourceText, start, end);
    return {
      path: sourceFile,
      start,
      end,
      text: sourceText.slice(start, end),
    };
  }

  const marker = spec.marker ?? spec.token;
  const markerOccurrence = spec.marker == null ? spec.occurrence : spec.markerOccurrence;
  const markerStart = markerStartForSpec(
    sourceText,
    marker,
    markerOccurrence,
    sourceFile,
    spec.marker == null ? 'token' : 'marker',
  );
  if (spec.position === 'before-marker' || spec.position === 'after-marker') {
    const offset = markerStart
      + (spec.position === 'after-marker' ? marker.length : 0)
      + (spec.offsetDelta ?? 0);
    assertSpanBounds(sourceFile, sourceText, offset, offset);
    return {
      path: sourceFile,
      start: offset,
      end: offset,
      text: '',
    };
  }
  if (spec.position != null) {
    throw new Error(`Unsupported source locus position '${spec.position}' in ${sourceFile}.`);
  }
  if (spec.marker == null) {
    return {
      path: sourceFile,
      start: markerStart,
      end: markerStart + marker.length,
      text: marker,
    };
  }
  if (typeof spec.token !== 'string' || spec.token.length === 0) {
    throw new Error(`Marker-anchored source locus must supply a non-empty token in ${sourceFile}.`);
  }
  const occurrence = positiveOccurrence(spec.occurrence, 'occurrence', sourceFile);
  const tokenStart = nthIndexOf(sourceText, spec.token, occurrence, markerStart);
  if (tokenStart < 0) {
    throw new Error(`Token '${spec.token}' occurrence ${occurrence} not found after marker '${marker}' in ${sourceFile}.`);
  }
  return {
    path: sourceFile,
    start: tokenStart,
    end: tokenStart + spec.token.length,
    text: spec.token,
  };
}

export function authoredMarkerSpan(sourceFile, sourceText, marker, occurrence = null) {
  const start = markerStartForSpec(sourceText, marker, occurrence, sourceFile, 'marker');
  return {
    path: sourceFile,
    start,
    end: start + marker.length,
    text: marker,
  };
}

function markerStartForSpec(text, marker, occurrence, sourceFile, field, searchStart = 0) {
  if (typeof marker !== 'string' || marker.length === 0) {
    throw new Error(`${field} must be a non-empty string in ${sourceFile}.`);
  }
  const selectedOccurrence = positiveOccurrence(occurrence, `${field}Occurrence`, sourceFile);
  const start = nthIndexOf(text, marker, selectedOccurrence, searchStart);
  if (start < 0) {
    throw new Error(`${field} occurrence ${selectedOccurrence} not found in ${sourceFile}: ${marker}`);
  }
  if (occurrence == null && text.indexOf(marker, start + 1) >= 0) {
    const positions = markerPositions(text, marker, searchStart)
      .map((offset) => lineCharacterLabel(text, offset))
      .join(', ');
    throw new Error(
      `Ambiguous ${field} in ${sourceFile}: ${marker}. Found at ${positions}; make the marker unique or specify ${field}Occurrence.`,
    );
  }
  return start;
}

function positiveOccurrence(value, field, sourceFile) {
  if (value == null) {
    return 1;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer in ${sourceFile}.`);
  }
  return value;
}

function markerPositions(text, marker, searchStart) {
  const positions = [];
  let start = searchStart - 1;
  while ((start = text.indexOf(marker, start + 1)) >= 0) {
    positions.push(start);
  }
  return positions;
}

function lineCharacterLabel(text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return `${lines.length}:${(lines.at(-1) ?? '').length + 1}`;
}

function nthIndexOf(text, marker, occurrence, searchStart) {
  let start = searchStart - 1;
  for (let index = 0; index < occurrence; index++) {
    start = text.indexOf(marker, start + 1);
    if (start < 0) {
      return -1;
    }
  }
  return start;
}

function assertSpanBounds(sourceFile, sourceText, start, end) {
  if (start < 0 || end < start || end > sourceText.length) {
    throw new Error(`Source locus ${start}..${end} is outside ${sourceFile} (length ${sourceText.length}).`);
  }
}
