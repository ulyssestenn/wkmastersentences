import { renderFilters } from './renderFilters.js';
import { renderList } from './renderList.js';
import { renderStatus } from './renderStatus.js';
import { bindEvents } from './events.js';

export function renderApp(state) {
  renderStatus(state);
  renderFilters(state);
  renderList(state);
  bindEvents(state);
}
