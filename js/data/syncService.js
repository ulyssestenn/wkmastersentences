import { fetchAllPages } from '../api/pagination.js';
import { createWanikaniClient } from '../api/wanikaniClient.js';
import { mergeSentenceLibraries } from './mergeLibrary.js';
import { normalizeAssignmentRecord, normalizeSubjectRecord } from './normalizers.js';
import { saveCurrentSnapshot } from './storage.js';
import { setLibrary, setSyncStatus } from '../state.js';
import { chunk } from '../utils/chunk.js';

const ASSIGNMENTS_ENDPOINT =
  '/assignments?subject_types=vocabulary,kana_vocabulary&srs_stages=7,8,9';
const SUBJECT_CHUNK_SIZE = 100;
const RETRY_ATTEMPTS = 3;
const RETRYABLE_ERROR_TYPES = new Set(['network_error', 'rate_limited', 'server_error']);

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getRetryDelayMs(error, attempt) {
  const retryAfterHeaderSeconds = Number(error?.retryAfter);
  if (Number.isFinite(retryAfterHeaderSeconds) && retryAfterHeaderSeconds > 0) {
    return retryAfterHeaderSeconds * 1000;
  }

  return 500 * attempt;
}

async function withRetry(requestFn) {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const shouldRetry = RETRYABLE_ERROR_TYPES.has(error?.type) && attempt < RETRY_ATTEMPTS;
      if (!shouldRetry) {
        throw error;
      }

      await wait(getRetryDelayMs(error, attempt));
    }
  }

  throw lastError;
}

async function fetchSubjectsInChunks(client, subjectIds) {
  const idChunks = chunk(subjectIds, SUBJECT_CHUNK_SIZE);
  const subjects = [];

  for (let index = 0; index < idChunks.length; index += 1) {
    const chunkedIds = idChunks[index];

    try {
      const response = await withRetry(() => client.fetchSubjects(chunkedIds));
      const records = response?.data ?? [];
      subjects.push(...records.map(normalizeSubjectRecord));
    } catch (error) {
      throw {
        ...error,
        message: `Failed to fetch subjects chunk ${index + 1}/${idChunks.length} after retries.`,
      };
    }
  }

  return subjects;
}

export async function syncAssignments({ token }) {
  const client = createWanikaniClient({ token });

  setSyncStatus({
    inProgress: true,
    lastError: null,
    lastErrorType: null,
  });

  try {
    const assignmentRecords = await fetchAllPages(ASSIGNMENTS_ENDPOINT, (url) => client.request(url));
    const assignments = assignmentRecords.map(normalizeAssignmentRecord);

    const subjectIds = Array.from(
      new Set(assignments.map((assignment) => assignment.subject_id).filter((subjectId) => Number.isFinite(subjectId))),
    );

    const subjects = subjectIds.length ? await fetchSubjectsInChunks(client, subjectIds) : [];

    const lastSyncedAt = new Date().toISOString();
    const merged = mergeSentenceLibraries(assignments, subjects, lastSyncedAt);

    const snapshot = {
      assignments,
      subjects,
      subjectIds,
      lastSyncedAt,
    };

    await saveCurrentSnapshot(snapshot);

    setLibrary({ items: merged.items });

    setSyncStatus({
      inProgress: false,
      lastSyncedAt,
      lastError: null,
      lastErrorType: null,
      stats: {
        assignments: assignments.length,
        subjectIds: subjectIds.length,
        subjects: subjects.length,
        sentenceItems: merged.stats.keptWithSentences,
      },
    });

    return snapshot;
  } catch (error) {
    setSyncStatus({
      inProgress: false,
      lastError: error?.message ?? 'Failed to sync assignments.',
      lastErrorType: error?.type ?? 'unknown',
    });

    throw error;
  }
}
