export function validateMessage(raw, maxLength) {
  if (raw == null) {
    return { ok: false, error: "message is required" };
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return { ok: false, error: "message must not be blank" };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: "message must be at most " + maxLength + " characters" };
  }
  if (/[\p{Cc}\p{Cf}\p{Cn}]/u.test(trimmed)) {
    return { ok: false, error: "message contains disallowed control characters" };
  }
  if (/<\s*\/?\s*[a-z][^>]*>|javascript\s*:/i.test(trimmed)) {
    return { ok: false, error: "message must be plain text" };
  }
  return { ok: true, value: trimmed };
}
