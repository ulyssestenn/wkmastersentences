import { fetchAllPages } from '../api/pagination.js';
import { createWanikaniClient } from '../api/wanikaniClient.js';
import { normalizeAssignmentRecord } from './normalizers.js';
import { setSyncStatus } from '../state.js';

const ASSIGNMENTS_ENDPOINT =
  '/assignments?subject_types=vocabulary,kana_vocabulary&srs_stages=7,8,9';

export async function syncAssignments({ token }) {
  const client = createWanikaniClient({ token });

  setSyncStatus({
    inProgress: true,
    lastError: null,
  });

  try {
    const assignmentRecords = await fetchAllPages(ASSIGNMENTS_ENDPOINT, (url) => client.request(url));
    const assignments = assignmentRecords.map(normalizeAssignmentRecord);

    const subjectIds = Array.from(
      new Set(assignments.map((assignment) => assignment.subject_id).filter((subjectId) => Number.isFinite(subjectId))),
    );

    if (!subjectIds.length) {
      setSyncStatus({
        inProgress: false,
        lastSyncedAt: new Date().toISOString(),
        stats: {
          assignments: assignments.length,
          subjectIds: 0,
        },
      });

      return {
        assignments,
        subjectIds: [],
      };
    }

    setSyncStatus({
      inProgress: false,
      lastSyncedAt: new Date().toISOString(),
      stats: {
        assignments: assignments.length,
        subjectIds: subjectIds.length,
      },
    });

    return {
      assignments,
      subjectIds,
    };
  } catch (error) {
    setSyncStatus({
      inProgress: false,
      lastError: error?.message ?? 'Failed to sync assignments.',
    });

    throw error;
  }
}
