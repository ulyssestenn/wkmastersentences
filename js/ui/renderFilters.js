import { escapeHtml } from '../utils/sanitize.js';

function getSubjectTypeValue(uiState) {
  const subjectType = uiState?.filters?.subjectType;
  return subjectType === 'vocabulary' || subjectType === 'kana_vocabulary' ? subjectType : 'all';
}

export function renderFilters(uiState) {
  const container = document.querySelector('#filters-content');
  if (!container) return;

  const query = uiState?.query ?? '';
  const subjectType = getSubjectTypeValue(uiState);

  container.innerHTML = `
    <div class="ui-form filters-form">
      <div class="ui-form-row">
        <label class="ui-label" for="text-search-input">Text search</label>
        <input
          id="text-search-input"
          class="ui-input filters-form__search"
          type="search"
          placeholder="Search characters, slug, meanings, or sentence text"
          value="${escapeHtml(query)}"
        />
      </div>

      <div class="ui-form-row">
        <label class="ui-label" for="subject-type-filter">Subject type</label>
        <select id="subject-type-filter" class="ui-select filters-form__type">
          <option value="all" ${subjectType === 'all' ? 'selected' : ''}>All</option>
          <option value="vocabulary" ${subjectType === 'vocabulary' ? 'selected' : ''}>Vocabulary</option>
          <option value="kana_vocabulary" ${subjectType === 'kana_vocabulary' ? 'selected' : ''}>Kana vocabulary</option>
        </select>
      </div>
    </div>
  `;
}
