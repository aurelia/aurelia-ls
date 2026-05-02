import { createApi } from "../session/index.js";

const api = createApi({ idleTtlMs: 10 * 60 * 1000 });
const orientation = await api.orient();

console.log(JSON.stringify(orientation, null, 2));
