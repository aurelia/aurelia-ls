import { createApi } from "../session/index.js";
import type { Orientation } from "../session/api.js";

const api = createApi({ idleTtlMs: 10 * 60 * 1000 });
const orientation = await api.orient();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(orientation, null, 2));
} else {
  printCompactOrientation(orientation);
}

function printCompactOrientation(orientation: Orientation): void {
  const { guide, session } = orientation;
  console.log("Atlas orientation");
  console.log(`- session: pid=${session.pid}; map=${orientation.answers.map.outcome}; self=${orientation.answers.self.outcome}`);
  console.log(`- source: ${guide.sourceProject.identity}`);
  const firstPartyRoots = Object.values(guide.sourceProject.packageRoots).filter((root) => root.startsWith("packages/"));
  console.log(`- repository packages admitted to the TypeScript program: ${firstPartyRoots.join(", ")}`);
  console.log(`- indexed: ${guide.sourceProject.ownedSourceFileCount} files, ${guide.sourceProject.declarationCount} declarations; ${guide.implementedLenses.length} implemented lenses`);

  for (const script of guide.scripts.filter((row) => ["work:router", "memory:next", "pressure:product-architecture"].includes(row.id))) {
    console.log("");
    console.log(script.summary);
    console.log(script.command);
  }
  if (guide.openSeams.length > 0) {
    console.log("");
    console.log("Open seams");
    for (const seam of guide.openSeams) {
      console.log(`- ${seam.kind}: ${seam.summary}`);
    }
  }

  console.log("");
  console.log("For exact inquiry shapes, lenses, sources and continuations: pnpm --filter @aurelia-ls/atlas orient:json");
}
