import { renderFilters } from './renderFilters.js';
import { renderList } from './renderList.js';
import { renderStatus } from './renderStatus.js';
import { bindEvents } from './events.js';

export function renderApp(state) {
  const { sync, ui, library } = state;

  renderStatus(sync);
  renderFilters(ui);
  renderList(library);
  bindEvents(state);
}
