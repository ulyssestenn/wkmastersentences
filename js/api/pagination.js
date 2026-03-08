export function getNextPageUrl(response) {
  return response?.pages?.next_url ?? null;
}
