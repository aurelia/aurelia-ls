import type { RevisionToken } from "../shared/types.js";

export class GraphRevisionClock {
  #currentRevisionToken: RevisionToken = 0;

  public get currentRevisionToken(): RevisionToken {
    return this.#currentRevisionToken;
  }

  public issue(): RevisionToken {
    this.#currentRevisionToken += 1;
    return this.#currentRevisionToken;
  }
}
