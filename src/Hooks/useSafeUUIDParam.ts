import { useParams } from 'react-router-dom';

// UUID v4 Pattern
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * Extracts, validates, and encodes a UUID parameter from the URL.
 *
 * Use this hook instead of `useParams` to satisfy security requirements (Snyk) for:
 * - Navigation/redirects: Prevents Open Redirect attacks.
 * - Links (href): Prevents XSS attacks in the DOM.
 * - API Requests: Prevents Injection and malformed queries.
 *
 * @param paramName - The name of the URL parameter (e.g., 'templateUUID')
 * @returns The validated UUID string, or an empty string if invalid/missing.
 */
const useSafeUUIDParam = (paramName: string): string => {
  const params = useParams();
  const value = params[paramName];

  if (!value || !UUID_PATTERN.test(value)) {
    return '';
  }

  return encodeURIComponent(value);
};

export default useSafeUUIDParam;
