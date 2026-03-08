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

export function normalizeSubjectRecord(record) {
  return {
    id: record?.id ?? null,
    characters: record?.data?.characters ?? null,
    slug: record?.data?.slug ?? null,
    level: record?.data?.level ?? null,
    meanings: record?.data?.meanings ?? [],
    context_sentences: record?.data?.context_sentences ?? [],
    subject_type: record?.object ?? null,
  };
}
