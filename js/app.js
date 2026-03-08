import { loadToken } from './data/storage.js';
import { createInitialState, setAuth } from './state.js';
import { renderApp } from './ui/renderApp.js';

async function bootstrap() {
  const state = createInitialState();
  renderApp(state);

  const savedToken = (await loadToken()) ?? '';
  if (!savedToken) {
    return;
  }

  setAuth({
    token: savedToken,
    tokenSaved: true,
  });
}

bootstrap();
