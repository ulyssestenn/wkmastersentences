function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderTokenSync(authState) {
  const container = document.querySelector('#token-sync-content');
  if (!container) return;

  const tokenSavedLabel = authState.tokenSaved ? 'Saved locally' : 'Not saved';
  const tokenValue = escapeHtml(authState.token ?? '');

  container.innerHTML = `
    <form id="token-form">
      <label for="api-token-input">WaniKani API token</label>
      <input
        id="api-token-input"
        name="api-token"
        type="password"
        autocomplete="off"
        value="${tokenValue}"
        placeholder="Paste your read-only token"
      />
      <div>
        <button id="save-token-button" type="submit">Save token</button>
        <button id="sync-button" type="button">Sync now / Refresh</button>
      </div>
      <p>Token status: <strong>${tokenSavedLabel}</strong>.</p>
      <p>This token is stored only in your browser.</p>
    </form>
  `;
}
