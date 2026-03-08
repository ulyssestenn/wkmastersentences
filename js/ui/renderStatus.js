export function renderStatus(state) {
  const container = document.querySelector('#status-content');
  if (!container) return;

  container.textContent = state.status.message;
}
