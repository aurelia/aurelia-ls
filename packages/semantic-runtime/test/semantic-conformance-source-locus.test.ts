import { describe, expect, test } from "vitest";
import {
  authoredMarkerSpan,
  authoredSourceSpanForSpec,
} from "../scripts/semantic-conformance-source-locus.mjs";

describe("semantic conformance source loci", () => {
  test("rejects an ambiguous marker unless its occurrence is explicit", () => {
    const source = "<p>${value}</p>\n<p>${value}</p>";

    expect(() => authoredSourceSpanForSpec("view.html", source, {
      marker: "${value}",
      token: "value",
    })).toThrow(/Ambiguous marker.*1:4, 2:4.*markerOccurrence/u);
  });

  test("keeps marker occurrence separate from token occurrence", () => {
    const source = "<p>first first</p>\n<p>second second</p>";
    const span = authoredSourceSpanForSpec("view.html", source, {
      marker: "<p>",
      markerOccurrence: 2,
      token: "second",
      occurrence: 2,
    });

    expect(span).toEqual({
      path: "view.html",
      start: source.lastIndexOf("second"),
      end: source.lastIndexOf("second") + "second".length,
      text: "second",
    });
  });

  test("requires independent end-marker selection for repeated ranges", () => {
    const source = "<template><template>inner</template></template>";

    expect(() => authoredSourceSpanForSpec("view.html", source, {
      startMarker: "<template>",
      startMarkerOccurrence: 2,
      endMarker: "</template>",
    })).toThrow(/Ambiguous endMarker.*endMarkerOccurrence/u);

    expect(authoredSourceSpanForSpec("view.html", source, {
      startMarker: "<template>",
      startMarkerOccurrence: 2,
      endMarker: "</template>",
      endMarkerOccurrence: 1,
    }).text).toBe("<template>inner</template>");
  });

  test("applies the same ambiguity rule to direct marker spans", () => {
    expect(() => authoredMarkerSpan("view.html", "name name", "name")).toThrow(/Ambiguous marker/u);
    expect(authoredMarkerSpan("view.html", "name name", "name", 2).start).toBe(5);
  });

  test("rejects overlapping marker occurrences", () => {
    expect(() => authoredMarkerSpan("view.html", "aaa", "aa")).toThrow(/1:1, 1:2/u);
  });
});
