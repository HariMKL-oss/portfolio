const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const handleExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', handleExternalAbort, { once: true });

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error('The request timed out. Check your connection and try again.');
    }
    if (externalSignal?.aborted) {
      throw new Error('Request cancelled.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', handleExternalAbort);
  }
}

export async function createProviderError(
  provider: string,
  response: Response
): Promise<Error> {
  let detail = '';

  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    detail =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || body.message || '';
  } catch {
    // Some provider error pages are not JSON. The HTTP status is still useful.
  }

  const suffix = detail ? `: ${detail.slice(0, 240)}` : '';
  return new Error(`${provider} request failed (${response.status})${suffix}`);
}
