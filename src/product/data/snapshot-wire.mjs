import { runCooperatively, runSynchronously } from './cooperative.mjs';
export function unpackSnapshot(body) {
  return runSynchronously(unpack(body));
}
export function unpackSnapshotAsync(body, options) {
  return runCooperatively(unpack(body), options);
}
function* unpack(body) {
  if (body.encoding !== 'event-columns-v1') return body;
  const { eventTable, encoding, ...rest } = body;
  const { keys, columns, length } = eventTable;
  if (!Number.isInteger(length) || length < 0 || length > 1000000 || keys.length !== columns.length)
    throw new Error('Invalid snapshot table');
  const events = Array.from({ length }, () => ({}));
  for (let col = 0; col < keys.length; col++) {
    const key = keys[col];
    const { values, indexes } = columns[col];
    if (indexes.length !== length) throw new Error('Invalid snapshot column');
    for (let row = 0; row < indexes.length; row++) {
      if (row % 512 === 0) yield;
      const index = indexes[row];
      if (index === -1) continue;
      if (!Number.isInteger(index) || index < 0 || index >= values.length)
        throw new Error('Invalid snapshot value');
      Object.defineProperty(events[row], key, {
        value: values[index],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return { ...rest, events };
}
