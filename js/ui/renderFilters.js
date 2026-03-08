export function renderFilters(state) {
  const container = document.querySelector('#filters-content');
  if (!container) return;

  container.textContent = `Query: ${state.filters.query || '—'}`;
}
