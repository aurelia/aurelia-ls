import { rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function rmOutDirs(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "out") {
        rmSync(full, { recursive: true, force: true });
      } else {
        rmOutDirs(full);
      }
    } else if (entry.endsWith(".tsbuildinfo")) {
      rmSync(full, { force: true });
    }
  }
}

rmOutDirs("packages");
rmSync("tsconfig.tsbuildinfo", { force: true });
