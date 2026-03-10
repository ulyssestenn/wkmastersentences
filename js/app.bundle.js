(() => {
  // js/data/mergeLibrary.js
  function mergeSentenceLibraries(assignments = [], subjects = [], fetchedAt = (/* @__PURE__ */ new Date()).toISOString()) {
    const assignmentsBySubjectId = new Map(
      assignments.filter((assignment) => Number.isFinite(assignment?.subject_id)).map((assignment) => [assignment.subject_id, assignment])
    );
    const items = subjects.filter((subject) => {
      const sentences = subject?.context_sentences;
      return Array.isArray(sentences) && sentences.length > 0;
    }).map((subject) => {
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
        fetchedAt
      };
    });
    return {
      items,
      stats: {
        subjects: subjects.length,
        keptWithSentences: items.length
      }
    };
  }

  // js/data/schema.js
  var SENTENCE_DB_NAME = "wk-master-sentences";
  var SENTENCE_DB_VERSION = 1;
  var sentenceSchemaVersion = 1;
  var OBJECT_STORES = {
    settings: "settings",
    librarySnapshots: "librarySnapshots"
  };
  var SETTINGS_KEYS = {
    auth: "auth"
  };
  var LIBRARY_SNAPSHOT_KEYS = {
    current: "current"
  };

  // js/data/storage.js
  var dbPromise;
  function getIndexedDb() {
    if (!globalThis.indexedDB) {
      throw new Error("IndexedDB is not available in this environment.");
    }
    return globalThis.indexedDB;
  }
  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }
  function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
    });
  }
  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
      const request = getIndexedDb().open(SENTENCE_DB_NAME, SENTENCE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OBJECT_STORES.settings)) {
          db.createObjectStore(OBJECT_STORES.settings, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(OBJECT_STORES.librarySnapshots)) {
          db.createObjectStore(OBJECT_STORES.librarySnapshots, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          dbPromise = void 0;
        };
        db.onversionchange = () => {
          dbPromise = void 0;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB database."));
    }).catch((error) => {
      dbPromise = void 0;
      throw error;
    });
    return dbPromise;
  }
  async function saveToken(token) {
    const db = await openDatabase();
    const transaction = db.transaction(OBJECT_STORES.settings, "readwrite");
    const store = transaction.objectStore(OBJECT_STORES.settings);
    store.put({
      key: SETTINGS_KEYS.auth,
      token
    });
    await transactionToPromise(transaction);
  }
  async function loadToken() {
    const db = await openDatabase();
    const transaction = db.transaction(OBJECT_STORES.settings, "readonly");
    const store = transaction.objectStore(OBJECT_STORES.settings);
    const request = store.get(SETTINGS_KEYS.auth);
    const record = await requestToPromise(request);
    await transactionToPromise(transaction);
    return record?.token ?? null;
  }
  async function saveCurrentSnapshot(snapshot) {
    const db = await openDatabase();
    const transaction = db.transaction(OBJECT_STORES.librarySnapshots, "readwrite");
    const store = transaction.objectStore(OBJECT_STORES.librarySnapshots);
    store.put({
      key: LIBRARY_SNAPSHOT_KEYS.current,
      ...snapshot,
      schemaVersion: snapshot?.schemaVersion ?? sentenceSchemaVersion,
      lastSyncedAt: snapshot?.lastSyncedAt ?? null,
      stats: snapshot?.stats ?? null
    });
    await transactionToPromise(transaction);
  }
  async function loadCurrentSnapshot() {
    const db = await openDatabase();
    const transaction = db.transaction(OBJECT_STORES.librarySnapshots, "readonly");
    const store = transaction.objectStore(OBJECT_STORES.librarySnapshots);
    const request = store.get(LIBRARY_SNAPSHOT_KEYS.current);
    const record = await requestToPromise(request);
    await transactionToPromise(transaction);
    if (!record) {
      return null;
    }
    const { key, ...snapshot } = record;
    return snapshot;
  }

  // js/utils/sanitize.js
  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  // js/ui/renderFilters.js
  function getSubjectTypeValue(uiState) {
    const subjectType = uiState?.filters?.subjectType;
    return subjectType === "vocabulary" || subjectType === "kana_vocabulary" ? subjectType : "all";
  }
  function renderFilters(uiState) {
    const container = document.querySelector("#filters-content");
    if (!container) return;
    const query = uiState?.query ?? "";
    const subjectType = getSubjectTypeValue(uiState);
    container.innerHTML = `
    <div class="ui-form filters-form">
      <div class="ui-form-row">
        <label class="ui-label" for="text-search-input">Text search</label>
        <input
          id="text-search-input"
          class="ui-input filters-form__search"
          type="search"
          placeholder="Search characters, slug, meanings, or sentence text"
          value="${escapeHtml(query)}"
        />
      </div>

      <div class="ui-form-row">
        <label class="ui-label" for="subject-type-filter">Subject type</label>
        <select id="subject-type-filter" class="ui-select filters-form__type">
          <option value="all" ${subjectType === "all" ? "selected" : ""}>All</option>
          <option value="vocabulary" ${subjectType === "vocabulary" ? "selected" : ""}>Vocabulary</option>
          <option value="kana_vocabulary" ${subjectType === "kana_vocabulary" ? "selected" : ""}>Kana vocabulary</option>
        </select>
      </div>
    </div>
  `;
  }

  // js/ui/renderList.js
  function getSubjectType(uiState) {
    const subjectType = uiState?.filters?.subjectType;
    return subjectType === "vocabulary" || subjectType === "kana_vocabulary" ? subjectType : "all";
  }
  function getMeaningStrings(item) {
    if (!Array.isArray(item?.meanings)) return [];
    return item.meanings.map((meaning) => {
      if (typeof meaning === "string") return meaning;
      return meaning?.meaning ?? "";
    }).filter((meaning) => typeof meaning === "string" && meaning.length > 0);
  }
  function getSentenceStrings(item) {
    if (!Array.isArray(item?.contextSentences)) return [];
    return item.contextSentences.flatMap((sentence) => {
      if (!sentence || typeof sentence !== "object") {
        return [];
      }
      return Object.values(sentence).filter((value) => typeof value === "string" && value.length > 0);
    });
  }
  function matchesQuery(item, normalizedQuery) {
    if (!normalizedQuery) return true;
    const meaningStrings = getMeaningStrings(item);
    const sentenceStrings = getSentenceStrings(item);
    const haystack = [item?.characters, item?.slug, ...meaningStrings, ...sentenceStrings].filter((value) => typeof value === "string" && value.length > 0).join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  }
  function matchesSubjectType(item, subjectType) {
    if (subjectType === "all") return true;
    return item?.type === subjectType;
  }
  function formatSentenceDetails(item) {
    const sentences = Array.isArray(item?.contextSentences) ? item.contextSentences : [];
    if (!sentences.length) {
      return '<li class="results-card__sentence-row"><p class="results-card__sentence-line">No context sentences.</p></li>';
    }
    return sentences.map((sentence) => {
      const japanese = escapeHtml(sentence?.ja ?? sentence?.japanese ?? sentence?.text ?? "");
      const english = escapeHtml(sentence?.en ?? sentence?.english ?? "");
      return `
        <li class="results-card__sentence-row">
          <p class="results-card__sentence-line"><strong>JA:</strong> ${japanese || "\u2014"}</p>
          <p class="results-card__sentence-line"><strong>EN:</strong> ${english || "\u2014"}</p>
        </li>
      `;
    }).join("");
  }
  function renderList(libraryState, uiState) {
    const container = document.querySelector("#results-content");
    if (!container) return;
    const items = Array.isArray(libraryState?.items) ? libraryState.items : [];
    const normalizedQuery = (uiState?.query ?? "").trim().toLowerCase();
    const subjectType = getSubjectType(uiState);
    if (!items.length) {
      container.innerHTML = '<p class="ui-state ui-state--info">No synced data yet. Add a token and run sync to load results.</p>';
      return;
    }
    const filteredItems = items.filter(
      (item) => matchesSubjectType(item, subjectType) && matchesQuery(item, normalizedQuery)
    );
    if (!filteredItems.length) {
      container.innerHTML = '<p class="ui-state ui-state--empty">No matching items.</p>';
      return;
    }
    container.innerHTML = `
    <div class="results-list">
      ${filteredItems.map((item) => {
      const meanings = getMeaningStrings(item);
      const meaningsPreview = meanings.slice(0, 3).join(", ");
      const hiddenMeanings = meanings.length > 3 ? ` (+${meanings.length - 3} more)` : "";
      const sentenceCount = Array.isArray(item?.contextSentences) ? item.contextSentences.length : 0;
      return `
            <article class="results-card">
              <h3 class="results-card__title">${escapeHtml(item?.characters || item?.slug || "Untitled")}</h3>
              <p class="results-card__meta"><strong>Slug:</strong> ${escapeHtml(item?.slug || "\u2014")}</p>
              <p class="results-card__meta"><strong>Level:</strong> ${escapeHtml(item?.level ?? "\u2014")}</p>
              <p class="results-card__meta"><strong>Meanings:</strong> ${escapeHtml(meaningsPreview || "\u2014")}${escapeHtml(hiddenMeanings)}</p>
              <p class="results-card__meta"><strong>Sentence count:</strong> ${sentenceCount}</p>
              <details class="results-card__details">
                <summary class="results-card__summary">View context sentences</summary>
                <ul class="results-card__sentences">
                  ${formatSentenceDetails(item)}
                </ul>
              </details>
            </article>
          `;
    }).join("")}
    </div>
  `;
  }

  // js/ui/renderStatus.js
  function formatTimestamp(isoString) {
    if (!isoString) {
      return null;
    }
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return isoString;
    }
    return parsed.toLocaleString();
  }
  function renderStatsSummary(stats) {
    if (!stats) {
      return null;
    }
    const assignments = Number(stats.assignments ?? 0);
    const subjects = Number(stats.subjects ?? 0);
    const subjectIds = Number(stats.subjectIds ?? 0);
    return `Stats: ${assignments} assignments, ${subjects} subjects (${subjectIds} unique IDs).`;
  }
  function classifyError(syncState) {
    const type = syncState.lastErrorType;
    if (type === "unauthorized" || type === "forbidden") {
      return "Token invalid: update your API token and sync again.";
    }
    if (type === "rate_limited") {
      return "Rate limited: wait a moment and try \u201CSync now / Refresh\u201D again.";
    }
    if (type === "network_error") {
      return "Network error: check your connection, then retry sync.";
    }
    if (type === "startup_error") {
      return syncState.lastError ? `Startup error: ${syncState.lastError}` : "Startup error: Unable to initialize the app.";
    }
    return syncState.lastError ? `Sync error: ${syncState.lastError}` : null;
  }
  function renderStatus(syncState, authState) {
    const container = document.querySelector("#status-content");
    if (!container) return;
    const blocks = [];
    container.className = "ui-stack status-stack";
    const tokenStatus = authState?.tokenSaved ? "Token saved locally." : "Token not saved yet.";
    blocks.push(`<p class="ui-state ${authState?.tokenSaved ? "ui-state--info" : "ui-state--error"}">${tokenStatus}</p>`);
    if (syncState.inProgress) {
      blocks.push('<p class="ui-state ui-state--info">Sync in progress\u2026</p>');
    }
    const lastSynced = formatTimestamp(syncState.lastSyncedAt);
    if (lastSynced) {
      blocks.push(`<p class="ui-state ui-state--info">Last synced: ${lastSynced}</p>`);
    }
    const statsSummary = renderStatsSummary(syncState.stats);
    if (statsSummary) {
      blocks.push(`<p class="ui-state ui-state--info">${statsSummary}</p>`);
    }
    const actionableError = classifyError(syncState);
    if (actionableError) {
      blocks.push(`<p class="ui-state ui-state--error">${actionableError}</p>`);
    }
    if (!syncState.inProgress && !syncState.lastSyncedAt && !syncState.lastError) {
      blocks.push('<p class="ui-state ui-state--empty">Ready</p>');
    }
    container.innerHTML = blocks.join("");
  }

  // js/ui/renderTokenSync.js
  function renderTokenSync(authState) {
    const container = document.querySelector("#token-sync-content");
    if (!container) return;
    const tokenSavedLabel = authState.tokenSaved ? "Saved locally" : "Not saved";
    const tokenValue = escapeHtml(authState.token ?? "");
    const tokenStatusClass = authState.tokenSaved ? "ui-state--info" : "ui-state--error";
    container.innerHTML = `
    <form id="token-form" class="ui-form token-sync-form">
      <div class="ui-form-row">
        <label class="ui-label" for="api-token-input">WaniKani API token</label>
      <input
        id="api-token-input"
        name="api-token"
        type="password"
        autocomplete="off"
        value="${tokenValue}"
        placeholder="Paste your read-only token"
       class="ui-input token-sync-form__input"
      />
      </div>
      <div class="ui-button-row">
        <button id="save-token-button" class="ui-button ui-button--primary" type="submit">Save token</button>
        <button id="sync-button" class="ui-button ui-button--secondary" type="button">Sync now / Refresh</button>
      </div>
      <p class="ui-state ${tokenStatusClass}">Token status: <strong>${tokenSavedLabel}</strong>.</p>
      <p class="ui-state ui-state--info">This token is stored only in your browser.</p>
    </form>
  `;
  }

  // js/api/pagination.js
  function getNextPageUrl(response) {
    return response?.pages?.next_url ?? null;
  }
  async function fetchAllPages(initialUrl, fetchFn) {
    const aggregatedData = [];
    const seenUrls = /* @__PURE__ */ new Set();
    const maxPages = 500;
    let currentUrl = initialUrl;
    let pageCount = 0;
    while (currentUrl) {
      if (seenUrls.has(currentUrl)) {
        throw {
          type: "pagination_loop",
          message: `Detected repeated page URL while paginating: ${currentUrl}`
        };
      }
      if (pageCount >= maxPages) {
        throw {
          type: "pagination_loop_guard",
          message: `Pagination exceeded ${maxPages} pages. Aborting to prevent an infinite loop.`
        };
      }
      seenUrls.add(currentUrl);
      const response = await fetchFn(currentUrl);
      aggregatedData.push(...response?.data ?? []);
      currentUrl = getNextPageUrl(response);
      pageCount += 1;
    }
    return aggregatedData;
  }

  // js/api/wanikaniClient.js
  var DEFAULT_API_BASE_URL = "https://api.wanikani.com/v2";
  var REQUEST_TIMEOUT_MS = 12e3;
  function normalizeApiError(status, payload, response) {
    const apiMessage = payload?.error ?? payload?.message ?? `Request failed with status ${status}`;
    if (status === 401) {
      return {
        type: "unauthorized",
        status,
        message: apiMessage
      };
    }
    if (status === 403) {
      return {
        type: "forbidden",
        status,
        message: apiMessage
      };
    }
    if (status === 429) {
      return {
        type: "rate_limited",
        status,
        message: apiMessage,
        retryAfter: response.headers.get("Retry-After")
      };
    }
    if (status >= 500) {
      return {
        type: "server_error",
        status,
        message: apiMessage
      };
    }
    return {
      type: "http_error",
      status,
      message: apiMessage
    };
  }
  async function parseResponseBody(response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    const text = await response.text();
    return text ? { message: text } : null;
  }
  function createWanikaniClient({ token, fetchFn = fetch, baseUrl = DEFAULT_API_BASE_URL } = {}) {
    async function request(url) {
      const endpointUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
      let response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      try {
        response = await fetchFn(endpointUrl, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });
      } catch (error) {
        const isTimeout = error?.name === "AbortError" || controller.signal.aborted;
        if (isTimeout) {
          throw {
            type: "timeout_error",
            message: `Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1e3)}s.`
          };
        }
        throw {
          type: "network_error",
          message: error?.message ?? "Network request failed."
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
          "/assignments?subject_types=vocabulary,kana_vocabulary"
        );
      },
      async fetchSubjects(ids = []) {
        if (!ids.length) {
          return {
            data: [],
            pages: {
              next_url: null
            }
          };
        }
        const subjectIds = ids.join(",");
        return request(`${baseUrl}/subjects?ids=${subjectIds}`);
      }
    };
  }

  // js/data/normalizers.js
  function normalizeAssignmentRecord(record) {
    return {
      subject_id: record?.data?.subject_id ?? null,
      srs_stage: record?.data?.srs_stage ?? null,
      updated_at: record?.data?.updated_at ?? null
    };
  }
  function normalizeSubjectRecord(record) {
    return {
      id: record?.id ?? null,
      characters: record?.data?.characters ?? null,
      slug: record?.data?.slug ?? null,
      level: record?.data?.level ?? null,
      meanings: record?.data?.meanings ?? [],
      context_sentences: record?.data?.context_sentences ?? [],
      subject_type: record?.object ?? null
    };
  }

  // js/utils/chunk.js
  function chunk(items, size) {
    if (!Array.isArray(items) || size <= 0) {
      return [];
    }
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  // js/data/syncService.js
  var ASSIGNMENTS_ENDPOINT = "/assignments?subject_types=vocabulary,kana_vocabulary";
  var INCLUDED_SRS_STAGES = /* @__PURE__ */ new Set([7, 8, 9]);
  var SUBJECT_CHUNK_SIZE = 100;
  var RETRY_ATTEMPTS = 3;
  var RETRYABLE_ERROR_TYPES = /* @__PURE__ */ new Set(["network_error", "timeout_error", "rate_limited", "server_error"]);
  function wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
  function getRetryDelayMs(error, attempt) {
    const retryAfterHeaderSeconds = Number(error?.retryAfter);
    if (Number.isFinite(retryAfterHeaderSeconds) && retryAfterHeaderSeconds > 0) {
      return retryAfterHeaderSeconds * 1e3;
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
          message: `Failed to fetch subjects chunk ${index + 1}/${idChunks.length} after retries.`
        };
      }
    }
    return subjects;
  }
  async function syncAssignments({ token }) {
    const client = createWanikaniClient({ token });
    setSyncStatus({
      inProgress: true,
      lastError: null,
      lastErrorType: null
    });
    try {
      const assignmentRecords = await fetchAllPages(ASSIGNMENTS_ENDPOINT, (url) => client.request(url));
      const assignments = assignmentRecords.map(normalizeAssignmentRecord).filter((assignment) => INCLUDED_SRS_STAGES.has(Number(assignment?.srs_stage)));
      const subjectIds = Array.from(
        new Set(assignments.map((assignment) => assignment.subject_id).filter((subjectId) => Number.isFinite(subjectId)))
      );
      const subjects = subjectIds.length ? await fetchSubjectsInChunks(client, subjectIds) : [];
      const lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
      const merged = mergeSentenceLibraries(assignments, subjects, lastSyncedAt);
      const snapshot = {
        assignments,
        subjects,
        subjectIds,
        lastSyncedAt
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
          sentenceItems: merged.stats.keptWithSentences
        }
      });
      return snapshot;
    } catch (error) {
      setSyncStatus({
        inProgress: false,
        lastError: error?.message ?? "Failed to sync assignments.",
        lastErrorType: error?.type ?? "unknown"
      });
      throw error;
    }
  }

  // js/ui/events.js
  function getTokenValue() {
    const tokenInput = document.querySelector("#api-token-input");
    if (!tokenInput) {
      return "";
    }
    return tokenInput.value.trim();
  }
  function setControlsDisabled(disabled) {
    const controls = [
      document.querySelector("#save-token-button"),
      document.querySelector("#sync-button"),
      document.querySelector("#text-search-input"),
      document.querySelector("#subject-type-filter"),
      document.querySelector("#api-token-input")
    ].filter(Boolean);
    controls.forEach((control) => {
      control.disabled = disabled;
    });
  }
  async function persistTokenFromInput() {
    const token = getTokenValue();
    if (!token) {
      setAuth({ token: "", tokenSaved: false });
      return;
    }
    await saveToken(token);
    setAuth({ token, tokenSaved: true });
  }
  async function onTokenSyncAttempt() {
    const token = getTokenValue();
    if (!token) {
      setSyncStatus({
        lastError: "Token missing or invalid. Enter your token and save before syncing.",
        lastErrorType: "unauthorized"
      });
      return;
    }
    setControlsDisabled(true);
    try {
      await syncAssignments({ token });
    } catch {
    } finally {
      setControlsDisabled(false);
    }
  }
  function onQueryChange(query, state2) {
    setUi({
      ...state2.ui,
      query
    });
  }
  function onSubjectTypeChange(event, state2) {
    setUi({
      ...state2.ui,
      filters: {
        ...state2.ui.filters,
        subjectType: event.target.value
      }
    });
  }
  function bindEvents(state2) {
    const tokenForm = document.querySelector("#token-form");
    const saveTokenButton = document.querySelector("#save-token-button");
    const syncButton = document.querySelector("#sync-button");
    const textSearchInput = document.querySelector("#text-search-input");
    const subjectTypeFilter = document.querySelector("#subject-type-filter");
    let queryDebounceTimer;
    if (tokenForm && !tokenForm.dataset.bound) {
      tokenForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await persistTokenFromInput();
      });
      tokenForm.dataset.bound = "true";
    }
    if (saveTokenButton && !saveTokenButton.dataset.bound) {
      saveTokenButton.addEventListener("click", async () => {
        await persistTokenFromInput();
      });
      saveTokenButton.dataset.bound = "true";
    }
    if (syncButton && !syncButton.dataset.bound) {
      syncButton.addEventListener("click", async () => {
        await onTokenSyncAttempt();
      });
      syncButton.dataset.bound = "true";
    }
    if (textSearchInput && !textSearchInput.dataset.bound) {
      textSearchInput.addEventListener("input", (event) => {
        const queryInput = event.target;
        clearTimeout(queryDebounceTimer);
        queryDebounceTimer = setTimeout(() => {
          onQueryChange(queryInput.value, state2);
        }, 250);
      });
      textSearchInput.dataset.bound = "true";
    }
    if (subjectTypeFilter && !subjectTypeFilter.dataset.bound) {
      subjectTypeFilter.addEventListener("change", (event) => {
        onSubjectTypeChange(event, state2);
      });
      subjectTypeFilter.dataset.bound = "true";
    }
    setControlsDisabled(Boolean(state2.sync?.inProgress));
    if (syncButton) {
      syncButton.textContent = state2.sync?.inProgress ? "Refreshing\u2026" : "Sync now / Refresh";
    }
  }

  // js/ui/renderApp.js
  function renderApp(state2) {
    const { auth, sync, ui, library } = state2;
    renderTokenSync(auth);
    renderStatus(sync, auth);
    renderFilters(ui);
    renderList(library, ui);
    bindEvents(state2);
  }

  // js/state.js
  var state = {
    auth: {
      token: "",
      tokenSaved: false
    },
    sync: {
      inProgress: false,
      lastSyncedAt: null,
      lastError: null,
      lastErrorType: null,
      stats: null
    },
    library: {
      items: [],
      byId: {}
    },
    ui: {
      query: "",
      filters: {},
      sorting: {
        key: "default",
        direction: "asc"
      }
    }
  };
  function createInitialState() {
    return state;
  }
  function triggerRender() {
    renderApp(state);
  }
  function setAuth(nextAuth) {
    state.auth = {
      ...state.auth,
      ...nextAuth
    };
    triggerRender();
  }
  function setSyncStatus(nextSync) {
    state.sync = {
      ...state.sync,
      ...nextSync
    };
    triggerRender();
  }
  function setLibrary(nextLibrary) {
    state.library = {
      ...state.library,
      ...nextLibrary
    };
    triggerRender();
  }
  function setUi(nextUi) {
    state.ui = {
      ...state.ui,
      ...nextUi
    };
    triggerRender();
  }

  // js/app.js
  async function bootstrap() {
    try {
      const state2 = createInitialState();
      renderApp(state2);
      const savedToken = await loadToken() ?? "";
      if (savedToken) {
        setAuth({
          token: savedToken,
          tokenSaved: true
        });
      }
      const snapshot = await loadCurrentSnapshot();
      if (snapshot) {
        const merged = mergeSentenceLibraries(
          snapshot.assignments ?? [],
          snapshot.subjects ?? [],
          snapshot.lastSyncedAt
        );
        setLibrary({ items: merged.items });
        setSyncStatus({
          lastSyncedAt: snapshot.lastSyncedAt ?? null
        });
      }
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
      setSyncStatus({
        lastError: `Startup failed while loading app state.${detail}`,
        lastErrorType: "startup_error",
        inProgress: false
      });
    }
  }
  bootstrap().catch((error) => {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
    setSyncStatus({
      lastError: `Startup failed unexpectedly.${detail}`,
      lastErrorType: "startup_error",
      inProgress: false
    });
  });
})();
