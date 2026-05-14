import type { Token } from './expression-scanner.js';
import {
  MatchedDelimiterEntry,
  type MatchedDelimiterKind,
} from './parse-result-algebra.js';
import type { SourceSpan } from './source-span.js';

export interface CompletedInputDelimiterSpanHost {
  spanFromToken(token: Token): SourceSpan;
}

class OpenDelimiterFrame {
  constructor(
    readonly kind: MatchedDelimiterKind,
    readonly openSpan: SourceSpan,
  ) {}
}

export class CompletedInputDelimiterTracker {
  private readonly stack: OpenDelimiterFrame[] = [];

  constructor(
    private readonly host: CompletedInputDelimiterSpanHost,
  ) {}

  get depth(): number {
    return this.stack.length;
  }

  restoreDepth(depth: number): void {
    this.stack.length = depth;
  }

  push(kind: MatchedDelimiterKind, open: Token): void {
    this.stack.push(new OpenDelimiterFrame(kind, this.host.spanFromToken(open)));
  }

  pop(kind: MatchedDelimiterKind): void {
    const top = this.stack[this.stack.length - 1];
    if (top?.kind === kind) {
      this.stack.pop();
    }
  }

  snapshot(): readonly MatchedDelimiterEntry[] {
    // This currently snapshots only still-open delimiters. If later
    // publication needs close spans or richer delimiter progress on the
    // property/iterator corridor, add that through parser-local state instead
    // of widening `MatchedDelimiterEntry` piecemeal at call sites.
    return this.stack.map(
      (frame) => new MatchedDelimiterEntry(frame.kind, frame.openSpan, null),
    );
  }
}
