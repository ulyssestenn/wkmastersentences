import { saveToken } from '../data/storage.js';
import { setAuth, setSyncStatus } from '../state.js';

function getTokenValue() {
  const tokenInput = document.querySelector('#api-token-input');
  if (!tokenInput) {
    return '';
  }

  return tokenInput.value.trim();
}

async function persistTokenFromInput() {
  const token = getTokenValue();

  if (!token) {
    setAuth({ token: '', tokenSaved: false });
    return;
  }

  await saveToken(token);
  setAuth({ token, tokenSaved: true });
}

function onTokenSyncAttempt() {
  const token = getTokenValue();

  if (!token) {
    setSyncStatus({
      lastError: 'Token missing or invalid. Enter your token and save before syncing.',
    });
    return;
  }

  setSyncStatus({ lastError: null });
}

export function bindEvents() {
  const tokenForm = document.querySelector('#token-form');
  const saveTokenButton = document.querySelector('#save-token-button');
  const syncButton = document.querySelector('#sync-button');

  if (tokenForm && !tokenForm.dataset.bound) {
    tokenForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await persistTokenFromInput();
    });
    tokenForm.dataset.bound = 'true';
  }

  if (saveTokenButton && !saveTokenButton.dataset.bound) {
    saveTokenButton.addEventListener('click', async () => {
      await persistTokenFromInput();
    });
    saveTokenButton.dataset.bound = 'true';
  }

  if (syncButton && !syncButton.dataset.bound) {
    syncButton.addEventListener('click', () => {
      onTokenSyncAttempt();
    });
    syncButton.dataset.bound = 'true';
  }
}
