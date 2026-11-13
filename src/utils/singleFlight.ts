/**
 * Lets an action run once at a time. A second call made while the first is still running is ignored (it returns undefined) instead of
 * sending the request again: a double click, Enter pressed twice, a retry on a slow connection. Unlike disabling a button, this answers
 * at once, before the screen has re-rendered, and it covers every way the action can be started.
 */
export interface SingleFlight {
  readonly busy: boolean;
  run<T>(task: () => Promise<T>): Promise<T | undefined>;
}

export function createSingleFlight(): SingleFlight {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    async run<T>(task: () => Promise<T>): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      try {
        return await task();
      } finally {
        busy = false; // also after a failure, so the user can try again
      }
    },
  };
}
