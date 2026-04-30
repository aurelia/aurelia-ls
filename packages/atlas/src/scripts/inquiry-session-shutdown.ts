import { shutdownExistingInquirySession } from "../session/index.js";

const stopped = await shutdownExistingInquirySession({
  reason: "session shutdown script requested shutdown",
});

console.log(JSON.stringify({ stopped }, null, 2));
