import { saveToken } from '../data/storage.js';
import { syncAssignments } from '../data/syncService.js';
import { setAuth, setSyncStatus, setUi } from '../state.js';

function getTokenValue() {
  const tokenInput = document.querySelector('#api-token-input');
  if (!tokenInput) {
    return '';
  }

  return tokenInput.value.trim();
}

function setControlsDisabled(disabled) {
  const controls = [
    document.querySelector('#save-token-button'),
    document.querySelector('#sync-button'),
    document.querySelector('#text-search-input'),
    document.querySelector('#subject-type-filter'),
    document.querySelector('#api-token-input'),
  ].filter(Boolean);

  controls.forEach((control) => {
    control.disabled = disabled;
  });
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

async function onTokenSyncAttempt() {
  const token = getTokenValue();

  if (!token) {
    setSyncStatus({
      lastError: 'Token missing or invalid. Enter your token and save before syncing.',
      lastErrorType: 'unauthorized',
    });
    return;
  }

  setControlsDisabled(true);

  try {
    await syncAssignments({ token });
  } catch {
    // Sync service already updates sync status with a normalized error.
  } finally {
    setControlsDisabled(false);
  }
}

function onQueryChange(query, state) {
  setUi({
    ...state.ui,
    query,
  });
}

function onSubjectTypeChange(event, state) {
  setUi({
    ...state.ui,
    filters: {
      ...state.ui.filters,
      subjectType: event.target.value,
    },
  });
}

export function bindEvents(state) {
  const tokenForm = document.querySelector('#token-form');
  const saveTokenButton = document.querySelector('#save-token-button');
  const syncButton = document.querySelector('#sync-button');
  const textSearchInput = document.querySelector('#text-search-input');
  const subjectTypeFilter = document.querySelector('#subject-type-filter');
  let queryDebounceTimer;

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
    syncButton.addEventListener('click', async () => {
      await onTokenSyncAttempt();
    });
    syncButton.dataset.bound = 'true';
  }

  if (textSearchInput && !textSearchInput.dataset.bound) {
    textSearchInput.addEventListener('input', (event) => {
      const queryInput = event.target;
      clearTimeout(queryDebounceTimer);
      queryDebounceTimer = setTimeout(() => {
        onQueryChange(queryInput.value, state);
      }, 250);
    });
    textSearchInput.dataset.bound = 'true';
  }

  if (subjectTypeFilter && !subjectTypeFilter.dataset.bound) {
    subjectTypeFilter.addEventListener('change', (event) => {
      onSubjectTypeChange(event, state);
    });
    subjectTypeFilter.dataset.bound = 'true';
  }

  setControlsDisabled(Boolean(state.sync?.inProgress));

  if (syncButton) {
    syncButton.textContent = state.sync?.inProgress ? 'Refreshing…' : 'Sync now / Refresh';
  }
}
