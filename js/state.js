import { renderApp } from './ui/renderApp.js';

export const state = {
  auth: {
    token: '',
    tokenSaved: false,
  },
  sync: {
    inProgress: false,
    lastSyncedAt: null,
    lastError: null,
    lastErrorType: null,
    stats: null,
  },
  library: {
    items: [],
    byId: {},
  },
  ui: {
    query: '',
    filters: {},
    sorting: {
      key: 'default',
      direction: 'asc',
    },
  },
};

export function createInitialState() {
  return state;
}

function triggerRender() {
  renderApp(state);
}

export function setAuth(nextAuth) {
  state.auth = {
    ...state.auth,
    ...nextAuth,
  };
  triggerRender();
}

export function setSyncStatus(nextSync) {
  state.sync = {
    ...state.sync,
    ...nextSync,
  };
  triggerRender();
}

export function setLibrary(nextLibrary) {
  state.library = {
    ...state.library,
    ...nextLibrary,
  };
  triggerRender();
}

export function setUi(nextUi) {
  state.ui = {
    ...state.ui,
    ...nextUi,
  };
  triggerRender();
}
