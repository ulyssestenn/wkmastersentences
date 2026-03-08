function formatTimestamp(isoString) {
  if (!isoString) {
    return null;
  }

  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }

  return parsed.toLocaleString();
}

function renderStatsSummary(stats) {
  if (!stats) {
    return null;
  }

  const assignments = Number(stats.assignments ?? 0);
  const subjects = Number(stats.subjects ?? 0);
  const subjectIds = Number(stats.subjectIds ?? 0);

  return `Stats: ${assignments} assignments, ${subjects} subjects (${subjectIds} unique IDs).`;
}

function classifyError(syncState) {
  const type = syncState.lastErrorType;
  if (type === 'unauthorized' || type === 'forbidden') {
    return 'Token invalid: update your API token and sync again.';
  }

  if (type === 'rate_limited') {
    return 'Rate limited: wait a moment and try “Sync now / Refresh” again.';
  }

  if (type === 'network_error') {
    return 'Network error: check your connection, then retry sync.';
  }

  if (type === 'startup_error') {
    return syncState.lastError ? `Startup error: ${syncState.lastError}` : 'Startup error: Unable to initialize the app.';
  }

  return syncState.lastError ? `Sync error: ${syncState.lastError}` : null;
}

export function renderStatus(syncState, authState) {
  const container = document.querySelector('#status-content');
  if (!container) return;

  const lines = [];
  const tokenStatus = authState?.tokenSaved ? 'Token saved locally.' : 'Token not saved yet.';
  lines.push(tokenStatus);

  if (syncState.inProgress) {
    lines.push('Sync in progress…');
  }

  const lastSynced = formatTimestamp(syncState.lastSyncedAt);
  if (lastSynced) {
    lines.push(`Last synced: ${lastSynced}`);
  }

  const statsSummary = renderStatsSummary(syncState.stats);
  if (statsSummary) {
    lines.push(statsSummary);
  }

  const actionableError = classifyError(syncState);
  if (actionableError) {
    lines.push(actionableError);
  }

  if (!syncState.inProgress && !syncState.lastSyncedAt && !syncState.lastError) {
    lines.push('Ready');
  }

  container.textContent = lines.join(' ');
}
