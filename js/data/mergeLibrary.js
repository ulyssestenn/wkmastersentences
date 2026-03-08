export function mergeSentenceLibraries(base = [], incoming = []) {
  const byId = new Map(base.map((item) => [item.id, item]));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}
