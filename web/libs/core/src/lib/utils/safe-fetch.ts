type FetchParams = Parameters<typeof fetch>;

// We're catching certain types of errors that
// are not supposed to be user-facing
const IGNORED_ERRORS = new RegExp(
  [
    "abort", // Whenever the abort controller kicked in
    "failed to fetch", // Network's offline, bad URL, CORS, etc. in Chrome
    "networkerror", // Same as the above but Firefox,
  ].join("|"),
  "i",
);

/**
 * Determines if an error should be silently ignored based on predefined patterns.
 *
 * This function checks if the error message contains any of the patterns defined in
 * IGNORED_ERRORS (like "abort", "failed to fetch", "networkerror"). These are typically
 * network-related errors that don't require user notification.
 *
 * @param error - The error object to check
 * @returns true if the error should be ignored, false otherwise
 */
export function isErrorIgnored(error: unknown) {
  if (!(error instanceof Error)) return false;
  // we don't want the user to see some of the errors
  // so we fail silently
  if (error.message.match(IGNORED_ERRORS) !== null) {
    return true;
  }
}

/**
 * A wrapper around the native fetch API that handles certain network errors silently.
 *
 * This function catches and suppresses specific network-related errors that are not
 * meant to be user-facing (like aborted requests, network connectivity issues, etc.).
 * For these errors, it returns null instead of throwing an exception.
 *
 * @param params - Standard fetch parameters (URL and optional RequestInit object)
 * @returns The fetch Response object if successful, null for ignored errors, or throws for other errors
 */
export async function safeFetch(...params: FetchParams) {
  let response: Response | null = null;

  try {
    response = await fetch(...params);
    return response;
  } catch (err: unknown) {
    if (isErrorIgnored(err)) {
      console.warn("Silenced error: ", err);
      return null;
    }
    throw err;
  }
}
