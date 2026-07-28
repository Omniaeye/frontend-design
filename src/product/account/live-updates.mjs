export async function readUpdates(body, onUpdate, signal) {
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let pending = '';
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true }).replaceAll('\r', '');
      if (pending.length > 65536) throw new Error('Oversized update');
      let end;
      while ((end = pending.indexOf('\n\n')) >= 0) {
        const frame = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (frame.split('\n').includes('event: update')) {
          const data = JSON.parse(
            frame
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart())
              .join('\n'),
          );
          if (Array.isArray(data.topics)) onUpdate(data);
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
