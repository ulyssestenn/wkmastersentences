import { renderFilters } from './renderFilters.js';
import { renderList } from './renderList.js';
import { renderStatus } from './renderStatus.js';
import { renderTokenSync } from './renderTokenSync.js';
import { bindEvents } from './events.js';

export function renderApp(state) {
  const { auth, sync, ui, library } = state;

  renderTokenSync(auth);
  renderStatus(sync, auth);
  renderFilters(ui);
  renderList(library);
  bindEvents(state);
}
