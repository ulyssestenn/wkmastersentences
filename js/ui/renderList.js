import { escapeHtml } from '../utils/sanitize.js';

function getSubjectType(uiState) {
  const subjectType = uiState?.filters?.subjectType;
  return subjectType === 'vocabulary' || subjectType === 'kana_vocabulary' ? subjectType : 'all';
}

function getMeaningStrings(item) {
  if (!Array.isArray(item?.meanings)) return [];

  return item.meanings
    .map((meaning) => {
      if (typeof meaning === 'string') return meaning;
      return meaning?.meaning ?? '';
    })
    .filter((meaning) => typeof meaning === 'string' && meaning.length > 0);
}

function getSentenceStrings(item) {
  if (!Array.isArray(item?.contextSentences)) return [];

  return item.contextSentences.flatMap((sentence) => {
    if (!sentence || typeof sentence !== 'object') {
      return [];
    }

    return Object.values(sentence).filter((value) => typeof value === 'string' && value.length > 0);
  });
}

function matchesQuery(item, normalizedQuery) {
  if (!normalizedQuery) return true;

  const meaningStrings = getMeaningStrings(item);
  const sentenceStrings = getSentenceStrings(item);

  const haystack = [item?.characters, item?.slug, ...meaningStrings, ...sentenceStrings]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesSubjectType(item, subjectType) {
  if (subjectType === 'all') return true;
  return item?.type === subjectType;
}

function formatSentenceDetails(item) {
  const sentences = Array.isArray(item?.contextSentences) ? item.contextSentences : [];

  if (!sentences.length) {
    return '<li>No context sentences.</li>';
  }

  return sentences
    .map((sentence) => {
      const japanese = escapeHtml(sentence?.ja ?? sentence?.japanese ?? sentence?.text ?? '');
      const english = escapeHtml(sentence?.en ?? sentence?.english ?? '');

      return `
        <li>
          <p><strong>JA:</strong> ${japanese || '—'}</p>
          <p><strong>EN:</strong> ${english || '—'}</p>
        </li>
      `;
    })
    .join('');
}

export function renderList(libraryState, uiState) {
  const container = document.querySelector('#results-content');
  if (!container) return;

  const items = Array.isArray(libraryState?.items) ? libraryState.items : [];
  const normalizedQuery = (uiState?.query ?? '').trim().toLowerCase();
  const subjectType = getSubjectType(uiState);

  const filteredItems = items.filter(
    (item) => matchesSubjectType(item, subjectType) && matchesQuery(item, normalizedQuery),
  );

  if (!filteredItems.length) {
    container.innerHTML = '<p>No matching items.</p>';
    return;
  }

  container.innerHTML = filteredItems
    .map((item) => {
      const meanings = getMeaningStrings(item);
      const meaningsPreview = meanings.slice(0, 3).join(', ');
      const hiddenMeanings = meanings.length > 3 ? ` (+${meanings.length - 3} more)` : '';
      const sentenceCount = Array.isArray(item?.contextSentences) ? item.contextSentences.length : 0;

      return `
        <article>
          <h3>${escapeHtml(item?.characters || item?.slug || 'Untitled')}</h3>
          <p><strong>Slug:</strong> ${escapeHtml(item?.slug || '—')}</p>
          <p><strong>Level:</strong> ${escapeHtml(item?.level ?? '—')}</p>
          <p><strong>Meanings:</strong> ${escapeHtml(meaningsPreview || '—')}${escapeHtml(hiddenMeanings)}</p>
          <p><strong>Sentence count:</strong> ${sentenceCount}</p>
          <details>
            <summary>View context sentences</summary>
            <ul>
              ${formatSentenceDetails(item)}
            </ul>
          </details>
        </article>
      `;
    })
    .join('');
}
