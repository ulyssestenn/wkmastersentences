export function chunk(array, size) {
  if (size <= 0) return [];

  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}
