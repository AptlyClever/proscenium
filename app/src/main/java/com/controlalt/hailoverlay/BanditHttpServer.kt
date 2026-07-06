package com.controlalt.hailoverlay

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject

/**
 * Bandit's own trigger endpoint, deliberately separate from [HailHttpServer]/
 * `/hail/show` -- Bandit is a persistent game session, not a Hail (a brief
 * message+image+effect impression), so it does not go through
 * [HailRegistry]'s allowlist/broker-proof/duration validation at all. Its
 * request shape is intentionally minimal: it only needs enough to launch the
 * session, not a Hail's full glyph/choreography/palette contract.
 */
class BanditHttpServer(
    private val onShow: (wsUrlOverride: String?) -> Unit,
    private val onDismiss: () -> Unit,
) : NanoHTTPD(HTTP_PORT) {

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri ?: "/"
        val method = session.method

        if (uri == "/health" && method == Method.GET) {
            return jsonResponse(
                status = Response.Status.OK,
                body = """{"status":"ok","port":$HTTP_PORT,"app":"control-alt-bandit","version":"${BuildConfig.VERSION_NAME}"}""",
            )
        }

        if (uri == "/bandit/show" && method == Method.POST) {
            return try {
                val body = readBody(session)
                val wsUrlOverride = if (body.isBlank()) {
                    null
                } else {
                    JSONObject(body).optString("ws_url").ifBlank { null }
                }
                onShow(wsUrlOverride)
                jsonResponse(status = Response.Status.OK, body = """{"status":"shown"}""")
            } catch (error: Exception) {
                Log.e(TAG, "Failed to handle bandit show request", error)
                jsonResponse(status = Response.Status.INTERNAL_ERROR, body = """{"error":"internal_error"}""")
            }
        }

        if (uri == "/bandit/dismiss" && method == Method.POST) {
            onDismiss()
            return jsonResponse(status = Response.Status.OK, body = """{"status":"dismissed"}""")
        }

        return jsonResponse(status = Response.Status.NOT_FOUND, body = """{"error":"not_found"}""")
    }

    private fun readBody(session: IHTTPSession): String {
        val files = HashMap<String, String>()
        session.parseBody(files)
        return files["postData"] ?: ""
    }

    private fun jsonResponse(status: Response.Status, body: String): Response {
        return newFixedLengthResponse(status, "application/json; charset=utf-8", body)
    }

    companion object {
        private const val TAG = "BanditHttpServer"
        const val HTTP_PORT = 8767
    }
}
