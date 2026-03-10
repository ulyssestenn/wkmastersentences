const DEFAULT_API_BASE_URL = 'https://api.wanikani.com/v2';
const REQUEST_TIMEOUT_MS = 12_000;

function normalizeApiError(status, payload, response) {
  const apiMessage = payload?.error ?? payload?.message ?? `Request failed with status ${status}`;

  if (status === 401) {
    return {
      type: 'unauthorized',
      status,
      message: apiMessage,
    };
  }

  if (status === 403) {
    return {
      type: 'forbidden',
      status,
      message: apiMessage,
    };
  }

  if (status === 429) {
    return {
      type: 'rate_limited',
      status,
      message: apiMessage,
      retryAfter: response.headers.get('Retry-After'),
    };
  }

  if (status >= 500) {
    return {
      type: 'server_error',
      status,
      message: apiMessage,
    };
  }

  return {
    type: 'http_error',
    status,
    message: apiMessage,
  };
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export function createWanikaniClient({ token, fetchFn = fetch, baseUrl = DEFAULT_API_BASE_URL } = {}) {
  async function request(url) {
    const endpointUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      response = await fetchFn(endpointUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      const isTimeout = error?.name === 'AbortError' || controller.signal.aborted;
      if (isTimeout) {
        throw {
          type: 'timeout_error',
          message: `Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s.`,
        };
      }

      throw {
        type: 'network_error',
        message: error?.message ?? 'Network request failed.',
      };
    } finally {
      clearTimeout(timeoutId);
    }

    const payload = await parseResponseBody(response);
    if (!response.ok) {
      throw normalizeApiError(response.status, payload, response);
    }

    return payload;
  }

  return {
    request,

    async fetchAssignments() {
      return request(
        '/assignments?subject_types=vocabulary,kana_vocabulary&srs_stages=7,8,9',
      );
    },

    async fetchSubjects(ids = []) {
      if (!ids.length) {
        return {
          data: [],
          pages: {
            next_url: null,
          },
        };
      }

      const subjectIds = ids.join(',');
      return request(`${baseUrl}/subjects?ids=${subjectIds}`);
    },
  };
}
