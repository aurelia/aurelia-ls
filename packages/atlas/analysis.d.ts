// Give the analysis project a root outside the full project's src include.
// With a shared output and build-info file, tsc -b can then detect a profile switch
// even when all source timestamps predate the previous build.
export * from "./src/analysis.js";
