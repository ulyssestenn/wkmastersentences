export function renderStatus(syncState, authState) {
  const container = document.querySelector('#status-content');
  if (!container) return;

  const tokenStatus = authState?.tokenSaved ? 'Token saved locally.' : 'Token not saved yet.';

  if (syncState.lastError) {
    container.textContent = `${tokenStatus} Sync error: ${syncState.lastError}`;
    return;
  }

  if (syncState.inProgress) {
    container.textContent = `${tokenStatus} Sync in progress…`;
    return;
  }

  if (syncState.lastSyncedAt) {
    container.textContent = `${tokenStatus} Last synced at ${syncState.lastSyncedAt}`;
    return;
  }

  container.textContent = `${tokenStatus} Ready`;
}
