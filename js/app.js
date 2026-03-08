import { mergeSentenceLibraries } from './data/mergeLibrary.js';
import { loadCurrentSnapshot, loadToken } from './data/storage.js';
import { createInitialState, setAuth, setLibrary, setSyncStatus } from './state.js';
import { renderApp } from './ui/renderApp.js';

async function bootstrap() {
  try {
    const state = createInitialState();
    renderApp(state);

    const savedToken = (await loadToken()) ?? '';
    if (savedToken) {
      setAuth({
        token: savedToken,
        tokenSaved: true,
      });
    }

    const snapshot = await loadCurrentSnapshot();
    if (snapshot) {
      const merged = mergeSentenceLibraries(
        snapshot.assignments ?? [],
        snapshot.subjects ?? [],
        snapshot.lastSyncedAt,
      );
      setLibrary({ items: merged.items });
      setSyncStatus({
        lastSyncedAt: snapshot.lastSyncedAt ?? null,
      });
    }
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
    setSyncStatus({
      lastError: `Startup failed while loading app state.${detail}`,
      lastErrorType: 'startup_error',
      inProgress: false,
    });
  }
}

bootstrap().catch((error) => {
  const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
  setSyncStatus({
    lastError: `Startup failed unexpectedly.${detail}`,
    lastErrorType: 'startup_error',
    inProgress: false,
  });
});
