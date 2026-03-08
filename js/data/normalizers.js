export function normalizeSentenceRecord(record) {
  return {
    id: record?.id ?? '',
    text: record?.text ?? '',
  };
}

export function normalizeAssignmentRecord(record) {
  return {
    subject_id: record?.data?.subject_id ?? null,
    srs_stage: record?.data?.srs_stage ?? null,
    updated_at: record?.data?.updated_at ?? null,
  };
}
