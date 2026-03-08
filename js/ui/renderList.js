export function renderList(state) {
  const container = document.querySelector('#results-content');
  if (!container) return;

  container.textContent = `${state.results.length} item(s)`;
}
