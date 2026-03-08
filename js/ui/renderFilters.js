function getSubjectTypeValue(uiState) {
  const subjectType = uiState?.filters?.subjectType;
  return subjectType === 'vocabulary' || subjectType === 'kana_vocabulary' ? subjectType : 'all';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderFilters(uiState) {
  const container = document.querySelector('#filters-content');
  if (!container) return;

  const query = uiState?.query ?? '';
  const subjectType = getSubjectTypeValue(uiState);

  container.innerHTML = `
    <label for="text-search-input">Text search</label>
    <input
      id="text-search-input"
      type="search"
      placeholder="Search characters, slug, meanings, or sentence text"
      value="${escapeHtml(query)}"
    />

    <label for="subject-type-filter">Subject type</label>
    <select id="subject-type-filter">
      <option value="all" ${subjectType === 'all' ? 'selected' : ''}>All</option>
      <option value="vocabulary" ${subjectType === 'vocabulary' ? 'selected' : ''}>Vocabulary</option>
      <option value="kana_vocabulary" ${subjectType === 'kana_vocabulary' ? 'selected' : ''}>Kana vocabulary</option>
    </select>
  `;
}
