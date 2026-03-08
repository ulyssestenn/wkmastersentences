export function getNextPageUrl(response) {
  return response?.pages?.next_url ?? null;
}

export async function fetchAllPages(initialUrl, fetchFn) {
  const aggregatedData = [];
  const seenUrls = new Set();
  const maxPages = 500;

  let currentUrl = initialUrl;
  let pageCount = 0;

  while (currentUrl) {
    if (seenUrls.has(currentUrl)) {
      throw {
        type: 'pagination_loop',
        message: `Detected repeated page URL while paginating: ${currentUrl}`,
      };
    }

    if (pageCount >= maxPages) {
      throw {
        type: 'pagination_loop_guard',
        message: `Pagination exceeded ${maxPages} pages. Aborting to prevent an infinite loop.`,
      };
    }

    seenUrls.add(currentUrl);

    const response = await fetchFn(currentUrl);
    aggregatedData.push(...(response?.data ?? []));

    currentUrl = getNextPageUrl(response);
    pageCount += 1;
  }

  return aggregatedData;
}
