export function renderList(libraryState) {
  const container = document.querySelector('#results-content');
  if (!container) return;

  container.textContent = `${libraryState.items.length} item(s)`;
}
