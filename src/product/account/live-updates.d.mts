export function readUpdates(
  body: ReadableStream<Uint8Array>,
  onUpdate: (data: { topics: string[] }) => void,
  signal: AbortSignal,
): Promise<void>;
