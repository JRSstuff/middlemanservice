/**
 * SafeSwap Sentry Error Logging Configuration
 *
 * Requirements:
 * - Uses VITE_SENTRY_DSN environment variable
 * - Sends errors only
 * - NEVER sends sensitive data: tokens, passwords, account numbers, bank references, or image binaries
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function sanitizeErrorData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Redact sensitive keys
    if (
      /token|key|secret|password|account_number|accountNumber|proof|image|cookie|authorization/i.test(
        key
      )
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function logErrorToSentry(error: Error | unknown, errorInfo?: any) {
  if (!SENTRY_DSN) {
    // In local dev without DSN, log safely to console
    console.error('[SafeSwap Error Handler]', error);
    return;
  }

  try {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const safeData = errorInfo ? sanitizeErrorData(errorInfo) : undefined;

    // Send payload to Sentry endpoint
    const url = new URL(SENTRY_DSN);
    const projectId = url.pathname.replace(/^\//, '');
    const sentryEndpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;

    fetch(sentryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=safeswap/1.0.0, sentry_key=${url.username}`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ''),
        timestamp: new Date().toISOString(),
        platform: 'javascript',
        level: 'error',
        exception: {
          values: [
            {
              type: errorObj.name,
              value: errorObj.message,
              stacktrace: {
                frames: errorObj.stack ? [{ filename: 'app.js', function: 'error' }] : [],
              },
            },
          ],
        },
        extra: safeData,
      }),
    }).catch(() => {
      // Silently prevent logging failures from affecting user flow
    });
  } catch {
    // Failsafe
  }
}
