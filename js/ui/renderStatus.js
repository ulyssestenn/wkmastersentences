export function renderStatus(syncState) {
  const container = document.querySelector('#status-content');
  if (!container) return;

  if (syncState.lastError) {
    container.textContent = `Sync error: ${syncState.lastError}`;
    return;
  }

  if (syncState.inProgress) {
    container.textContent = 'Sync in progress…';
    return;
  }

  if (syncState.lastSyncedAt) {
    container.textContent = `Last synced at ${syncState.lastSyncedAt}`;
    return;
  }

  container.textContent = 'Ready';
}
