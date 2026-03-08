export function renderFilters(uiState) {
  const container = document.querySelector('#filters-content');
  if (!container) return;

  container.textContent = `Query: ${uiState.query || '—'}`;
}
