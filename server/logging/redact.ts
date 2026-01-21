/**
 * Redaction utility for production logging
 * Removes sensitive fields from log metadata
 */

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /api[-_]?key/i,
];

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Recursively redact sensitive fields from an object
 */
export function redactSensitive<T>(obj: T, depth = 0): T {
  // Prevent infinite recursion
  if (depth > 10) return obj;

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1)) as T;
  }

  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        redacted[key] = REDACTED;
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = redactSensitive(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }
    return redacted as T;
  }

  return obj;
}

/**
 * Check if we should redact (production mode)
 */
export function shouldRedact(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Conditionally redact based on environment
 */
export function maybeRedact<T>(obj: T): T {
  if (shouldRedact()) {
    return redactSensitive(obj);
  }
  return obj;
}
