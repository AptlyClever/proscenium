/** Extracts a friendly message from a FastAPI error body. Most backend
 * routes raise HTTPException(detail=SomeError.detail()) where detail() is
 * `{error, message, ...extra}` (see repo_ops.py, praxis_execution_action_
 * trigger.py, etc.) -- serialized by FastAPI as `{"detail": {...}}`. Without
 * this, callers saw the raw JSON blob as the error message instead of the
 * human-readable one inside it. */
export function friendlyErrorMessage(rawText: string, fallback: string): string {
  if (!rawText) return fallback;
  try {
    const parsed = JSON.parse(rawText);
    const detail = parsed?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      if (typeof detail.message === "string") return detail.message;
      if (typeof detail.error === "string") return detail.error;
    }
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // Not JSON -- fall through to the raw text.
  }
  return rawText;
}

export async function fetchJSON<T>(input: Response | Promise<Response>): Promise<T> {
  const r = await input;
  if (!r.ok) {
    const t = await r.text();
    throw new Error(friendlyErrorMessage(t, r.statusText));
  }
  return r.json() as Promise<T>;
}
