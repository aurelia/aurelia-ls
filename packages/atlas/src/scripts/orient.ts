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
  console.log("Atlas orientation");
  console.log(`- session: pid=${orientation.session.pid} uptimeMs=${orientation.session.uptimeMs}`);
  console.log(`- source: ${orientation.guide.sourceProject.identity}`);
  console.log(`- counts: lenses=${orientation.session.world.lensContracts} substrates=${orientation.session.world.substrateContracts} packages=${orientation.guide.sourceProject.packageCount} files=${orientation.guide.sourceProject.ownedSourceFileCount} declarations=${orientation.guide.sourceProject.declarationCount}`);
  console.log(`- answers: map=${orientation.answers.map.outcome} self=${orientation.answers.self.outcome}`);

  console.log("");
  console.log("Docs");
  for (const doc of orientation.guide.docs) {
    console.log(`- ${doc.path}: ${doc.summary}`);
  }

  console.log("");
  console.log("Scripts");
  for (const script of orientation.guide.scripts) {
    console.log(`- ${script.command}`);
  }

  console.log("");
  console.log("Implemented lenses");
  for (const lens of orientation.guide.implementedLenses) {
    console.log(`- ${lens.id}: ${lens.projectionIds.join(", ")}`);
  }

  console.log("");
  console.log("First moves");
  for (const move of orientation.guide.firstMoves) {
    console.log(`- ${move.id ?? move.kind}: ${move.rationale}`);
  }

  console.log("");
  console.log("Capability moves");
  for (const move of orientation.guide.capabilityMoves) {
    console.log(`- ${move.id}: ${move.summary}`);
  }

  if (orientation.guide.openSeams.length > 0) {
    console.log("");
    console.log("Open seams");
    for (const seam of orientation.guide.openSeams) {
      console.log(`- ${seam.kind}: ${seam.summary}`);
    }
  }

  console.log("");
  console.log("Use `pnpm --filter @aurelia-ls/atlas orient:json` for the full request-shaped bundle.");
}
