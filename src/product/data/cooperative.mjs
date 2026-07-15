// Yield between bounded units so rendering and input can run during large updates.
export async function runCooperatively(
  iterator,
  { signal, budgetMs = 8, yieldTask = () => new Promise((resolve) => setTimeout(resolve, 0)) } = {},
) {
  let started = performance.now();
  try {
    while (true) {
      signal?.throwIfAborted();
      const step = iterator.next();
      if (step.done) return step.value;
      if (performance.now() - started >= budgetMs) {
        await yieldTask();
        started = performance.now();
      }
    }
  } finally {
    iterator.return?.();
  }
}
export function runSynchronously(iterator) {
  let step;
  do {
    step = iterator.next();
  } while (!step.done);
  return step.value;
}
