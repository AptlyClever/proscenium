package com.controlalt.hailoverlay

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject

/**
 * Bandit's own trigger endpoint, deliberately separate from [HailHttpServer]'s
 * `/hail/show` -- Bandit is a persistent game session, not a Hail (a brief
 * message+image+effect impression), so it does not go through
 * [HailRegistry]'s allowlist/broker-proof/duration validation at all.
 */
class BanditHttpServer(
    private val onShow: (BanditShowOptions) -> Unit,
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
                val options = parseShowOptions(body)
                onShow(options)
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

    private fun parseShowOptions(body: String): BanditShowOptions {
        if (body.isBlank()) return BanditShowOptions()
        val json = JSONObject(body)
        fun opt(key: String): String? = json.optString(key).ifBlank { null }
        return BanditShowOptions(
            wsUrlOverride = opt("ws_url"),
            audioOutput = opt("audio_output"),
            anchor = opt("anchor"),
            size = opt("size"),
            revision = opt("revision"),
            gameId = opt("game_id"),
        )
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
