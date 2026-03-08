import { mergeSentenceLibraries } from './data/mergeLibrary.js';
import { loadCurrentSnapshot, loadToken } from './data/storage.js';
import { createInitialState, setAuth, setLibrary, setSyncStatus } from './state.js';
import { renderApp } from './ui/renderApp.js';

async function bootstrap() {
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
}

bootstrap();
