import { createInitialState } from './state.js';
import { renderApp } from './ui/renderApp.js';

function bootstrap() {
  const state = createInitialState();
  renderApp(state);
}

bootstrap();
