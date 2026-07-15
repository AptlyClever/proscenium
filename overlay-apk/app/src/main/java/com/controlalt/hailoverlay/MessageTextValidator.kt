package com.controlalt.hailoverlay

object MessageTextValidator {
    /** v001 max display length for TV overlay message below glyph. */
    const val MAX_LENGTH = 120

    private val DISALLOWED_CONTROL = Regex("[\\p{Cc}\\p{Cf}\\p{Cn}]")
    private val HTML_OR_SCRIPT = Regex("(?i)<\\s*/?\\s*[a-z][^>]*>|javascript\\s*:")

    fun validate(raw: String?): Result<String> {
        if (raw == null) {
            return Result.failure(IllegalArgumentException("message is required"))
        }

        val trimmed = raw.trim()
        if (trimmed.isEmpty()) {
            return Result.failure(IllegalArgumentException("message must not be blank"))
        }

        if (trimmed.length > MAX_LENGTH) {
            return Result.failure(
                IllegalArgumentException("message must be at most $MAX_LENGTH characters"),
            )
        }

        if (DISALLOWED_CONTROL.containsMatchIn(trimmed)) {
            return Result.failure(IllegalArgumentException("message contains disallowed control characters"))
        }

        if (HTML_OR_SCRIPT.containsMatchIn(trimmed)) {
            return Result.failure(IllegalArgumentException("message must be plain text"))
        }

        return Result.success(trimmed)
    }
}
