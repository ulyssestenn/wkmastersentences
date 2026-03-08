export function normalizeSentenceRecord(record) {
  return {
    id: record?.id ?? '',
    text: record?.text ?? '',
  };
}
