import { escapeHtml } from '../utils/sanitize.js';

export function renderTokenSync(authState) {
  const container = document.querySelector('#token-sync-content');
  if (!container) return;

  const tokenSavedLabel = authState.tokenSaved ? 'Saved locally' : 'Not saved';
  const tokenValue = escapeHtml(authState.token ?? '');
  const tokenStatusClass = authState.tokenSaved ? 'ui-state--info' : 'ui-state--error';

  container.innerHTML = `
    <form id="token-form" class="ui-form token-sync-form">
      <div class="ui-form-row">
        <label class="ui-label" for="api-token-input">WaniKani API token</label>
      <input
        id="api-token-input"
        name="api-token"
        type="password"
        autocomplete="off"
        value="${tokenValue}"
        placeholder="Paste your read-only token"
       class="ui-input token-sync-form__input"
      />
      </div>
      <div class="ui-button-row">
        <button id="save-token-button" class="ui-button ui-button--primary" type="submit">Save token</button>
        <button id="sync-button" class="ui-button ui-button--secondary" type="button">Sync now / Refresh</button>
      </div>
      <p class="ui-state ${tokenStatusClass}">Token status: <strong>${tokenSavedLabel}</strong>.</p>
      <p class="ui-state ui-state--info">This token is stored only in your browser.</p>
    </form>
  `;
}
