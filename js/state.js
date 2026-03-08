export function createInitialState() {
  return {
    token: '',
    filters: {
      query: '',
    },
    results: [],
    status: {
      type: 'idle',
      message: 'Ready',
    },
  };
}
