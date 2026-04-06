import {
  AppTask,
  Aurelia,
  AuComposeBoundary
} from "./aurelia.js";

function readRuntimeRegistration(): unknown {
  return JSON.parse(process.env.RUNTIME_REGISTRATION ?? "{}");
}

new Aurelia().register(
  AppTask.activating((container) => {
    container.register(readRuntimeRegistration());
  }),
  AuComposeBoundary.boundary(() => import("./lazy-screen.js"))
);
