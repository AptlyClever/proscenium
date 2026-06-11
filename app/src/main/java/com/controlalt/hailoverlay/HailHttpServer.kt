package com.controlalt.hailoverlay

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import java.nio.charset.StandardCharsets

class HailHttpServer(
    private val onShowHail: (HailAllowlist.ValidatedHail) -> Unit,
) : NanoHTTPD(HailAllowlist.HTTP_PORT) {

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri ?: "/"
        val method = session.method

        if (uri == "/health" && method == Method.GET) {
            return jsonResponse(
                status = Response.Status.OK,
                body = """{"status":"ok","port":${HailAllowlist.HTTP_PORT}}""",
            )
        }

        if (uri != "/hail/show") {
            return jsonResponse(
                status = Response.Status.NOT_FOUND,
                body = """{"error":"not_found"}""",
            )
        }

        if (method != Method.POST) {
            return jsonResponse(
                status = Response.Status.METHOD_NOT_ALLOWED,
                body = """{"error":"method_not_allowed"}""",
            )
        }

        return try {
            val body = readBody(session)
            val parsed = HailShowRequest.fromJson(body).getOrElse { error ->
                return jsonResponse(
                    status = Response.Status.BAD_REQUEST,
                    body = """{"error":"invalid_json","detail":"${error.message}"}""",
                )
            }

            val validated = parsed.validate().getOrElse { error ->
                return jsonResponse(
                    status = Response.Status.BAD_REQUEST,
                    body = """{"error":"not_allowlisted","detail":"${error.message}"}""",
                )
            }

            onShowHail(validated)
            jsonResponse(
                status = Response.Status.OK,
                body = """{"status":"shown","effect_id":"${validated.effectId}","duration_ms":${validated.durationMs}}""",
            )
        } catch (error: Exception) {
            Log.e(TAG, "Failed to handle hail request", error)
            jsonResponse(
                status = Response.Status.INTERNAL_ERROR,
                body = """{"error":"internal_error"}""",
            )
        }
    }

    private fun readBody(session: IHTTPSession): String {
        val files = HashMap<String, String>()
        session.parseBody(files)
        return files["postData"] ?: ""
    }

    private fun jsonResponse(status: Response.Status, body: String): Response {
        return newFixedLengthResponse(
            status,
            "application/json; charset=utf-8",
            body,
        )
    }

    companion object {
        private const val TAG = "HailHttpServer"
    }
}
