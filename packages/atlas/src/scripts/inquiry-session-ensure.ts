import { ensureInquirySession } from "../session/index.js";

const session = await ensureInquirySession();
const status = await session.status();

console.log(JSON.stringify({
  running: true,
  pid: status.pid,
  buildHash: status.buildHash,
  endpoint: status.endpoint,
  world: status.world,
  implementedLensIds: status.implementedLensIds,
  idleTtlMs: session.manifest.idleTtlMs,
  manifestPath: session.manifest.manifestPath,
}, null, 2));
