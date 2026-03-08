export function mergeSentenceLibraries(assignments = [], subjects = [], fetchedAt = new Date().toISOString()) {
  const assignmentsBySubjectId = new Map(
    assignments
      .filter((assignment) => Number.isFinite(assignment?.subject_id))
      .map((assignment) => [assignment.subject_id, assignment]),
  );

  const items = subjects
    .filter((subject) => {
      const sentences = subject?.context_sentences;
      return Array.isArray(sentences) && sentences.length > 0;
    })
    .map((subject) => {
      const assignment = assignmentsBySubjectId.get(subject.id);

      return {
        id: subject.id,
        characters: subject.characters,
        slug: subject.slug,
        level: subject.level,
        meanings: subject.meanings,
        type: subject.subject_type,
        srsStage: assignment?.srs_stage ?? null,
        assignmentUpdatedAt: assignment?.updated_at ?? null,
        contextSentences: subject.context_sentences,
        fetchedAt,
      };
    });

  return {
    items,
    stats: {
      subjects: subjects.length,
      keptWithSentences: items.length,
    },
  };
}
